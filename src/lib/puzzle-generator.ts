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

function getPokemonCriteria(pokemon: Pokemon): Set<string> {
    const criteria = new Set<string>(pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    if (pokemon.isMega) criteria.add('Mega');
    if (pokemon.region === 'Kanto') criteria.add('Kanto');
    if (pokemon.region === 'Johto') criteria.add('Johto');
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.canEvolve) criteria.add('Can Evolve');
    if (pokemon.isFinalEvolution) criteria.add('Final Evolution');
    if (pokemon.isPartner) criteria.add('Partner Pokemon');
    return criteria;
}

async function createValidPuzzle(): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
    const shuffledPokemon = shuffle(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const shuffledCriteria = shuffle([...ALL_CRITERIA]);
        if (shuffledCriteria.length < GRID_SIZE * 2) return null; // Not enough criteria to choose from

        const rowAnswers = shuffledCriteria.slice(0, GRID_SIZE);
        const colAnswers = shuffledCriteria.slice(GRID_SIZE, GRID_SIZE * 2);

        const grid: (Pokemon | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const rowCriterion = rowAnswers[r];
                const colCriterion = colAnswers[c];

                const candidate = shuffledPokemon.find(p => {
                    if (usedPokemonIds.has(p.id)) return false;
                    const pCriteria = getPokemonCriteria(p);
                    return pCriteria.has(rowCriterion) && pCriteria.has(colCriterion);
                });

                if (candidate) {
                    grid[r][c] = candidate;
                    usedPokemonIds.add(candidate.id);
                } else {
                    success = false;
                    break;
                }
            }
            if (!success) break;
        }

        if (success) {
            return {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
            };
        }
    }

    return null; // Failed to generate a puzzle
}


export async function generatePuzzle(): Promise<Puzzle | null> {
    const puzzle = await createValidPuzzle();

    if (puzzle) {
        return puzzle;
    }
    
    // Fallback if the strict generator fails, which should be rare.
    // This part of the code should ideally not be reached.
    console.error("Failed to generate a puzzle after multiple retries.");
    return null;
}
