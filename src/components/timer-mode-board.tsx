
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import type { Puzzle, ValidationResult, JepokuMode } from '@/lib/definitions';
import { GameBoard } from '@/components/game-board';
import { Button } from '@/components/ui/button';
import { Loader2, TimerIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TimerModeBoardProps {
  getPuzzleAction: (mode: JepokuMode) => Promise<Puzzle | null>;
  checkAnswersAction: (
    state: ValidationResult,
    payload: FormData
  ) => Promise<ValidationResult>;
}

const TOTAL_TIME = 60;
const PUZZLES_TO_WIN = 5;

export function TimerModeBoard({ getPuzzleAction, checkAnswersAction }: TimerModeBoardProps) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isFinished, setIsFinished] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchPuzzle = useCallback(() => {
    startTransition(async () => {
      const newPuzzle = await getPuzzleAction('timer');
      if (newPuzzle) {
        setPuzzles(prev => [...prev, newPuzzle]);
      }
    });
  }, [getPuzzleAction]);

  useEffect(() => {
    // Fetch initial puzzle
    fetchPuzzle();
  }, [fetchPuzzle]);

  useEffect(() => {
    if (puzzles.length > 0 && !isFinished) {
      const timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setIsFinished(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [puzzles.length, isFinished]);
  
  const handleSolve = () => {
    const newSolvedCount = solvedCount + 1;
    setSolvedCount(newSolvedCount);

    if (newSolvedCount >= PUZZLES_TO_WIN) {
        setIsFinished(true);
        return;
    }

    setCurrentPuzzleIndex(prev => prev + 1);
    // Fetch the next puzzle if we haven't already
    if (puzzles.length <= newSolvedCount) {
        fetchPuzzle();
    }
  };

  const restartGame = () => {
    setPuzzles([]);
    setCurrentPuzzleIndex(0);
    setSolvedCount(0);
    setTimeLeft(TOTAL_TIME);
    setIsFinished(false);
    fetchPuzzle();
  }

  const currentPuzzle = puzzles[currentPuzzleIndex];

  if (puzzles.length === 0 && isPending) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Getting Ready...
          </CardTitle>
          <CardDescription>Timer mode is about to begin!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isFinished) {
      return (
        <Card className="text-center w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>
                    {solvedCount >= PUZZLES_TO_WIN ? "Congratulations!" : "Time's Up!"}
                </CardTitle>
                <CardDescription>
                    You solved {solvedCount} out of {PUZZLES_TO_WIN} puzzles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold mb-4">{solvedCount >= PUZZLES_TO_WIN ? "You Win!" : "Good Try!"}</p>
                <Button onClick={restartGame} size="lg">Play Again</Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="w-full">
        <Card className="mb-4 w-full max-w-sm mx-auto text-white bg-gray-800/80 border-gray-700">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 font-bold">
                        <TimerIcon className="h-5 w-5" />
                        <span>{timeLeft}s</span>
                    </div>
                    <div className="font-bold">
                        {solvedCount} / {PUZZLES_TO_WIN} Solved
                    </div>
                </div>
                <Progress value={(timeLeft / TOTAL_TIME) * 100} className="h-2 [&>div]:bg-primary" />
            </CardContent>
        </Card>

        {isPending && !currentPuzzle ? (
             <Card className="text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    Loading Next Puzzle...
                    </CardTitle>
                </CardHeader>
            </Card>
        ) : currentPuzzle ? (
            <GameBoard
                key={currentPuzzleIndex}
                puzzle={currentPuzzle}
                checkAnswersAction={checkAnswersAction}
                mode="timer"
                onSolve={handleSolve}
            />
        ) : null}
    </div>
  );
}
