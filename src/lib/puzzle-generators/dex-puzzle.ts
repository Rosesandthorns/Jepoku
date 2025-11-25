
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails, getPokemonTypes } from '@/lib/pokedex';
import { shuffle, buildCriteriaMap, MAX_PUZZLE_ATTEMPTS } from './utils';

export async function createDexPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dex ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const criteriaPool = (await getPokemonTypes()).map(t => t.charAt(0).toUpperCase() + t.slice(1));
    const criteriaMap = buildCriteriaMap(allPokemon);
    const gridSize = 3;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[dex] Generation attempt: ${attempt}...`);
        }
        
        const availableCriteria = shuffle([...criteriaPool]);
        const rowAnswers = availableCriteria.slice(0, gridSize);
        const colAnswers = availableCriteria.slice(gridSize, gridSize * 2);

        const allAnswers = new Set([...rowAnswers, ...colAnswers]);
        if (allAnswers.size !== gridSize * 2) {
            continue;
        }

        const grid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const rowCriterion = rowAnswers[r];
                const colCriterion = colAnswers[c];

                const rowCandidates = new Set(criteriaMap.get(rowCriterion) || []);
                const colCandidates = criteriaMap.get(colCriterion) || [];

                const candidates = colCandidates.filter(p => rowCandidates.has(p) && !usedPokemonIds.has(p.id));

                if (candidates.length > 0) {
                    const chosenPokemon = shuffle(candidates)[0];
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
            console.log(`[dex] Successfully generated puzzle after ${attempt + 1} attempts.`);
            
            const dexDisplay: ('number' | 'entry')[][] = grid.map(row =>
                row.map(() => (Math.random() > 0.5 ? 'number' : 'entry'))
            );

            return {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
                mode: 'dex',
                dexDisplay,
            };
        }
    }

    console.error(`[dex] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}
