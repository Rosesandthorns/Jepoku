
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { getPokemonCriteria } from '@/lib/criteria';
import { shuffle, MAX_PUZZLE_ATTEMPTS, REGIONS, IMPOSSIBLE_TYPE_PAIRS } from './utils';
import { createStandardPuzzle } from './standard-puzzle';

export async function createOddOneOutPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: odd-one-out ---`);
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }
    
    const gridSize = 5;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[odd-one-out] Generation attempt: ${attempt}...`);
        }
        
        const basePuzzle = await createStandardPuzzle('blinded');
        if (!basePuzzle) continue;
        
    const { grid, rowAnswers, colAnswers } = basePuzzle;
    const usedPokemonIds = new Set(grid.flat().filter((p): p is Pokemon => p !== null).map(p => p.id));
    
    const imposterCoords: {row: number, col: number}[] = [];
    const rowIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        const colIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        for(let i = 0; i < gridSize; i++) {
            imposterCoords.push({row: rowIndices[i], col: colIndices[i]});
        }
        
        let impostersPlaced = true;
        for (const coord of imposterCoords) {
            const rowCriterion = rowAnswers[coord.row];
            const colCriterion = colAnswers[coord.col];
            const originalPokemonId = (grid[coord.row][coord.col] as Pokemon).id;
            usedPokemonIds.delete(originalPokemonId);

            const imposterCandidates = shuffle(allPokemon.filter(p => {
                if (usedPokemonIds.has(p.id)) return false;
                const pCriteria = getPokemonCriteria(p);
                return !pCriteria.has(rowCriterion) && !pCriteria.has(colCriterion);
            }));

            if (imposterCandidates.length > 0) {
                const chosenImposter = imposterCandidates[0];
                grid[coord.row][coord.col] = chosenImposter;
                usedPokemonIds.add(chosenImposter.id);
            } else {
                impostersPlaced = false;
                break;
            }
        }
        
        if (impostersPlaced) {
            console.log(`[odd-one-out] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
                mode: 'odd-one-out',
                oddOneOutCoords: imposterCoords,
            };
        }
    }
    
    console.error(`[odd-one-out] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}
