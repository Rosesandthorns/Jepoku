
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';
import { shuffle, buildCriteriaMap, MAX_PUZZLE_ATTEMPTS } from './utils';

export async function createDualPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dual ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const normalCriteriaPool = NORMAL_CRITERIA.filter(c => !HARD_CRITERIA.includes(c));
    const hardCriteriaPool = HARD_CRITERIA;

    const criteriaMap = buildCriteriaMap(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[dual] Generation attempt: ${attempt}...`);
        }

        const shuffledHard = shuffle([...hardCriteriaPool]);
        const shuffledNormal = shuffle([...normalCriteriaPool]);
        
        if (shuffledHard.length < 6 || shuffledNormal.length < 6) {
             console.error("[dual] Not enough unique criteria available.");
             return null;
        }

        const rowAnswersHard = shuffledHard.slice(0, 3);
        const colAnswersHard = shuffledHard.slice(3, 6);
        const rowAnswers = shuffledNormal.slice(0, 3);
        const colAnswers = shuffledNormal.slice(3, 6);

        const grid: (Pokemon | null)[][] = Array(3).fill(null).map(() => Array(3).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const rowNormalSet = new Set(criteriaMap.get(rowAnswers[r])?.map(p => p.id));
                const rowHardSet = new Set(criteriaMap.get(rowAnswersHard[r])?.map(p => p.id));
                const colNormalSet = new Set(criteriaMap.get(colAnswers[c])?.map(p => p.id));
                const colHardList = criteriaMap.get(colAnswersHard[c]);

                if (!colHardList || !rowNormalSet.size || !rowHardSet.size || !colNormalSet.size) {
                    success = false;
                    break;
                }

                const candidates = shuffle(colHardList.filter(p => 
                    rowNormalSet.has(p.id) &&
                    rowHardSet.has(p.id) &&
                    colNormalSet.has(p.id) &&
                    !usedPokemonIds.has(p.id)
                ));

                if (candidates.length > 0) {
                    const chosen = candidates[0];
                    grid[r][c] = chosen;
                    usedPokemonIds.add(chosen.id);
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
                rowAnswers,
                colAnswers,
                rowAnswersHard,
                colAnswersHard,
                mode: 'dual'
            };
        }
    }

    console.error(`[dual] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}
