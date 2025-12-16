
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { getPokemonCriteria } from '@/lib/criteria';
import { shuffle } from './utils';
import { createStandardPuzzle } from './standard-puzzle';

export async function createImposterPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: imposter ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }
    
    const gridSize = 3;

    for (let attempt = 0; attempt < 5000; attempt++) {
        const basePuzzle = await createStandardPuzzle('imposter');
        if (!basePuzzle) continue;
    
            const { grid, rowAnswers, colAnswers } = basePuzzle;
            const usedPokemonIds = new Set(grid.flat().filter((p): p is Pokemon => p !== null).map(p => p.id));
            
            const imposterRow = Math.floor(Math.random() * gridSize);        const imposterCol = Math.floor(Math.random() * gridSize);
        const imposterCoord = { row: imposterRow, col: imposterCol };
        
        const originalPokemon = grid[imposterRow][imposterCol];
        if (originalPokemon) {
            usedPokemonIds.delete(originalPokemon.id);
        }
    
        const rowCriterion = rowAnswers[imposterRow];
        const colCriterion = colAnswers[imposterCol];
    
        const imposterCandidates = shuffle(allPokemon).filter(p => {
            if (usedPokemonIds.has(p.id)) return false;
            const pCriteria = getPokemonCriteria(p);
            return !pCriteria.has(rowCriterion) && !pCriteria.has(colCriterion);
        });
    
        if (imposterCandidates.length > 0) {
            grid[imposterRow][imposterCol] = imposterCandidates[0];
            console.log(`[imposter] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid,
                rowAnswers,
                colAnswers,
                mode: 'imposter',
                oddOneOutCoords: [imposterCoord],
            };
        }
    }
    
    console.error(`[imposter] Failed to generate a puzzle after multiple attempts.`);
    return null;
}
