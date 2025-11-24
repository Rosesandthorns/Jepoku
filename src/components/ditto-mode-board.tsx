
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface DittoModeBoardProps {
  getPuzzleAction: (mode: JepokuMode) => Promise<Puzzle | null>;
  checkAnswersAction: (
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
}

const DITTO_TRANSFORM_TIME = 3000; // 3 seconds

export function DittoModeBoard({ getPuzzleAction, checkAnswersAction }: DittoModeBoardProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'transforming' | 'finished'>('playing');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const savedHighScore = localStorage.getItem('dittoHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
    fetchPuzzle();
  }, []);

  const fetchPuzzle = useCallback(() => {
    startTransition(async () => {
      const newPuzzle = await getPuzzleAction('ditto');
      setPuzzle(newPuzzle);
      setGameState('playing');
    });
  }, [getPuzzleAction]);

  const handleSolve = () => {
    setGameState('transforming');
    setTimeout(() => {
      setStreak(prev => prev + 1);
      fetchPuzzle();
    }, DITTO_TRANSFORM_TIME);
  };
  
  const handleFail = () => {
    if (streak > highScore) {
      setHighScore(streak);
      localStorage.setItem('dittoHighScore', streak.toString());
    }
    setGameState('finished');
  }

  const restartGame = () => {
    setStreak(0);
    setGameState('playing');
    fetchPuzzle();
  }

  if (isPending && !puzzle && gameState !== 'finished') {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Getting Ready...
          </CardTitle>
          <CardDescription>Ditto mode is about to begin!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (gameState === 'finished') {
      return (
        <Card className="text-center w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Game Over!</CardTitle>
                <CardDescription>You made a mistake.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-lg">Your final streak was:</p>
                <p className="text-6xl font-bold">{streak}</p>
                <p className="text-sm text-muted-foreground">High Score: {highScore}</p>
                <Button onClick={restartGame} size="lg">Play Again</Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="w-full">
        <Card className="mb-4 w-full max-w-sm mx-auto text-white bg-gray-800/80 border-gray-700">
            <CardContent className="p-4">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Streak: {streak}</span>
                    <span>High Score: {highScore}</span>
                </div>
            </CardContent>
        </Card>

        {isPending && gameState === 'playing' ? (
             <Card className="text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    Loading Next Puzzle...
                    </CardTitle>
                </CardHeader>
            </Card>
        ) : puzzle ? (
            <GameBoard
                key={streak} // Force re-render for new puzzle
                puzzle={puzzle}
                checkAnswersAction={checkAnswersAction}
                mode="ditto"
                onSolve={handleSolve}
                onFail={handleFail}
                isDittoTransform={gameState === 'transforming'}
            />
        ) : null}
         {gameState === 'transforming' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <p className="text-white text-4xl font-bold animate-pulse">Transforming...</p>
            </div>
        )}
    </div>
  );
}
