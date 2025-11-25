
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Check, Send, Trophy, X, HelpCircle } from 'lucide-react';

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
import { NORMAL_CRITERIA, HARD_CRITERIA } from '@/lib/criteria';


function getInitialState(puzzle: Puzzle): ValidationResult {
  const size = puzzle.grid.length;
  return {
    rowResults: Array(size).fill(null),
    colResults: Array(size).fill(null),
    rowResultsHard: Array(size).fill(null),
    colResultsHard: Array(size).fill(null),
    isCriteriaCorrect: false,
    isCorrect: false,
  }
}

interface DualModeBoardProps {
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
      {pending ? 'Checking...' : 'Submit All Guesses'}
      <Send className="ml-2 h-4 w-4" />
    </Button>
  );
}

export const DualModeBoard: FC<DualModeBoardProps> = ({ puzzle, checkAnswersAction, mode }) => {
  const [state, formAction] = useActionState(checkAnswersAction, getInitialState(puzzle));

  const [score, setScore] = useState(0);
  const [showPuzzle, setShowPuzzle] = useState(false);
  
  const puzzleId = useMemo(() => puzzle.grid.flat().map(p => p?.id).join('-'), [puzzle]);
  const gridSize = puzzle.grid.length;

  useEffect(() => {
    const savedScore = localStorage.getItem('jepokuScore');
    if (savedScore) {
      setScore(parseInt(savedScore, 10));
    }
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

  const getSelectClass = (isCorrect: boolean | null) => {
    if (isCorrect === true) return 'border-green-500 ring-green-500';
    if (isCorrect === false) return 'border-red-500 ring-red-500';
    return '';
  };
  
  const renderResultIcon = (isCorrect: boolean | null) => {
    if (isCorrect === true) return <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />;
    if (isCorrect === false) return <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />;
    return null;
  };

  return (
    <TooltipProvider>
      <Card className="w-max">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span>Score: {score}</span>
            </div>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <HelpCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Guess TWO criteria for each row and column: one Normal, one Hard.</p>
                </TooltipContent>
            </Tooltip>
          </div>
          <form action={formAction} className="space-y-6">
             <input type="hidden" name="puzzle" value={JSON.stringify(puzzle)} />
            <div className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-2 sm:gap-4">
              {/* Corner Gaps */}
              <div/>
              <div className="grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                    <div key={`col-inputs-${i}`} className="space-y-2">
                        {/* Hard Column */}
                        <div className="relative">
                            <Select name={`col-hard-${i}`} disabled={state.isCorrect}>
                            <SelectTrigger className={cn('font-semibold bg-red-100', getSelectClass(state.colResultsHard?.[i]))}>
                                <SelectValue placeholder={`Col ${i + 1} (Hard)`} />
                            </SelectTrigger>
                            <SelectContent>
                                {HARD_CRITERIA.map((crit) => ( <SelectItem key={crit} value={crit}>{crit}</SelectItem> ))}
                            </SelectContent>
                            </Select>
                            {renderResultIcon(state.colResultsHard?.[i])}
                        </div>
                        {/* Normal Column */}
                        <div className="relative">
                            <Select name={`col-${i}`} disabled={state.isCorrect}>
                            <SelectTrigger className={cn('font-semibold', getSelectClass(state.colResults[i]))}>
                                <SelectValue placeholder={`Col ${i + 1} (Normal)`} />
                            </SelectTrigger>
                            <SelectContent>
                                {NORMAL_CRITERIA.map((crit) => ( <SelectItem key={crit} value={crit}>{crit}</SelectItem> ))}
                            </SelectContent>
                            </Select>
                             {renderResultIcon(state.colResults[i])}
                        </div>
                    </div>
                ))}
              </div>

              {/* Row Inputs */}
              <div className="grid gap-2 sm:gap-4" style={{ gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`row-inputs-${i}`} className="flex items-center h-full gap-2">
                    {/* Hard Row */}
                    <div className="relative">
                        <Select name={`row-hard-${i}`} disabled={state.isCorrect}>
                            <SelectTrigger className={cn('w-28 font-semibold bg-red-100', getSelectClass(state.rowResultsHard?.[i]))}>
                                <SelectValue placeholder={`Row ${i + 1} (H)`} />
                            </SelectTrigger>
                            <SelectContent>{HARD_CRITERIA.map((crit) => ( <SelectItem key={crit} value={crit}>{crit}</SelectItem> ))}</SelectContent>
                        </Select>
                        {renderResultIcon(state.rowResultsHard?.[i])}
                    </div>
                     {/* Normal Row */}
                     <div className="relative">
                        <Select name={`row-${i}`} disabled={state.isCorrect}>
                            <SelectTrigger className={cn('w-28 font-semibold', getSelectClass(state.rowResults[i]))}>
                                <SelectValue placeholder={`Row ${i + 1} (N)`} />
                            </SelectTrigger>
                            <SelectContent>{NORMAL_CRITERIA.map((crit) => ( <SelectItem key={crit} value={crit}>{crit}</SelectItem> ))}</SelectContent>
                        </Select>
                        {renderResultIcon(state.rowResults[i])}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pokemon Grid */}
              <div className={cn("grid gap-2 sm:gap-4 transition-opacity duration-700 ease-in-out", showPuzzle ? 'opacity-100' : 'opacity-0')} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {puzzle.grid.flat().map((pokemon, i) => (
                    <div key={pokemon?.id || i} className="aspect-square w-full sm:w-24 md:w-28 lg:w-32 rounded-lg">
                      {pokemon ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                              <Image src={pokemon.spriteUrl} alt={pokemon.name} fill sizes="(max-width: 640px) 15vw, 128px" className="object-contain transition-transform duration-300 hover:scale-110"/>
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
