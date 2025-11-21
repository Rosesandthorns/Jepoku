import 'server-only';
import { getAllPokemonWithDetails } from './pokedex';
import type { Puzzle, Pokemon } from './definitions';
import { ALL_CRITERIA } from './criteria';

const MAX_PUZZLE_ATTEMPTS = 500;
const GRID_SIZE = 3;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function getPokemonCriteria(pokemon: Pokemon): string[] {
    const criteria = new Set<string>(pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    if (pokemon.isMega) criteria.add('Mega');
    if (pokemon.region === 'Kanto') criteria.add('Kanto');
    if (pokemon.region === 'Johto') criteria.add('Johto');
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.canEvolve) criteria.add('Can Evolve');
    if (pokemon.isFinalEvolution) criteria.add('Final Evolution');
    if (pokemon.isPartner) criteria.add('Partner Pokemon');
    return Array.from(criteria);
}

function findCommonCriteria(pokemonGroup: (Pokemon | null)[]): string[] {
    if (pokemonGroup.some(p => p === null)) return [];
    const validPokemon = pokemonGroup as Pokemon[];
    if (validPokemon.length < GRID_SIZE) return [];

    const criteriaSets = validPokemon.map(p => new Set(getPokemonCriteria(p)));
    
    const intersection = new Set(criteriaSets[0]);
    for (let i = 1; i < criteriaSets.length; i++) {
        const currentSet = criteriaSets[i];
        for (const crit of intersection) {
            if (!currentSet.has(crit)) {
                intersection.delete(crit);
            }
        }
    }

    return Array.from(intersection);
}

async function createValidGrid() {
    const allPokemon = await getAllPokemonWithDetails();
    const shuffledPokemon = shuffle(allPokemon);
    const usedPokemonIds = new Set<number>();
    const grid: (Pokemon | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    // Try to build a valid grid
    for (const p00 of shuffledPokemon) {
        usedPokemonIds.clear();
        grid.forEach(row => row.fill(null));
        
        grid[0][0] = p00;
        usedPokemonIds.add(p00.id);

        const p00Criteria = shuffle(getPokemonCriteria(p00));
        const row0Criterion = p00Criteria[0];
        const col0Criterion = p00Criteria[1];

        if (!row0Criterion || !col0Criterion || row0Criterion === col0Criterion) continue;

        // Fill first row
        const row0Candidates = shuffle(allPokemon.filter(p => 
            !usedPokemonIds.has(p.id) && getPokemonCriteria(p).includes(row0Criterion)
        ));
        if (row0Candidates.length < GRID_SIZE - 1) continue;
        grid[0][1] = row0Candidates[0];
        usedPokemonIds.add(row0Candidates[0].id);
        grid[0][2] = row0Candidates[1];
        usedPokemonIds.add(row0Candidates[1].id);

        // Fill first column
        const col0Candidates = shuffle(allPokemon.filter(p =>
            !usedPokemonIds.has(p.id) && getPokemonCriteria(p).includes(col0Criterion)
        ));
        if (col0Candidates.length < GRID_SIZE - 1) continue;
        grid[1][0] = col0Candidates[0];
        usedPokemonIds.add(col0Candidates[0].id);
        grid[2][0] = col0Candidates[1];
        usedPokemonIds.add(col0Candidates[1].id);
        
        // At this point, we have criteria for all rows/cols, let's derive them
        const p01Criteria = findCommonCriteria([grid[0][1]]);
        const p02Criteria = findCommonCriteria([grid[0][2]]);
        const p10Criteria = findCommonCriteria([grid[1][0]]);
        const p20Criteria = findCommonCriteria([grid[2][0]]);

        const col1Criterion = shuffle(p01Criteria).find(c => c !== row0Criterion);
        const col2Criterion = shuffle(p02Criteria).find(c => c !== row0Criterion);
        const row1Criterion = shuffle(p10Criteria).find(c => c !== col0Criterion);
        const row2Criterion = shuffle(p20Criteria).find(c => c !== col0Criterion);

        if (!col1Criterion || !col2Criterion || !row1Criterion || !row2Criterion) continue;

        const rowAnswers = [row0Criterion, row1Criterion, row2Criterion];
        const colAnswers = [col0Criterion, col1Criterion, col2Criterion];

        // Fill the rest of the grid
        let possible = true;
        for (let r = 1; r < GRID_SIZE; r++) {
            for (let c = 1; c < GRID_SIZE; c++) {
                const candidate = allPokemon.find(p =>
                    !usedPokemonIds.has(p.id) &&
                    getPokemonCriteria(p).includes(rowAnswers[r]) &&
                    getPokemonCriteria(p).includes(colAnswers[c])
                );
                if (!candidate) {
                    possible = false;
                    break;
                }
                grid[r][c] = candidate;
                usedPokemonIds.add(candidate.id);
            }
            if (!possible) break;
        }

        if (possible) {
            // Final check: derive answers from the completed grid
            const finalRowAnswers = grid.map(row => findCommonCriteria(row));
            const finalColAnswers: string[][] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                finalColAnswers.push(findCommonCriteria(grid.map(row => row[c])));
            }

            if (finalRowAnswers.some(a => a.length === 0) || finalColAnswers.some(a => a.length === 0)) continue;

            const chosenRowAnswers = finalRowAnswers.map(a => shuffle(a)[0]);
            const chosenColAnswers = finalColAnswers.map(a => shuffle(a)[0]);
            
            const allAnswers = [...chosenRowAnswers, ...chosenColAnswers];
            if (new Set(allAnswers).size === GRID_SIZE * 2) {
                 return {
                    grid: grid as Pokemon[][],
                    rowAnswers: chosenRowAnswers,
                    colAnswers: chosenColAnswers,
                };
            }
        }
    }

    return null; // Should be rare
}

export async function generatePuzzle(): Promise<Puzzle | null> {
    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const puzzle = await createValidGrid();
        if (puzzle) {
            return puzzle;
        }
    }

    console.error("Failed to generate a puzzle after multiple retries.");
    return null;
}
