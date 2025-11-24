'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Check, Send, Trophy, X, HelpCircle, EyeOff } from 'lucide-react';

import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
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
import { NORMAL_CRITERIA, HARD_CRITERIA, EASY_CRITERIA } from '@/lib/criteria';


function getInitialState(puzzle: Puzzle): ValidationResult {
  const size = puzzle.grid.length;
  return {
    rowResults: Array(size).fill(null),
    colResults: Array(size).fill(null),
    isCriteriaCorrect: false,
    oddOneOutSelectionResults: Array(size).fill(null).map(() => Array(size).fill(null)),
    isOddOneOutSelectionCorrect: false,
    isCorrect: false,
  }
}

interface GameBoardProps {
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
      {pending ? 'Checking...' : 'Submit Guesses'}
      <Send className="ml-2 h-4 w-4" />
    </Button>
  );
}

export const GameBoard: FC<GameBoardProps> = ({ puzzle, checkAnswersAction, mode }) => {
  const [state, formAction] = useActionState(checkAnswersAction, getInitialState(puzzle));

  const [score, setScore] = useState(0);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedImposters, setSelectedImposters] = useState<{row: number, col: number}[]>([]);


  const puzzleId = useMemo(() => puzzle.grid.flat().map(p => p?.id).join('-'), [puzzle]);
  
  const gridSize = puzzle.grid.length;
  const isBlinded = mode === 'blinded';
  const isOddOneOut = mode === 'odd-one-out';
  const isImposter = mode === 'imposter';

  const criteriaPool = mode === 'hard' || mode === 'imposter' ? HARD_CRITERIA : mode === 'easy' ? EASY_CRITERIA : NORMAL_CRITERIA;

  useEffect(() => {
    const savedScore = localStorage.getItem('jepokuScore');
    if (savedScore) {
      setScore(parseInt(savedScore, 10));
    }
    // Fade in the puzzle on mount
    const timer = setTimeout(() => setShowPuzzle(true), 100);
    return () => clearTimeout(timer);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowAnswers(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setShowAnswers(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  const handleImposterSelect = (row: number, col: number) => {
    if (state.isCorrect) return;

    setSelectedImposters(prev => {
      const isSelected = prev.some(coord => coord.row === row && coord.col === col);
      if (isSelected) {
        return prev.filter(coord => coord.row !== row || coord.col !== col);
      } else {
        const maxImposters = isImposter ? 1 : gridSize;
        if (prev.length < maxImposters) {
            return [...prev, {row, col}];
        }
        if (isImposter) { // If it's imposter mode and we're at the limit, swap selection
            return [{row, col}];
        }
        return prev;
      }
    });
  }

  const getSelectClass = (isCorrect: boolean | null) => {
    if (isCorrect === true) {
      return 'border-green-500 ring-green-500 focus:ring-green-500';
    }
    if (isCorrect === false) {
      return 'border-red-500 ring-red-500 focus:ring-red-500';
    }
    return '';
  };
  
  const getOddOneOutTileClass = (row: number, col: number) => {
    if (!isOddOneOut && !isImposter) return '';
    const result = state.oddOneOutSelectionResults?.[row]?.[col];
    if (result === true) {
        return 'ring-4 ring-green-500';
    }
    if (result === false) {
        return 'ring-4 ring-red-500';
    }
    const isSelected = selectedImposters.some(coord => coord.row === row && coord.col === col);
    if(isSelected) {
        return 'ring-4 ring-blue-500';
    }
    return 'cursor-pointer';
  }


  return (
    <TooltipProvider>
      <Card className={cn(isBlinded || isOddOneOut || isImposter ? "w-max border-gray-700 bg-gray-800/50 text-white" : "")}>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span>Score: {score}</span>
            </div>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(isBlinded || isOddOneOut || isImposter ? 'text-gray-300 hover:text-white hover:bg-gray-700' : '')}>
                        <HelpCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {isOddOneOut 
                      ? <p>Guess criteria & click the 5 Pokémon that don't fit their row and column.</p>
                      : isImposter
                      ? <p>Guess criteria & click the single Pokémon that doesn't fit its row and column.</p>
                      : <p>Guess the common Pokemon trait for each row and column. Hold TAB to see answers.</p>
                    }
                </TooltipContent>
            </Tooltip>
          </div>
          <form action={formAction} className="space-y-6">
             <input type="hidden" name="puzzle" value={JSON.stringify(puzzle)} />
             {(isOddOneOut || isImposter) && <input type="hidden" name="selectedImposters" value={JSON.stringify(selectedImposters)} />}
            <div className={cn("grid items-center gap-2 sm:gap-4", isBlinded || isOddOneOut || isImposter ? "grid-cols-[auto,minmax(0,1fr)]" : "grid-cols-[auto,1fr]")}>
              <div />
              <div className={cn("grid gap-2 sm:gap-4", `grid-cols-${gridSize}`)} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`col-input-${i}`} className="relative">
                    <Select name={`col-${i}`} disabled={state.isCorrect}>
                      <SelectTrigger className={cn(
                          'font-semibold', 
                          getSelectClass(state.colResults[i]),
                          (isBlinded || isOddOneOut || isImposter) ? 'text-black' : ''
                        )}>
                        <SelectValue placeholder={showAnswers ? puzzle.colAnswers[i] : `Col ${i + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {criteriaPool.map((crit) => (
                          <SelectItem key={crit} value={crit}>
                            {crit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {state.colResults[i] === true && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    {state.colResults[i] === false && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                  </div>
                ))}
              </div>

              <div className={cn("grid gap-2 sm:gap-4", `grid-rows-${gridSize}`)} style={{ gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`row-input-${i}`} className="relative flex items-center h-full">
                    <Select name={`row-${i}`} disabled={state.isCorrect}>
                      <SelectTrigger className={cn(
                        'w-28 font-semibold', 
                        getSelectClass(state.rowResults[i]),
                         (isBlinded || isOddOneOut || isImposter) ? 'text-black' : ''
                        )}>
                        <SelectValue placeholder={showAnswers ? puzzle.rowAnswers[i] : `Row ${i + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {criteriaPool.map((crit) => (
                          <SelectItem key={crit} value={crit}>
                            {crit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {state.rowResults[i] === true && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                     {state.rowResults[i] === false && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                  </div>
                ))}
              </div>

              <div className={cn(
                  "grid gap-2 sm:gap-4 transition-opacity duration-700 ease-in-out",
                  `grid-cols-${gridSize}`,
                  showPuzzle ? 'opacity-100' : 'opacity-0'
                )}
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                {puzzle.grid.flat().map((pokemon, i) => {
                  const row = Math.floor(i / gridSize);
                  const col = i % gridSize;
                  const isVisible = !isBlinded || puzzle.visibleMask?.[row]?.[col];

                  return (
                    <div 
                      key={pokemon?.id || i} 
                      className={cn("aspect-square w-full sm:w-24 md:w-28 lg:w-32 rounded-lg transition-all", getOddOneOutTileClass(row, col))}
                      onClick={(isOddOneOut || isImposter) ? () => handleImposterSelect(row, col) : undefined}
                    >
                      {pokemon ? (
                        isVisible ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                                <Image
                                  src={pokemon.spriteUrl}
                                  alt={pokemon.name}
                                  fill
                                  sizes="(max-width: 640px) 15vw, 128px"
                                  className="object-contain transition-transform duration-300 hover:scale-110"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="capitalize">{pokemon.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-lg bg-black shadow-inner">
                            <EyeOff className="h-8 w-8 text-gray-600" />
                          </div>
                        )
                      ) : (
                        <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {(isOddOneOut || isImposter) && !state.isCorrect && (
                <div className="text-center text-sm text-gray-400">
                    <p>{selectedImposters.length} / {isImposter ? 1 : gridSize} imposter{isImposter ? '' : 's'} selected.</p>
                </div>
            )}

            <div className="mt-6">
              {state.isCorrect ? (
                <div className="text-center space-y-4">
                    <p className="text-2xl font-bold text-green-600">You solved it!</p>
                    <Button asChild size="lg" className="w-full">
                        <a href={`/?mode=${mode}`}>Play Next Puzzle</a>
                    </Button>
                </div>
              ) : (
                <SubmitButton isCorrect={state.isCorrect} />
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
