
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
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
  getPuzzleAction: (mode: JepokuMode) => Promise<Puzzle | null>;
  checkAnswersAction: (
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
  mode: JepokuMode;
}

export function PuzzleLoader({ getPuzzleAction, checkAnswersAction, mode }: PuzzleLoaderProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Reset puzzle when mode changes
    setPuzzle(null);

    startTransition(async () => {
      const newPuzzle = await getPuzzleAction(mode);
      setPuzzle(newPuzzle);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // We only want to re-run this when the mode changes.


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

  return (
    <GameBoard puzzle={puzzle} checkAnswersAction={checkAnswersAction} mode={mode} />
  );
}
