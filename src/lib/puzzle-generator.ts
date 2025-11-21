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
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const shuffledCriteria = shuffle([...ALL_CRITERIA]);
        if (shuffledCriteria.length < GRID_SIZE * 2) return null;

        const rowAnswers = shuffledCriteria.slice(0, GRID_SIZE);
        const colAnswers = shuffledCriteria.slice(GRID_SIZE, GRID_SIZE * 2);

        // Ensure all 6 criteria are unique
        const allAnswers = new Set([...rowAnswers, ...colAnswers]);
        if (allAnswers.size !== GRID_SIZE * 2) {
            continue; // Try next attempt if criteria are not unique
        }

        const grid: (Pokemon | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const rowCriterion = rowAnswers[r];
                const colCriterion = colAnswers[c];

                // Find all valid candidates for the current cell
                const candidates = allPokemon.filter(p => {
                    if (usedPokemonIds.has(p.id)) return false;
                    const pCriteria = getPokemonCriteria(p);
                    return pCriteria.has(rowCriterion) && pCriteria.has(colCriterion);
                });

                if (candidates.length > 0) {
                    // Shuffle the valid candidates and pick the first one
                    const shuffledCandidates = shuffle(candidates);
                    const chosenPokemon = shuffledCandidates[0];
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
            return {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
            };
        }
    }

    console.error("Failed to generate a puzzle after multiple retries.");
    return null; // Failed to generate a puzzle
}


export async function generatePuzzle(): Promise<Puzzle | null> {
    return createValidPuzzle();
}
