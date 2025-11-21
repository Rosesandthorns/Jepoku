
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Puzzle, ValidationResult } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PuzzleLoaderProps {
  getPuzzleAction: () => Promise<Puzzle | null>;
  checkAnswersAction: (
    puzzle: Puzzle,
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
}

export function PuzzleLoader({ getPuzzleAction, checkAnswersAction }: PuzzleLoaderProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!puzzle) {
      const getPuzzle = () => {
        startTransition(async () => {
          const newPuzzle = await getPuzzleAction();
          if (newPuzzle) {
            setPuzzle(newPuzzle);
          }
        });
      };
      
      getPuzzle();

      const interval = setInterval(() => {
        setPuzzle(currentPuzzle => {
            if (currentPuzzle) {
                clearInterval(interval);
                return currentPuzzle;
            }
            if (!isPending) {
                getPuzzle();
            }
            return null;
        });
      }, 1000); 

      return () => clearInterval(interval);
    }
  }, [getPuzzleAction, isPending, puzzle]);

  if (!puzzle) {
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

  const boundCheckAnswersAction = checkAnswersAction.bind(null, puzzle);

  return (
    <GameBoard puzzle={puzzle} checkAnswersAction={boundCheckAnswersAction} />
  );
}
