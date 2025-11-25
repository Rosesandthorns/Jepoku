
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { getPokemonCriteria, NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';
import { shuffle, MAX_PUZZLE_ATTEMPTS, buildCriteriaMap } from './utils';

export async function createDualPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dual ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const criteriaMap = buildCriteriaMap(allPokemon);
    const gridSize = 3;
    const normalCriteriaPool = NORMAL_CRITERIA.filter(c => !HARD_CRITERIA.includes(c));
    const hardCriteriaPool = HARD_CRITERIA;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS / 100; attempt++) {
        // 1. Pick row criteria first
        const shuffledNormal = shuffle([...normalCriteriaPool]);
        const shuffledHard = shuffle([...hardCriteriaPool]);

        const rowAnswersNormal = shuffledNormal.slice(0, gridSize);
        const rowAnswersHard = shuffledHard.slice(0, gridSize);
        
        if (new Set([...rowAnswersNormal, ...rowAnswersHard]).size !== gridSize * 2) {
            continue; // Ensure row criteria are unique among themselves
        }

        const grid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        const usedPokemonIds = new Set<number>();
        let gridBuilt = true;

        // 2. Build grid row by row
        for (let r = 0; r < gridSize; r++) {
            const normalCrit = rowAnswersNormal[r];
            const hardCrit = rowAnswersHard[r];

            const normalCandidates = new Set(criteriaMap.get(normalCrit) || []);
            const hardCandidates = criteriaMap.get(hardCrit) || [];
            
            const validPokemon = [...hardCandidates].filter(p => normalCandidates.has(p) && !usedPokemonIds.has(p.id));

            if (validPokemon.length < gridSize) {
                gridBuilt = false;
                break;
            }

            const selectedPokemon = shuffle(validPokemon).slice(0, gridSize);
            for (let c = 0; c < gridSize; c++) {
                const poke = selectedPokemon[c];
                grid[r][c] = poke;
                usedPokemonIds.add(poke.id);
            }
        }

        if (!gridBuilt) {
            continue;
        }

        // 3. Derive column criteria
        const colAnswersNormal: string[] = [];
        const colAnswersHard: string[] = [];
        let derivationSuccess = true;

        for (let c = 0; c < gridSize; c++) {
            const colPokemon = grid.map(row => row[c]!);
            const commonCriteria = colPokemon
                .map(getPokemonCriteria)
                .reduce((a, b) => new Set([...a].filter(x => b.has(x))));
            
            const validNormal = shuffle([...commonCriteria].filter(c => normalCriteriaPool.includes(c) && !rowAnswersNormal.includes(c) && !rowAnswersHard.includes(c) && !colAnswersNormal.includes(c)));
            const validHard = shuffle([...commonCriteria].filter(c => hardCriteriaPool.includes(c) && !rowAnswersNormal.includes(c) && !rowAnswersHard.includes(c) && !colAnswersHard.includes(c)));

            if (validNormal.length > 0 && validHard.length > 0) {
                colAnswersNormal.push(validNormal[0]);
                colAnswersHard.push(validHard[0]);
            } else {
                derivationSuccess = false;
                break;
            }
        }

        if (!derivationSuccess) {
            continue;
        }

        // 4. Final validation
        const allFoundCriteria = new Set([
            ...rowAnswersNormal, ...rowAnswersHard,
            ...colAnswersNormal, ...colAnswersHard
        ]);

        if (allFoundCriteria.size === gridSize * 4) {
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

    console.error(`[dual] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS / 100} attempts.`);
    return null;
}
