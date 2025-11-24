
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { MissMatchedBoard } from '@/components/miss-matched-board';
import { TimerModeBoard } from '@/components/timer-mode-board';
import { OrderModeBoard } from '@/components/order-mode-board';
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
    if (mode === 'timer') {
      setPuzzle(null); // Timer mode manages its own puzzle loading
      return;
    }
    // Reset puzzle when mode changes
    setPuzzle(null);

    startTransition(async () => {
      const newPuzzle = await getPuzzleAction(mode);
      setPuzzle(newPuzzle);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // We only want to re-run this when the mode changes.

  if (mode === 'timer') {
    return <TimerModeBoard getPuzzleAction={getPuzzleAction} checkAnswersAction={checkAnswersAction} />;
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
    return <MissMatchedBoard puzzle={puzzle} checkAnswersAction={checkAnswersAction} mode={mode} />;
  }

  if (mode === 'order') {
    return (
      <DndProvider backend={HTML5Backend}>
        <OrderModeBoard puzzle={puzzle} checkAnswersAction={checkAnswersAction} mode={mode} />
      </DndProvider>
    );
  }

  return (
    <GameBoard puzzle={puzzle} checkAnswersAction={checkAnswersAction} mode={mode} />
  );
}
