
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import Image from 'next/image';
import type { Puzzle, JepokuMode } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Loader2, TimerIcon, HelpCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Combobox } from '@/components/ui/combobox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CriteriaModeBoardProps {
  getPuzzleAction: (mode: JepokuMode) => Promise<Puzzle | null>;
  getPokemonNamesAction: () => Promise<{ value: string; label: string }[]>;
}

const TOTAL_TIME = 120; // 2 minutes
const CLUE_INTERVAL = 15; // 15 seconds

export function CriteriaModeBoard({ getPuzzleAction, getPokemonNamesAction }: CriteriaModeBoardProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [pokemonNames, setPokemonNames] = useState<{ value: string; label: string }[]>([]);
  const [guess, setGuess] = useState('');
  const [revealedClues, setRevealedClues] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isPending, startTransition] = useTransition();

  const fetchPuzzle = useCallback(() => {
    startTransition(async () => {
      const newPuzzle = await getPuzzleAction('criteria');
      setPuzzle(newPuzzle);
      resetGame();
    });
  }, [getPuzzleAction]);

  useEffect(() => {
    getPokemonNamesAction().then(setPokemonNames);
    fetchPuzzle();
  }, [fetchPuzzle, getPokemonNamesAction]);

  useEffect(() => {
    if (gameState === 'playing' && puzzle) {
      const gameTimer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(gameTimer);
            setGameState('lost');
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      const clueTimer = setInterval(() => {
        setRevealedClues(prev => {
            if (prev < (puzzle.clues?.length ?? 0)) {
                return prev + 1;
            }
            clearInterval(clueTimer);
            return prev;
        });
      }, CLUE_INTERVAL * 1000);

      return () => {
        clearInterval(gameTimer);
        clearInterval(clueTimer);
      };
    }
  }, [gameState, puzzle]);
  
  const resetGame = () => {
    setGameState('playing');
    setTimeLeft(TOTAL_TIME);
    setRevealedClues(1);
    setGuess('');
  };

  const handleRestart = () => {
    setPuzzle(null);
    fetchPuzzle();
  };

  const handleGuess = () => {
    if (!guess || !puzzle?.targetPokemon) return;
    if (guess.toLowerCase() === puzzle.targetPokemon.name.toLowerCase()) {
      setGameState('won');
    } else {
      // Optional: Add feedback for wrong guess, e.g., a toast notification
      setGuess('');
    }
  };

  if (isPending || !puzzle) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Preparing Criteria Mode
          </CardTitle>
          <CardDescription>Getting a secret Pokémon ready for you to guess.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { targetPokemon, clues } = puzzle;
  const isFinished = gameState === 'won' || gameState === 'lost';

  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl mx-auto border-gray-700 bg-gray-800/50 text-white">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl">Criteria Mode</CardTitle>
                <CardDescription className="text-gray-300 mt-1">Guess the Pokémon based on the clues!</CardDescription>
            </div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className='text-gray-300 hover:text-white hover:bg-gray-700'>
                        <HelpCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>A new clue is revealed every 15 seconds. Guess the Pokémon!</p>
                </TooltipContent>
            </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-2 font-mono text-lg">
                <div className="flex items-center gap-2">
                    <TimerIcon className="h-5 w-5" />
                    <span>{timeLeft}s</span>
                </div>
            </div>
            <Progress value={(timeLeft / TOTAL_TIME) * 100} className="h-2 [&>div]:bg-primary" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clues?.slice(0, revealedClues).map((clue, index) => (
                <div key={index} className="p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-400">{clue.label}</p>
                    <p className="text-lg font-semibold">{clue.value}</p>
                </div>
            ))}
        </div>
        
        {isFinished && targetPokemon && (
            <div className="p-4 bg-gray-900/70 rounded-lg flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <Image src={targetPokemon.spriteUrl} alt={targetPokemon.name} fill sizes="128px" className="object-contain" />
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-lg text-gray-300">The Pokémon was:</p>
                    <p className="text-3xl font-bold capitalize">{targetPokemon.name.replace('-', ' ')}</p>
                </div>
            </div>
        )}

      </CardContent>
      <CardFooter>
        <div className="w-full space-y-4">
          {isFinished ? (
            <div className="text-center">
              <p className="text-3xl font-bold mb-4">
                {gameState === 'won' ? 'You got it!' : "Time's up!"}
              </p>
              <Button onClick={handleRestart} size="lg">Play Again</Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Combobox 
                options={pokemonNames}
                value={guess}
                onChange={setGuess}
                placeholder="Guess a Pokémon..."
                searchPlaceholder="Search Pokémon..."
                noResultsMessage="No Pokémon found."
                disabled={isFinished}
              />
              <Button onClick={handleGuess} disabled={!guess || isFinished} className="sm:w-auto">Submit Guess</Button>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}
