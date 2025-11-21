import 'server-only';
import { getAllPokemonWithTypes, getPokemonTypes } from './pokedex';
import type { Puzzle, Pokemon } from './definitions';

const MAX_RETRIES = 20;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export async function generatePuzzle(): Promise<Puzzle | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const allPokemon = await getAllPokemonWithTypes();
      if (allPokemon.length === 0) throw new Error("No Pokemon data available.");
      
      const allTypes = await getPokemonTypes();
      if (allTypes.length < 6) throw new Error("Not enough Pokemon types available.");

      const shuffledTypes = shuffle([...allTypes]);
      const rowAnswers = shuffledTypes.slice(0, 3);
      const colAnswers = shuffledTypes.slice(3, 6);

      const grid: (Pokemon | null)[][] = Array(3).fill(null).map(() => Array(3).fill(null));
      const usedPokemonIds = new Set<number>();

      let possible = true;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rowType = rowAnswers[r];
          const colType = colAnswers[c];

          const candidates = allPokemon.filter(p =>
            !usedPokemonIds.has(p.id) &&
            p.types.includes(rowType) &&
            p.types.includes(colType)
          );

          if (candidates.length === 0) {
            possible = false;
            break;
          }

          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          grid[r][c] = chosen;
          usedPokemonIds.add(chosen.id);
        }
        if (!possible) break;
      }
      
      if (possible) {
        return { grid, rowAnswers, colAnswers };
      }
    } catch (error) {
        console.error(`Puzzle generation attempt ${attempt + 1} failed:`, error);
    }
  }

  console.error("Failed to generate a puzzle after multiple retries.");
  return null;
}
