'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Check, Send, Trophy, X, HelpCircle } from 'lucide-react';

import type { Puzzle, ValidationResult } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const initialValidationState: ValidationResult = {
  rowResults: [null, null, null],
  colResults: [null, null, null],
  isCorrect: false,
};

interface GameBoardProps {
  puzzle: Puzzle;
  checkAnswersAction: (
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
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

export const GameBoard: FC<GameBoardProps> = ({ puzzle, checkAnswersAction }) => {
  const [state, formAction] = useActionState(checkAnswersAction, initialValidationState);
  const [score, setScore] = useState(0);
  const [showPuzzle, setShowPuzzle] = useState(false);

  const puzzleId = useMemo(() => puzzle.grid.flat().map(p => p?.id).join('-'), [puzzle]);

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

  const getInputClass = (isCorrect: boolean | null) => {
    if (isCorrect === true) {
      return 'border-green-500 ring-green-500 focus-visible:ring-green-500';
    }
    if (isCorrect === false) {
      return 'border-red-500 ring-red-500 focus-visible:ring-red-500';
    }
    return '';
  };

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span>Score: {score}</span>
            </div>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <HelpCircle className="h-6 w-6 text-muted-foreground" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Guess the common Pokemon type for each row and column.</p>
                </TooltipContent>
            </Tooltip>
          </div>
          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
              <div />
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={`col-input-${i}`} className="relative">
                    <Input
                      name={`col-${i}`}
                      aria-label={`Column ${i + 1} guess`}
                      placeholder={`Col ${i + 1}`}
                      className={cn('text-center font-semibold', getInputClass(state.colResults[i]))}
                      disabled={state.isCorrect}
                    />
                    {state.colResults[i] === true && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    {state.colResults[i] === false && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                  </div>
                ))}
              </div>

              <div className="grid grid-rows-3 gap-2 sm:gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={`row-input-${i}`} className="relative flex items-center h-full">
                    <Input
                      name={`row-${i}`}
                      aria-label={`Row ${i + 1} guess`}
                      placeholder={`Row ${i + 1}`}
                      className={cn('w-24 font-semibold', getInputClass(state.rowResults[i]))}
                      disabled={state.isCorrect}
                    />
                     {state.rowResults[i] === true && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                     {state.rowResults[i] === false && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                  </div>
                ))}
              </div>

              <div className={cn("grid grid-cols-3 gap-2 sm:gap-4 transition-opacity duration-700 ease-in-out", showPuzzle ? 'opacity-100' : 'opacity-0')}>
                {puzzle.grid.flat().map((pokemon, i) => (
                  <div key={pokemon?.id || i} className="aspect-square w-full">
                    {pokemon ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                            <Image
                              src={pokemon.spriteUrl}
                              alt={pokemon.name}
                              fill
                              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
                              className="object-contain transition-transform duration-300 hover:scale-110"
                            />
                           </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="capitalize">{pokemon.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {state.isCorrect ? (
                <div className="text-center space-y-4">
                    <p className="text-2xl font-bold text-green-600">You solved it!</p>
                    <Button asChild size="lg" className="w-full">
                        <a href="/">Play Next Puzzle</a>
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
