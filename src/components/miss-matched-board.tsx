
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Check, Send, Trophy, X, HelpCircle } from 'lucide-react';

import type { Puzzle, ValidationResult, JepokuMode, Pokemon } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NORMAL_CRITERIA } from '@/lib/criteria';


function getInitialState(puzzle: Puzzle): ValidationResult {
  const size = puzzle.grid.length;
  return {
    rowResults: Array(size).fill(null),
    colResults: Array(size).fill(null),
    isCriteriaCorrect: false,
    isPlacementCorrect: false,
    isCorrect: false,
  }
}

interface MissMatchedBoardProps {
  puzzle: Puzzle;
  checkAnswersAction: (
    prevState: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
  mode: JepokuMode;
}

function SubmitButton({ isCorrect }: { isCorrect: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isCorrect} className="w-full" size="lg">
      {pending ? 'Checking...' : 'Confirm'}
      <Send className="ml-2 h-4 w-4" />
    </Button>
  );
}

export const MissMatchedBoard: FC<MissMatchedBoardProps> = ({ puzzle, checkAnswersAction, mode }) => {
  const [state, formAction] = useActionState(checkAnswersAction, getInitialState(puzzle));
  
  const [playerGrid, setPlayerGrid] = useState<(Pokemon | null)[][]>(puzzle.shuffledGrid!);
  
  const findInitialEmptySlot = () => {
    if (!puzzle.shuffledGrid) return { row: -1, col: -1 };
    for (let r = 0; r < puzzle.shuffledGrid.length; r++) {
        for (let c = 0; c < puzzle.shuffledGrid[r].length; c++) {
            if (puzzle.shuffledGrid[r][c] === null) return { row: r, col: c };
        }
    }
    return { row: -1, col: -1 };
  };

  const [emptySlot, setEmptySlot] = useState<{row: number, col: number}>(findInitialEmptySlot());

  const [score, setScore] = useState(0);
  const puzzleId = useMemo(() => puzzle.solutionGrid!.flat().map(p => p?.id).sort().join('-'), [puzzle]);
  const gridSize = puzzle.grid.length;
  const criteriaPool = NORMAL_CRITERIA;

  useEffect(() => {
    const savedScore = localStorage.getItem('jepokuScore');
    if (savedScore) {
      setScore(parseInt(savedScore, 10));
    }
  }, []);

  useEffect(() => {
    if (state.isCorrect) {
      const lastSolved = localStorage.getItem('lastSolvedPuzzleId');
      if (lastSolved !== puzzleId) {
        const newScore = score + 1;
        setScore(newScore);
        localStorage.setItem('jepokuScore', newScore.toString());
        localStorage.setItem('lastSolvedPuzzleId', puzzleId);
      }
    }
  }, [state.isCorrect, puzzleId, score]);

  const handleTileClick = (row: number, col: number) => {
    if (state.isCorrect) return;

    const isAdjacent = Math.abs(row - emptySlot.row) + Math.abs(col - emptySlot.col) === 1;
    if (!isAdjacent) return;

    const newGrid = playerGrid.map(r => [...r]);
    newGrid[emptySlot.row][emptySlot.col] = newGrid[row][col];
    newGrid[row][col] = null;

    setPlayerGrid(newGrid);
    setEmptySlot({ row, col });
  };
  
  const getSelectClass = (isCorrect: boolean | null) => {
    if (isCorrect === true) return 'border-green-500 ring-green-500';
    if (isCorrect === false) return 'border-red-500 ring-red-500';
    return '';
  };

  const isCriterionRevealed = (axis: 'row' | 'col', index: number) => {
    return puzzle.revealedCriterion?.axis === axis && puzzle.revealedCriterion.index === index;
  };

  const renderResultIcon = (isCorrect: boolean | null) => {
    if (isCorrect === true) return <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />;
    if (isCorrect === false) return <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />;
    return null;
  }

  return (
    <TooltipProvider>
      <Card className="w-max border-gray-700 bg-gray-800/50 text-white">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span>Score: {score}</span>
            </div>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className='text-gray-300 hover:text-white hover:bg-gray-700'>
                        <HelpCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>Move Pokémon into the correct slots and guess the criteria.</p>
                </TooltipContent>
            </Tooltip>
          </div>
          <form action={formAction} className="space-y-6">
             <input type="hidden" name="puzzle" value={JSON.stringify(puzzle)} />
             <input type="hidden" name="playerGrid" value={JSON.stringify(playerGrid)} />

            <div className="grid grid-cols-[auto,minmax(0,1fr)] items-center gap-2 sm:gap-4">
              <div />
              <div className="grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`col-input-${i}`} className="relative">
                    {isCriterionRevealed('col', i) ? (
                        <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-gray-700 px-3 py-2 text-sm font-semibold">
                            {puzzle.revealedCriterion!.value}
                            <input type="hidden" name={`col-${i}`} value={puzzle.revealedCriterion!.value} />
                        </div>
                    ) : (
                      <Select name={`col-${i}`} disabled={state.isCorrect}>
                        <SelectTrigger className={cn('font-semibold text-black', getSelectClass(state.colResults[i]))}>
                          <SelectValue placeholder={`Col ${i + 1}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {criteriaPool.map((crit) => (
                            <SelectItem key={crit} value={crit}>{crit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {renderResultIcon(state.colResults[i])}
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:gap-4" style={{ gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`row-input-${i}`} className="relative flex items-center h-full">
                     {isCriterionRevealed('row', i) ? (
                        <div className="flex h-10 w-28 items-center justify-center rounded-md border border-input bg-gray-700 px-3 py-2 text-sm font-semibold">
                            {puzzle.revealedCriterion!.value}
                            <input type="hidden" name={`row-${i}`} value={puzzle.revealedCriterion!.value} />
                        </div>
                     ) : (
                        <Select name={`row-${i}`} disabled={state.isCorrect}>
                            <SelectTrigger className={cn('w-28 font-semibold text-black', getSelectClass(state.rowResults[i]))}>
                                <SelectValue placeholder={`Row ${i + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                            {criteriaPool.map((crit) => (
                                <SelectItem key={crit} value={crit}>{crit}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                     )}
                     {renderResultIcon(state.rowResults[i])}
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {playerGrid.flat().map((pokemon, i) => {
                  const row = Math.floor(i / gridSize);
                  const col = i % gridSize;
                  
                  return (
                    <div 
                      key={pokemon?.id || `empty-${i}`} 
                      className={cn(
                        "aspect-square w-full sm:w-24 md:w-28 lg:w-32 rounded-lg transition-all",
                        !pokemon ? "bg-black/50" : "cursor-pointer"
                      )}
                      onClick={pokemon ? () => handleTileClick(row, col) : undefined}
                    >
                      {pokemon && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                              <Image
                                src={pokemon.spriteUrl}
                                alt={pokemon.name}
                                fill
                                sizes="(max-width: 640px) 15vw, 128px"
                                className="object-contain transition-transform duration-300 hover:scale-110 p-1"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="capitalize">{pokemon.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="mt-6">
              {state.isCorrect ? (
                <div className="text-center space-y-4">
                    <p className="text-2xl font-bold text-green-600">You solved it!</p>
                     {state.isPlacementCorrect === false && <p className="text-sm text-yellow-400">Your criteria were correct, but Pokémon placement was wrong!</p>}
                    <Button asChild size="lg" className="w-full">
                        <a href={`/?mode=${mode}`}>Play Next Puzzle</a>
                    </Button>
                </div>
              ) : (
                <SubmitButton isCorrect={state.isCorrect} />
              )}
               {state.isCorrect === false && state.isPlacementCorrect === false && (
                <p className="mt-2 text-center text-sm text-red-400">Pokémon placement is incorrect. Keep trying!</p>
               )}
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
