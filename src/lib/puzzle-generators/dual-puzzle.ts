
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';
import { shuffle, buildCriteriaMap, MAX_PUZZLE_ATTEMPTS } from './utils';

export async function createDualPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dual ---`);
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const gridSize = 3;
    const normalCriteriaPool = NORMAL_CRITERIA.filter(c => !HARD_CRITERIA.includes(c));
    const hardCriteriaPool = HARD_CRITERIA;
    
    const criteriaMap = buildCriteriaMap(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 2000 === 0) {
            console.log(`[dual] Generation attempt: ${attempt}...`);
        }
        
        const rowAnswersNormal = shuffle([...normalCriteriaPool]).slice(0, gridSize);
        const colAnswersNormal = shuffle([...normalCriteriaPool]).slice(gridSize, gridSize * 2);
        const rowAnswersHard = shuffle([...hardCriteriaPool]).slice(0, gridSize);
        const colAnswersHard = shuffle([...hardCriteriaPool]).slice(gridSize, gridSize * 2);

        const allAnswers = new Set([
            ...rowAnswersNormal, ...colAnswersNormal, 
            ...rowAnswersHard, ...colAnswersHard
        ]);
        if (allAnswers.size !== gridSize * 4) {
            continue; // Ensure all 12 criteria are unique
        }

        const grid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const criteria = [
                    rowAnswersNormal[r], colAnswersNormal[c],
                    rowAnswersHard[r], colAnswersHard[c]
                ];

                const candidateSets = criteria.map(crit => criteriaMap.get(crit) || []);
                if (candidateSets.some(set => set.length === 0)) {
                    success = false;
                    break;
                }

                // Find intersection of all four sets
                const intersection = candidateSets.reduce((acc, currSet) => {
                    const currIds = new Set(currSet.map(p => p.id));
                    return acc.filter(p => currIds.has(p.id));
                });
                
                const finalCandidates = intersection.filter(p => !usedPokemonIds.has(p.id));

                if (finalCandidates.length > 0) {
                    const chosenPokemon = shuffle(finalCandidates)[0];
                    grid[r][c] = chosenPokemon;
                    usedPokemonIds.add(chosenPokemon.id);
                } else {
                    success = false;
                    break;
                }
            }
            if (!success) break;
        }

        if (success) {
            console.log(`[dual] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid: grid as Pokemon[][],
                rowAnswers: rowAnswersNormal,
                colAnswers: colAnswersNormal,
                rowAnswersHard: rowAnswersHard,
                colAnswersHard: colAnswersHard,
                mode: 'dual'
            };
        }
    }

    console.error(`[dual] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}
