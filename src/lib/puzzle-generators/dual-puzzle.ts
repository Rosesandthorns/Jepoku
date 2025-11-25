
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { getPokemonCriteria, NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';
import { shuffle, MAX_PUZZLE_ATTEMPTS } from './utils';

export async function createDualPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dual ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const gridSize = 3;
    const normalCriteriaPool = NORMAL_CRITERIA.filter(c => !HARD_CRITERIA.includes(c));
    const hardCriteriaPool = HARD_CRITERIA;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS / 10; attempt++) {
        if (attempt > 0 && attempt % 100 === 0) {
             console.log(`[dual] Generation attempt: ${attempt}...`);
        }

        const shuffledPokemon = shuffle(allPokemon);
        const selectedPokemon = shuffledPokemon.slice(0, gridSize * gridSize);
        
        if (selectedPokemon.length < gridSize * gridSize) {
            continue; // Not enough Pokemon
        }

        const grid: Pokemon[][] = [];
        for (let i = 0; i < gridSize; i++) {
            grid.push(selectedPokemon.slice(i * gridSize, (i + 1) * gridSize));
        }

        const rowAnswersNormal: string[] = [];
        const rowAnswersHard: string[] = [];
        const colAnswersNormal: string[] = [];
        const colAnswersHard: string[] = [];

        let success = true;

        // Find row criteria
        for (let r = 0; r < gridSize; r++) {
            const rowPokemon = grid[r];
            const commonCriteria = rowPokemon.map(getPokemonCriteria).reduce((a, b) => new Set([...a].filter(x => b.has(x))));
            
            const validNormal = shuffle([...commonCriteria].filter(c => normalCriteriaPool.includes(c)));
            const validHard = shuffle([...commonCriteria].filter(c => hardCriteriaPool.includes(c)));

            if (validNormal.length > 0 && validHard.length > 0) {
                rowAnswersNormal.push(validNormal[0]);
                rowAnswersHard.push(validHard[0]);
            } else {
                success = false;
                break;
            }
        }
        if (!success) continue;

        // Find column criteria
        for (let c = 0; c < gridSize; c++) {
            const colPokemon = grid.map(row => row[c]);
            const commonCriteria = colPokemon.map(getPokemonCriteria).reduce((a, b) => new Set([...a].filter(x => b.has(x))));

            const validNormal = shuffle([...commonCriteria].filter(c => normalCriteriaPool.includes(c)));
            const validHard = shuffle([...commonCriteria].filter(c => hardCriteriaPool.includes(c)));

            if (validNormal.length > 0 && validHard.length > 0) {
                colAnswersNormal.push(validNormal[0]);
                colAnswersHard.push(validHard[0]);
            } else {
                success = false;
                break;
            }
        }
        if (!success) continue;

        // Check for uniqueness of all 12 criteria
        const allFoundCriteria = new Set([
            ...rowAnswersNormal, ...rowAnswersHard,
            ...colAnswersNormal, ...colAnswersHard
        ]);

        if (allFoundCriteria.size === gridSize * 4) {
            console.log(`[dual] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid,
                rowAnswers: rowAnswersNormal,
                colAnswers: colAnswersNormal,
                rowAnswersHard: rowAnswersHard,
                colAnswersHard: colAnswersHard,
                mode: 'dual'
            };
        }
    }

    console.error(`[dual] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS / 10} attempts.`);
    return null;
}
