
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { getPokemonCriteria, NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';
import { shuffle, MAX_PUZZLE_ATTEMPTS, buildCriteriaMap } from './utils';

function getSharedCriteria(pokemonGroup: Pokemon[]) {
    if (pokemonGroup.length === 0) return new Set<string>();
    return pokemonGroup
        .map(getPokemonCriteria)
        .reduce((a, b) => new Set([...a].filter(x => b.has(x))));
}

export async function createDualPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: dual ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const normalCriteriaPool = NORMAL_CRITERIA.filter(c => !HARD_CRITERIA.includes(c));
    const hardCriteriaPool = HARD_CRITERIA;

    const validPokemonPool = shuffle(allPokemon.filter(p => {
        const criteria = getPokemonCriteria(p);
        const hasNormal = normalCriteriaPool.some(c => criteria.has(c));
        const hasHard = hardCriteriaPool.some(c => criteria.has(c));
        return hasNormal && hasHard;
    }));

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS / 50; attempt++) {
        const gridPokemon = validPokemonPool.slice(attempt * 9, (attempt + 1) * 9);
        if (gridPokemon.length < 9) break;

        const grid: Pokemon[][] = [
            gridPokemon.slice(0, 3),
            gridPokemon.slice(3, 6),
            gridPokemon.slice(6, 9)
        ];

        const rowSharedCriteria = grid.map(row => getSharedCriteria(row));
        const colSharedCriteria = [0, 1, 2].map(c => getSharedCriteria(grid.map(row => row[c])));

        const rowNormalOptions = rowSharedCriteria.map(shared => shuffle([...shared].filter(c => normalCriteriaPool.includes(c))));
        const rowHardOptions = rowSharedCriteria.map(shared => shuffle([...shared].filter(c => hardCriteriaPool.includes(c))));
        const colNormalOptions = colSharedCriteria.map(shared => shuffle([...shared].filter(c => normalCriteriaPool.includes(c))));
        const colHardOptions = colSharedCriteria.map(shared => shuffle([...shared].filter(c => hardCriteriaPool.includes(c))));

        if (rowNormalOptions.some(o => o.length === 0) || rowHardOptions.some(o => o.length === 0) ||
            colNormal-options.some(o => o.length === 0) || colHardOptions.some(o => o.length === 0)) {
            continue;
        }

        // Backtracking function to find a valid set of criteria
        function findSolution(usedCriteria: Set<string>, depth: number): {rowsN: string[], rowsH: string[], colsN: string[], colsH: string[]} | null {
            if (depth === 12) {
                return { rowsN: [], rowsH: [], colsN: [], colsH: [] };
            }

            const type = depth % 4; // 0: rowN, 1: rowH, 2: colN, 3: colH
            const index = Math.floor(depth / 4);

            let options: string[] = [];
            if (type === 0) options = rowNormalOptions[index];
            else if (type === 1) options = rowHardOptions[index];
            else if (type === 2) options = colNormalOptions[index];
            else options = colHardOptions[index];

            for (const criterion of options) {
                if (!usedCriteria.has(criterion)) {
                    usedCriteria.add(criterion);
                    const result = findSolution(usedCriteria, depth + 1);
                    if (result) {
                        if (type === 0) result.rowsN[index] = criterion;
                        else if (type === 1) result.rowsH[index] = criterion;
                        else if (type === 2) result.colsN[index] = criterion;
                        else result.colsH[index] = criterion;
                        return result;
                    }
                    usedCriteria.delete(criterion);
                }
            }
            return null;
        }

        const solution = findSolution(new Set(), 0);

        if (solution) {
            console.log(`[dual] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid: grid,
                rowAnswers: solution.rowsN,
                colAnswers: solution.colsN,
                rowAnswersHard: solution.rowsH,
                colAnswersHard: solution.colsH,
                mode: 'dual'
            };
        }
    }

    console.error(`[dual] Failed to generate a puzzle after exhausting options.`);
    return null;
}
