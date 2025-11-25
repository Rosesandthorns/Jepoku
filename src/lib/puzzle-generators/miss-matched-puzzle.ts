
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { shuffle } from './utils';
import { createStandardPuzzle } from './standard-puzzle';

export async function createMissMatchedPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: miss-matched ---`);
    const gridSize = 3;

    let solvedPuzzle: Puzzle | null = null;
    for (let i = 0; i < 100; i++) {
      const puzzle = await createStandardPuzzle('normal');
      if (puzzle && puzzle.grid.length === gridSize) {
        solvedPuzzle = puzzle;
        break;
      }
    }
    
    if (!solvedPuzzle) {
        console.error("Failed to generate a base puzzle for Miss Matched mode.");
        return null;
    }
    const solutionGrid = solvedPuzzle.grid as Pokemon[][];

    const revealedAxis = Math.random() < 0.5 ? 'row' : 'col';
    const revealedIndex = Math.floor(Math.random() * gridSize);
    const revealedValue = revealedAxis === 'row' ? solvedPuzzle.rowAnswers[revealedIndex] : solvedPuzzle.colAnswers[revealedIndex];

    const pokemonToShuffle: (Pokemon | null)[] = solutionGrid.flat();
    const emptySlotIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    pokemonToShuffle.splice(emptySlotIndex, 1);
    const shuffledPokemon = shuffle(pokemonToShuffle);
    
    const shuffledGrid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let currentPokeIndex = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (r * gridSize + c !== emptySlotIndex) {
                shuffledGrid[r][c] = shuffledPokemon[currentPokeIndex++];
            }
        }
    }
    
    console.log("[miss-matched] Successfully generated puzzle.");

    return {
        ...solvedPuzzle,
        grid: shuffledGrid,
        mode: 'miss-matched',
        shuffledGrid: shuffledGrid,
        solutionGrid: solutionGrid,
        revealedCriterion: {
            axis: revealedAxis,
            index: revealedIndex,
            value: revealedValue,
        },
    };
}
