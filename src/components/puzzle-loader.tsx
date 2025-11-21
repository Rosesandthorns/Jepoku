
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
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
}

export function PuzzleLoader({ getPuzzleAction, checkAnswersAction }: PuzzleLoaderProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // We start with a puzzle of null, so this effect will run on mount.
    if (!puzzle) {
      const getPuzzle = () => {
        startTransition(async () => {
          const newPuzzle = await getPuzzleAction();
          if (newPuzzle) {
            setPuzzle(newPuzzle);
          }
        });
      };
      
      // Initial attempt
      getPuzzle();

      // Set up interval for retries if the initial attempt fails
      const interval = setInterval(() => {
        // We need to check inside the interval if the puzzle has been found
        // to know if we should clear the interval.
        setPuzzle(currentPuzzle => {
            if (currentPuzzle) {
                clearInterval(interval);
                return currentPuzzle;
            }
            // If puzzle is still null, and a fetch is not pending, try again.
            if (!isPending) {
                getPuzzle();
            }
            return null;
        });
      }, 1000); // Retry every 1 second

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

  return (
    <GameBoard puzzle={puzzle} checkAnswersAction={checkAnswersAction} />
  );
}
