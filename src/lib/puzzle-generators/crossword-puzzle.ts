
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { shuffle } from './utils';

// Simple crossword generation logic
// This is a naive implementation and may not produce optimal crosswords.

const MAX_ATTEMPTS = 100;
const GRID_SIZE = 15;
const WORD_COUNT = 10;

interface WordPlacement {
    word: string;
    row: number;
    col: number;
    direction: 'across' | 'down';
}

function canPlaceWord(grid: (string | null)[][], word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    if (direction === 'across') {
        if (col + word.length > GRID_SIZE) return false;
        // Check for collisions
        for (let i = 0; i < word.length; i++) {
            if (grid[row][col + i] && grid[row][col + i] !== word[i]) {
                return false;
            }
        }
    } else { // down
        if (row + word.length > GRID_SIZE) return false;
        for (let i = 0; i < word.length; i++) {
            if (grid[row + i][col] && grid[row + i][col] !== word[i]) {
                return false;
            }
        }
    }
    return true;
}

function placeWord(grid: (string | null)[][], word: string, row: number, col: number, direction: 'across' | 'down') {
    if (direction === 'across') {
        for (let i = 0; i < word.length; i++) {
            grid[row][col + i] = word[i];
        }
    } else { // down
        for (let i = 0; i < word.length; i++) {
            grid[row + i][col] = word[i];
        }
    }
}

function formatTypeClue(types: string[]): string {
    return types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ');
}

export async function createCrosswordPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: crossword ---`);
    const allPokemon = await getAllPokemonWithDetails();
    const pokemonWithSimpleNames = allPokemon.filter(p => !p.name.includes('-') && p.name.length <= 10);
    
    if (pokemonWithSimpleNames.length < WORD_COUNT) {
        console.error("Not enough Pokémon with simple names to generate a crossword.");
        return null;
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const grid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        const placements: WordPlacement[] = [];
        const words = shuffle(pokemonWithSimpleNames).slice(0, WORD_COUNT).map(p => p.name.toUpperCase());
        let success = true;

        // Place the first word
        const firstWord = words.pop()!;
        const firstDirection = Math.random() < 0.5 ? 'across' : 'down';
        const firstRow = Math.floor(Math.random() * (GRID_SIZE - (firstDirection === 'down' ? firstWord.length : 0)));
        const firstCol = Math.floor(Math.random() * (GRID_SIZE - (firstDirection === 'across' ? firstWord.length : 0)));
        
        placeWord(grid, firstWord, firstRow, firstCol, firstDirection);
        placements.push({ word: firstWord, row: firstRow, col: firstCol, direction: firstDirection });

        // Place subsequent words
        while (words.length > 0) {
            const word = words.pop()!;
            let placed = false;
            for (let i = 0; i < word.length; i++) {
                for (const p of placements) {
                    const direction = p.direction === 'across' ? 'down' : 'across';
                    let row, col;

                    if (p.direction === 'across') {
                        row = p.row - i;
                        col = p.col + p.word.indexOf(word[i]);
                    } else {
                        row = p.row + p.word.indexOf(word[i]);
                        col = p.col - i;
                    }

                    if (row < 0 || col < 0) continue;

                    if (canPlaceWord(grid, word, row, col, direction)) {
                        placeWord(grid, word, row, col, direction);
                        placements.push({ word, row, col, direction });
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (!placed) {
                success = false;
                break;
            }
        }
        
        if (success) {
            const cluesAcross: any[] = [];
            const cluesDown: any[] = [];
            let clueNumber = 1;

            const sortedPlacements = placements.sort((a,b) => a.row - b.row || a.col - b.col);
            const placementNumbers: Record<string, number> = {};

            for (const p of sortedPlacements) {
                const key = `${p.row},${p.col}`;
                if (!placementNumbers[key]) {
                    placementNumbers[key] = clueNumber++;
                }
                const number = placementNumbers[key];
                const pokemon = allPokemon.find(poke => poke.name.toUpperCase() === p.word)!;
                const clue = {
                    number,
                    direction: p.direction,
                    row: p.row,
                    col: p.col,
                    length: p.word.length,
                    clue: formatTypeClue(pokemon.types),
                    answer: pokemon.name,
                };
                if (p.direction === 'across') {
                    cluesAcross.push(clue);
                } else {
                    cluesDown.push(clue);
                }
            }
            
            // Add numbers to grid
            for(const [key, num] of Object.entries(placementNumbers)) {
                const [row, col] = key.split(',').map(Number);
                // This is a bit of a hack to store the number. The grid will store letters.
                // We'll handle rendering the number on the client.
                if (grid[row][col]) {
                  // A cell can have a letter and a number
                }
            }

            console.log(`[crossword] Successfully generated puzzle after ${attempt + 1} attempts.`);
            
            return {
                grid: [],
                rowAnswers: [],
                colAnswers: [],
                mode: 'crossword',
                crosswordGrid: grid,
                crosswordClues: {
                    across: cluesAcross.sort((a,b) => a.number - b.number),
                    down: cluesDown.sort((a,b) => a.number - b.number),
                }
            };
        }
    }


    console.error(`[crossword] Failed to generate a crossword puzzle after ${MAX_ATTEMPTS} attempts.`);
    return null;
}
