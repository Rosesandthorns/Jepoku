








import Link from 'next/link';
import { PuzzleLoader } from '@/components/puzzle-loader';
import { generatePuzzle } from '@/lib/puzzle-generator';
import type { Puzzle, ValidationResult, Pokemon, JepokuMode } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { lcs } from '@/lib/lcs';

export const revalidate = 0;

async function getNewPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
  'use server';
  const effectiveMode = mode === 'timer' ? 'easy' : mode;
  return generatePuzzle(effectiveMode);
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
        isCriteriaCorrect: false,
        isCorrect: false,
    };
  }

  const puzzle: Puzzle = JSON.parse(puzzleString);
  const gridSize = puzzle.grid.length;
  const mode = puzzle.mode;

  if (mode === 'order') {
    const playerOrderString = formData.get('playerOrder') as string;
    const playerOrderIds: number[] = JSON.parse(playerOrderString);
    const correctOrderIds = puzzle.correctOrderIds!;
    const accuracy = lcs(playerOrderIds, correctOrderIds) / correctOrderIds.length;
    const isCorrect = accuracy >= 0.8;

    return {
        rowResults: [],
        colResults: [],
        isCriteriaCorrect: false,
        isCorrect,
        accuracy,
    };
  }

  const rowGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`row-${i}`) as string);
  const colGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`col-${i}`) as string);

  let rowResults: (boolean | null)[] = [];
  let colResults: (boolean | null)[] = [];
  let isCriteriaCorrect = false;
  let isPlacementCorrect = false;
  let isOddOneOutSelectionCorrect = false;
  let isCorrect = false;

  if (mode === 'miss-matched') {
    const playerGridString = formData.get('playerGrid') as string;
    const playerGrid: (Pokemon | null)[][] = JSON.parse(playerGridString);
    
    isPlacementCorrect = true;
    for(let r=0; r < gridSize; r++) {
      for (let c=0; c < gridSize; c++) {
        const playerMon = playerGrid[r][c];
        if (playerMon) {
          const pCriteria = getPokemonCriteria(playerMon);
          if (!pCriteria.has(rowGuesses[r]) || !pCriteria.has(colGuesses[c])) {
            isPlacementCorrect = false;
            break;
          }
        }
      }
      if (!isPlacementCorrect) break;
    }

    rowResults = rowGuesses.map((guess, index) => {
        if (!guess) return null;
        if (puzzle.revealedCriterion?.axis === 'row' && puzzle.revealedCriterion.index === index) {
            return guess === puzzle.revealedCriterion.value;
        }
        return puzzle.rowAnswers[index] === guess;
    });

    colResults = colGuesses.map((guess, index) => {
        if (!guess) return null;
        if (puzzle.revealedCriterion?.axis === 'col' && puzzle.revealedCriterion.index === index) {
            return guess === puzzle.revealedCriterion.value;
        }
        return puzzle.colAnswers[index] === guess;
    });

    isCriteriaCorrect = [...rowResults, ...colResults].every(res => res === true);
    isCorrect = isCriteriaCorrect && isPlacementCorrect;

    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      isPlacementCorrect,
      isCorrect,
    };

  } else if (mode === 'odd-one-out' || mode === 'imposter') {
    rowResults = rowGuesses.map((guess, r) => {
        if (!guess) return null;
        // Find the column that contains the imposter for this row
        const imposterCol = puzzle.oddOneOutCoords!.find(c => c.row === r)!.col;
        // Filter out the imposter, leaving the valid Pokemon for this row's criteria
        const validPokemon = puzzle.grid[r].filter((_, c) => c !== imposterCol);
        // The guess is correct if it applies to all valid Pokemon in the row
        return validPokemon.every(p => p && getPokemonCriteria(p).has(guess));
    });

    colResults = colGuesses.map((guess, c) => {
        if (!guess) return null;
        // Find the row that contains the imposter for this column
        const imposterRow = puzzle.oddOneOutCoords!.find(coord => coord.col === c)!.row;
        // Filter out the imposter, leaving the valid Pokemon for this column's criteria
        const validPokemon = puzzle.grid.map(row => row[c]).filter((_, r) => r !== imposterRow);
        // The guess is correct if it applies to all valid Pokemon in the column
        return validPokemon.every(p => p && getPokemonCriteria(p).has(guess));
    });

    isCriteriaCorrect = [...rowResults, ...colResults].every(res => res === true);

    const selectedImposters = JSON.parse(formData.get('selectedImposters') as string) as {row: number, col: number}[];
    const correctImposterCoords = new Set(puzzle.oddOneOutCoords!.map(coord => `${coord.row},${coord.col}`));
    const selectedImposterCoords = new Set(selectedImposters.map(coord => `${coord.row},${coord.col}`));
    
    isOddOneOutSelectionCorrect = correctImposterCoords.size === selectedImposterCoords.size &&
                                   [...correctImposterCoords].every(coord => selectedImposterCoords.has(coord));

    let oddOneOutSelectionResults: (boolean | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isSelected = selectedImposterCoords.has(`${r},${c}`);
            const isCorrectImposter = correctImposterCoords.has(`${r},${c}`);
            if(isSelected) {
              oddOneOutSelectionResults[r][c] = isCorrectImposter;
            }
        }
    }
    
    isCorrect = isCriteriaCorrect && isOddOneOutSelectionCorrect;

    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      oddOneOutSelectionResults,
      isOddOneOutSelectionCorrect,
      isCorrect,
    };

  } else { // Normal, Hard, Easy, Blinded
    rowResults = rowGuesses.map((guess, index) => guess ? guess === puzzle.rowAnswers[index] : null);
    colResults = colGuesses.map((guess, index) => guess ? guess === puzzle.colAnswers[index] : null);
    isCriteriaCorrect = [...rowResults, ...colResults].every(res => res === true);
    isCorrect = isCriteriaCorrect;

    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      isCorrect,
    };
  }
}

interface HomePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const modeParam = searchParams.mode;
  const mode: JepokuMode = 
    modeParam === 'hard' ? 'hard' : 
    (modeParam === 'blinded' ? 'blinded' : 
    (modeParam === 'easy' ? 'easy' : 
    (modeParam === 'odd-one-out' ? 'odd-one-out' : 
    (modeParam === 'imposter' ? 'imposter' : 
    (modeParam === 'miss-matched' ? 'miss-matched' : 
    (modeParam === 'timer' ? 'timer' : 
    (modeParam === 'order' ? 'order' : 
    (modeParam === 'ditto' ? 'ditto' : 'normal'))))))));


  return (
    <main className={cn(
      "flex min-h-screen flex-col items-center p-2 sm:p-4 md:p-6",
      mode === 'blinded' || mode === 'odd-one-out' || mode === 'miss-matched' || mode === 'timer' || mode === 'order' || mode === 'ditto' ? "justify-start" : "justify-center",
    )}>
      <div className={cn("w-full", mode === 'blinded' || mode === 'odd-one-out' || mode === 'miss-matched' || mode === 'imposter' || mode === 'timer' || mode === 'order' || mode === 'ditto' ? 'max-w-none' : 'max-w-7xl')}>
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
                    <Link href="/?mode=timer" className={cn(mode === 'timer' && 'font-bold')}>Timer Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=blinded" className={cn(mode === 'blinded' && 'font-bold')}>Blinded Mode</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=order" className={cn(mode === 'order' && 'font-bold')}>Order Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=odd-one-out" className={cn(mode === 'odd-one-out' && 'font-bold')}>Odd one out</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=miss-matched" className={cn(mode === 'miss-matched' && 'font-bold')}>Miss Matched</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=imposter" className={cn(mode === 'imposter' && 'font-bold')}>Imposter</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=ditto" className={cn(mode === 'ditto' && 'font-bold')}>Ditto Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Coming Soon</DropdownMenuLabel>
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
