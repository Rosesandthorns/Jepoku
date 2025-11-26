
'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Puzzle, JepokuMode } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { MissMatchedBoard } from '@/components/miss-matched-board';
import { TimerModeBoard } from '@/components/timer-mode-board';
import { OrderModeBoard } from '@/components/order-mode-board';
import { DittoModeBoard } from '@/components/ditto-mode-board';
import { DualModeBoard } from '@/components/dual-mode-board';
import { DexModeBoard } from '@/components/dex-mode-board';
import { CriteriaModeBoard } from '@/components/criteria-mode-board';
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
import { getNewPuzzle, checkAnswers, getPokemonNames } from '@/lib/actions';


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
    (modeParam === 'ditto' ? 'ditto' : 
    (modeParam === 'sprite' ? 'sprite' : 
    (modeParam === 'dex' ? 'dex' : 
    (modeParam === 'dual' ? 'dual' : 
    (modeParam === 'criteria' ? 'criteria' : 'normal')))))))))))));
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (['timer', 'ditto', 'criteria'].includes(mode)) {
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
  
  if (mode === 'criteria') {
    return <CriteriaModeBoard getPuzzleAction={getNewPuzzle} getPokemonNamesAction={getPokemonNames} />;
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
  
  if (mode === 'dual') {
    return <DualModeBoard puzzle={puzzle} checkAnswersAction={checkAnswers} mode={mode} />;
  }
  
  if (mode === 'dex') {
    return <DexModeBoard puzzle={puzzle} checkAnswersAction={checkAnswers} mode={mode} />;
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
