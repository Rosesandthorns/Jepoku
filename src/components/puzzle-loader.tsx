
'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { MissMatchedBoard } from '@/components/miss-matched-board';
import { TimerModeBoard } from '@/components/timer-mode-board';
import { OrderModeBoard } from '@/components/order-mode-board';
import { DittoModeBoard } from '@/components/ditto-mode-board';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { generatePuzzle } from '@/lib/puzzle-generator';
import { lcs } from '@/lib/lcs';
import { getPokemonCriteria } from '@/lib/criteria';


async function getNewPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
  'use server';
  const effectiveMode = mode === 'timer' ? 'easy' : mode;
  return generatePuzzle(effectiveMode);
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
        const imposterCol = puzzle.oddOneOutCoords!.find(c => c.row === r)!.col;
        const validPokemon = puzzle.grid[r].filter((_, c) => c !== imposterCol);
        return validPokemon.every(p => p && getPokemonCriteria(p).has(guess));
    });

    colResults = colGuesses.map((guess, c) => {
        if (!guess) return null;
        const imposterRow = puzzle.oddOneOutCoords!.find(coord => coord.col === c)!.row;
        const validPokemon = puzzle.grid.map(row => row[c]).filter((_, r) => r !== imposterRow);
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

function PuzzleLoaderInternal() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');

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
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode === 'timer' || mode === 'ditto') {
      setPuzzle(null); // These modes manage their own puzzle loading
      return;
    }
    // Reset puzzle when mode changes
    setPuzzle(null);

    startTransition(async () => {
      const newPuzzle = await getNewPuzzle(mode);
      setPuzzle(newPuzzle);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === 'timer') {
    return <TimerModeBoard getPuzzleAction={getNewPuzzle} checkAnswersAction={checkAnswers} />;
  }
  
  if (mode === 'ditto') {
    return <DittoModeBoard getPuzzleAction={getNewPuzzle} checkAnswersAction={checkAnswers} />;
  }


  if (isPending || !puzzle) {
    return (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" />
              Generating New Puzzle
            </CardTitle>
            <CardDescription>
              This can sometimes take a moment. We appreciate your patience!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>We're finding the best Pokémon for a fun challenge...</p>
          </CardContent>
        </Card>
    );
  }
  
  if (mode === 'miss-matched') {
    return <MissMatchedBoard puzzle={puzzle} checkAnswersAction={checkAnswers} mode={mode} />;
  }

  if (mode === 'order') {
    return (
      <DndProvider backend={HTML5Backend}>
        <OrderModeBoard puzzle={puzzle} checkAnswersAction={checkAnswers} mode={mode} />
      </DndProvider>
    );
  }

  return (
    <GameBoard puzzle={puzzle} checkAnswersAction={checkAnswers} mode={mode} />
  );
}

export function PuzzleLoader() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PuzzleLoaderInternal />
    </Suspense>
  )
}
