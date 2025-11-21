
import { PuzzleLoader } from '@/components/puzzle-loader';
import { generatePuzzle } from '@/lib/puzzle-generator';
import type { Puzzle, ValidationResult, Pokemon } from '@/lib/definitions';

export const revalidate = 0;

export async function getNewPuzzle() {
  'use server';
  return generatePuzzle();
}

function getPokemonCriteria(pokemon: Pokemon): Set<string> {
    const criteria = new Set<string>(pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    if (pokemon.isMega) criteria.add('Mega');
    if (pokemon.isLegendary) criteria.add('Legendary');
    if (pokemon.isMythical) criteria.add('Mythical');
    if (pokemon.region) criteria.add(pokemon.region);
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.canEvolve) criteria.add('Can Evolve');
    if (pokemon.isFinalEvolution) criteria.add('Final Evolution');
    if (pokemon.isPartner) criteria.add('Partner Pokemon');
    return criteria;
}

async function checkAnswers(
  puzzle: Puzzle,
  prevState: ValidationResult,
  formData: FormData
): Promise<ValidationResult> {
  'use server';
  
  if (!puzzle) {
      return {
          rowResults: [null, null, null],
          colResults: [null, null, null],
          isCorrect: false,
      };
  }

  const guesses = {
    rows: [
      formData.get('row-0') as string,
      formData.get('row-1') as string,
      formData.get('row-2') as string,
    ],
    cols: [
      formData.get('col-0') as string,
      formData.get('col-1') as string,
      formData.get('col-2') as string,
    ],
  };

  const rowResults = guesses.rows.map((guess, r) => {
    if (!guess) return false;
    const pokemonInRow = [puzzle.grid[r][0], puzzle.grid[r][1], puzzle.grid[r][2]];
    return pokemonInRow.every(pokemon => {
      if (!pokemon) return false;
      return getPokemonCriteria(pokemon).has(guess);
    });
  });

  const colResults = guesses.cols.map((guess, c) => {
    if (!guess) return false;
    const pokemonInCol = [puzzle.grid[0][c], puzzle.grid[1][c], puzzle.grid[2][c]];
    return pokemonInCol.every(pokemon => {
      if (!pokemon) return false;
      return getPokemonCriteria(pokemon).has(guess);
    });
  });

  const isCorrect = [...rowResults, ...colResults].every(Boolean);

  return {
    rowResults,
    colResults,
    isCorrect,
  };
}


export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-5xl font-bold tracking-tighter text-primary sm:text-6xl font-headline">
            Jepoku
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            A reverse Pokedoku. Can you guess the common trait for each row and column?
          </p>
        </header>

        <PuzzleLoader getPuzzleAction={getNewPuzzle} checkAnswersAction={checkAnswers} />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">PokeAPI</a>. All Pokémon content is &copy; Nintendo, Game Freak, and The Pokémon Company.</p>
        </footer>
      </div>
    </main>
  );
}
