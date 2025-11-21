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
    if (pokemon.isLegendary) criteria.add('Legendary');
    if (pokemon.isMythical) criteria.add('Mythical');
    if (pokemon.region) criteria.add(pokemon.region);

    // Abilities
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.abilities.includes('swift-swim')) criteria.add('Has: Swift Swim');
    if (pokemon.abilities.includes('cursed-body')) criteria.add('Has: Cursed Body');
    if (pokemon.abilities.includes('mold-breaker')) criteria.add('Has: Mold Breaker');
    
    // Moves
    if (pokemon.moves.includes('brick-break')) criteria.add('Knows: Brick Break');
    if (pokemon.moves.includes('grass-knot')) criteria.add('Knows: Grass Knot');
    if (pokemon.moves.includes('iron-tail')) criteria.add('Knows: Iron Tail');
    if (pokemon.moves.includes('cut')) criteria.add('Knows: Cut');
    if (pokemon.moves.includes('flamethrower')) criteria.add('Knows: Flame Thrower');
    if (pokemon.moves.includes('leer')) criteria.add('Knows: Leer');
    if (pokemon.moves.includes('mud-slap')) criteria.add('Knows: Mud Slap');

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

    const shuffledPokemon = shuffle(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const shuffledCriteria = shuffle([...ALL_CRITERIA]);
        if (shuffledCriteria.length < GRID_SIZE * 2) return null;

        const rowAnswers = shuffledCriteria.slice(0, GRID_SIZE);
        const colAnswers = shuffledCriteria.slice(GRID_SIZE, GRID_SIZE * 2);

        const allAnswers = new Set([...rowAnswers, ...colAnswers]);
        if (allAnswers.size !== GRID_SIZE * 2) {
            continue;
        }

        const grid: (Pokemon | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const rowCriterion = rowAnswers[r];
                const colCriterion = colAnswers[c];

                const candidates = shuffledPokemon.filter(p => {
                    if (usedPokemonIds.has(p.id)) return false;
                    const pCriteria = getPokemonCriteria(p);
                    return pCriteria.has(rowCriterion) && pCriteria.has(colCriterion);
                });

                if (candidates.length > 0) {
                    const chosenPokemon = candidates[0];
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
    return null;
}


export async function generatePuzzle(): Promise<Puzzle | null> {
    return createValidPuzzle();
}
