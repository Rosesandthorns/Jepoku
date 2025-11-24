
import Link from 'next/link';
import { PuzzleLoader } from '@/components/puzzle-loader';
import { generatePuzzle } from '@/lib/puzzle-generator';
import type { Puzzle, ValidationResult, Pokemon, JepokuMode } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

export const revalidate = 0;

async function getNewPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
  'use server';
  return generatePuzzle(mode);
}

function getPokemonCriteria(pokemon: Pokemon): Set<string> {
    const criteria = new Set<string>(pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    if (pokemon.isMega) criteria.add('Mega');
    if (pokemon.isLegendary) criteria.add('Legendary');
    if (pokemon.isMythical) criteria.add('Mythical');
    if (pokemon.isUltraBeast) criteria.add('Ultra Beast');
    if (pokemon.isParadox) criteria.add('Paradox');
    if (pokemon.region) criteria.add(pokemon.region);

    // Abilities
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.abilities.includes('swift-swim')) criteria.add('Has: Swift Swim');
    if (pokemon.abilities.includes('cursed-body')) criteria.add('Has: Cursed Body');
    if (pokemon.abilities.includes('mold-breaker')) criteria.add('Has: Mold Breaker');
    if (pokemon.abilities.includes('drizzle')) criteria.add('Has: Drizzle');
    if (pokemon.abilities.includes('sand-stream')) criteria.add('Has: Sand Stream');
    if (pokemon.abilities.includes('snow-warning')) criteria.add('Has: Snow Warning');
    if (pokemon.abilities.includes('grassy-surge')) criteria.add('Has: Grassy Surge');
    if (pokemon.abilities.includes('magic-guard')) criteria.add('Has: Magic Guard');
    if (pokemon.abilities.includes('thick-fat')) criteria.add('Has: Thick Fat');
    if (pokemon.abilities.includes('flash-fire')) criteria.add('Has: Flash Fire');
    if (pokemon.abilities.includes('water-absorb')) criteria.add('Has: Water Absorb');
    if (pokemon.abilities.includes('sap-sipper')) criteria.add('Has: Sap Sipper');
    if (pokemon.abilities.includes('prankster')) criteria.add('Has: Prankster');
    if (pokemon.abilities.includes('competitive')) criteria.add('Has: Competitive');
    if (pokemon.abilities.includes('frisk')) criteria.add('Has: Frisk');


    // Moves
    if (pokemon.moves.includes('brick-break')) criteria.add('Knows: Brick Break');
    if (pokemon.moves.includes('grass-knot')) criteria.add('Knows: Grass Knot');
    if (pokemon.moves.includes('iron-tail')) criteria.add('Knows: Iron Tail');
    if (pokemon.moves.includes('cut')) criteria.add('Knows: Cut');
    if (pokemon.moves.includes('flamethrower')) criteria.add('Knows: Flame Thrower');
    if (pokemon.moves.includes('leer')) criteria.add('Knows: Leer');
    if (pokemon.moves.includes('mud-slap')) criteria.add('Knows: Mud Slap');
    if (pokemon.moves.includes('earthquake')) criteria.add('Learns Earthquake');
    if (pokemon.moves.includes('bind')) criteria.add('Learns Bind');
    if (pokemon.moves.includes('close-combat')) criteria.add('Learns Close Combat');
    if (pokemon.moves.includes('dazzling-gleam')) criteria.add('Learns Dazzling Gleam');
    if (pokemon.moves.includes('dark-pulse')) criteria.add('Learns Dark Pulse');
    if (pokemon.moves.includes('heal-pulse')) criteria.add('Learns Heal Pulse');
    if (pokemon.moves.includes('scratch')) criteria.add('Learns Scratch');
    if (pokemon.moves.includes('wish')) criteria.add('Learns Wish');
    if (pokemon.moves.includes('healing-wish')) criteria.add('Learns Healing Wish');
    if (pokemon.moves.includes('belly-drum')) criteria.add('Learns Belly Drum');
    if (pokemon.moves.includes('after-you')) criteria.add('Learns After You');
    if (pokemon.moves.includes('sucker-punch')) criteria.add('Learns Sucker Punch');


    if (pokemon.canEvolve) criteria.add('Can Evolve');
    if (pokemon.isFinalEvolution) criteria.add('Final Evolution');
    if (pokemon.isPartner) criteria.add('Partner Pokemon');

    // Base Stats
    if (pokemon.stats.hp > 100) criteria.add('Above 100 hp');
    if (pokemon.stats.attack > 100) criteria.add('Above 100 atk');
    if (pokemon.stats.defense > 100) criteria.add('Above 100 def');
    if (pokemon.stats.specialAttack > 100) criteria.add('Above 100 sp atk');
    if (pokemon.stats.specialDefense > 100) criteria.add('Above 100 sp def');
    if (pokemon.stats.speed > 100) criteria.add('Above 100 speed');

    if (pokemon.stats.hp < 50) criteria.add('Below 50 hp');
    if (pokemon.stats.attack < 50) criteria.add('Below 50 atk');
    if (pokemon.stats.defense < 50) criteria.add('Below 50 def');
    if (pokemon.stats.specialAttack < 50) criteria.add('Below 50 sp atk');
    if (pokemon.stats.specialDefense < 50) criteria.add('Below 50 sp def');
    if (pokemon.stats.speed < 50) criteria.add('Below 50 speed');
    
    // BST
    const bst = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);
    if (bst < 320) criteria.add('Has below 320 bst');
    if (bst > 620) criteria.add('Has above 620 bst');

    return criteria;
}

async function checkAnswers(
  prevState: ValidationResult,
  formData: FormData
): Promise<ValidationResult> {
  'use server';

  const puzzleString = formData.get('puzzle') as string;
  if (!puzzleString) {
    return {
        rowResults: [],
        colResults: [],
        isCorrect: false,
    };
  }

  const puzzle: Puzzle = JSON.parse(puzzleString);
  const gridSize = puzzle.grid.length;

  const rowGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`row-${i}`) as string);
  const colGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`col-${i}`) as string);

  const rowResults = rowGuesses.map((guess, r) => {
    if (!guess) return false;
    const pokemonInRow = puzzle.grid[r];
    return pokemonInRow.every(pokemon => {
      if (!pokemon) return false;
      return getPokemonCriteria(pokemon).has(guess);
    });
  });

  const colResults = colGuesses.map((guess, c) => {
    if (!guess) return false;
    const pokemonInCol = puzzle.grid.map(row => row[c]);
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

interface HomePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function HomePage({ searchParams }: HomePageProps) {
  const modeParam = searchParams.mode;
  const mode: JepokuMode = 
    modeParam === 'hard' ? 'hard' : 
    (modeParam === 'blinded' ? 'blinded' : 
    (modeParam === 'easy' ? 'easy' : 
    (modeParam === 'odd-one-out' ? 'odd-one-out' : 
    (modeParam === 'imposter' ? 'imposter' : 
    (modeParam === 'scarred' ? 'scarred' : 'normal')))));


  return (
    <main className={cn(
      "flex min-h-screen flex-col items-center p-2 sm:p-4 md:p-6",
      mode === 'blinded' ? "justify-start" : "justify-center",
    )}>
      <div className={cn("w-full", mode === 'blinded' ? 'max-w-none' : 'max-w-7xl')}>
        <header className="mb-6 flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-5xl font-bold tracking-tighter text-primary sm:text-6xl font-headline">
              Jepoku
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              A reverse Pokedoku. Can you guess the common trait?
            </p>
          </div>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open game modes</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Game Modes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/?mode=easy" className={cn(mode === 'easy' && 'font-bold')}>Easy Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/" className={cn(mode === 'normal' && 'font-bold')}>Normal Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=hard" className={cn(mode === 'hard' && 'font-bold')}>Hard Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=blinded" className={cn(mode === 'blinded' && 'font-bold')}>Blinded Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Coming Soon</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                    Odd one out
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                    Imposter
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                    Scarred Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <PuzzleLoader
          key={mode}
          getPuzzleAction={getNewPuzzle}
          checkAnswersAction={checkAnswers}
          mode={mode}
        />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">PokeAPI</a>. All Pokémon content is &copy; Nintendo, Game Freak, and The Pokémon Company.</p>
        </footer>
      </div>
    </main>
  );
}
