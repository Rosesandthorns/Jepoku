import 'server-only';
import { getAllPokemonWithDetails, getPokemonTypes } from './pokedex';
import type { Puzzle, Pokemon } from './definitions';
import { ALL_CRITERIA } from './criteria';

const MAX_RETRIES = 100;

type Criterion = string;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function checkPokemon(pokemon: Pokemon, criterion: Criterion): boolean {
    if (criterion === 'Mega') return pokemon.isMega;
    if (criterion === 'Kanto') return pokemon.region === 'Kanto';
    if (criterion === 'Johto') return pokemon.region === 'Johto';
    if (criterion === 'Has: Sturdy') return pokemon.abilities.includes('sturdy');
    if (criterion === 'Can Evolve') return pokemon.canEvolve;
    if (criterion === 'Final Evolution') return pokemon.isFinalEvolution;
    if (criterion === 'Partner Pokemon') return pokemon.isPartner;
    // Assume it's a type if not any other criterion
    return pokemon.types.includes(criterion.toLowerCase());
}

async function getCriteria(): Promise<Criterion[]> {
    const types = await getPokemonTypes();
    const specialCriteria = [
        'Mega',
        'Kanto',
        'Johto',
        'Has: Sturdy',
        'Can Evolve',
        'Final Evolution',
        'Partner Pokemon'
    ];
    return [...types, ...specialCriteria];
}

export async function generatePuzzle(): Promise<Puzzle | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const allPokemon = await getAllPokemonWithDetails();
      if (allPokemon.length === 0) {
        console.error("No Pokemon data available on attempt", attempt);
        continue;
      }
      const shuffledPokemon = shuffle(allPokemon);

      const availableCriteria = shuffle([...ALL_CRITERIA]);

      // 1. Select 6 unique criteria
      if (availableCriteria.length < 6) throw new Error("Not enough criteria");
      const chosenCriteria = availableCriteria.slice(0, 6);
      const rowAnswers = chosenCriteria.slice(0, 3) as string[];
      const colAnswers = chosenCriteria.slice(3, 6) as string[];

      const grid: (Pokemon | null)[][] = Array(3).fill(null).map(() => Array(3).fill(null));
      const usedPokemonIds = new Set<number>();

      // 2. Fill the grid
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          // Randomly decide if the pokemon should be Gen 1 or Gen 2 for this tile
          const targetGeneration = Math.random() < 0.5 ? 'Kanto' : 'Johto';
          
          const candidates = shuffledPokemon.filter(p =>
            !usedPokemonIds.has(p.id) &&
            checkPokemon(p, rowAnswers[r]) &&
            checkPokemon(p, colAnswers[c]) &&
            p.region === targetGeneration
          );

          if (candidates.length === 0) {
             // If no candidate for the specific gen, try the other gen
             const fallbackGeneration = targetGeneration === 'Kanto' ? 'Johto' : 'Kanto';
             const fallbackCandidates = shuffledPokemon.filter(p =>
                !usedPokemonIds.has(p.id) &&
                checkPokemon(p, rowAnswers[r]) &&
                checkPokemon(p, colAnswers[c]) &&
                p.region === fallbackGeneration
             );
              if (fallbackCandidates.length === 0) {
                // If still no candidates, this puzzle is impossible
                throw new Error(`No Pokemon found for row "${rowAnswers[r]}", col "${colAnswers[c]}"`);
              }
              const chosenMon = fallbackCandidates[0];
              grid[r][c] = chosenMon;
              usedPokemonIds.add(chosenMon.id);

          } else {
            const chosenMon = candidates[0];
            grid[r][c] = chosenMon;
            usedPokemonIds.add(chosenMon.id);
          }
        }
      }

      return { grid, rowAnswers, colAnswers };
    } catch (e) {
      // This attempt failed, the loop will try again.
      // console.log(`Attempt ${attempt + 1} failed:`, e instanceof Error ? e.message : e);
    }
  }

  console.error("Failed to generate a puzzle after multiple retries.");
  return null;
}
