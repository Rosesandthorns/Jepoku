
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Send, Trophy, HelpCircle, ArrowDown, ArrowUp, Shuffle } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';

import type { Puzzle, ValidationResult, JepokuMode, Pokemon, OrderBy } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getInitialState(puzzle: Puzzle): ValidationResult {
  return {
    rowResults: [],
    colResults: [],
    isCriteriaCorrect: false,
    isCorrect: false,
    accuracy: 0,
  }
}

interface OrderModeBoardProps {
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
      {pending ? 'Checking...' : 'Submit Order'}
      <Send className="ml-2 h-4 w-4" />
    </Button>
  );
}

const ItemType = 'POKEMON';

interface DraggablePokemonProps {
  pokemon: Pokemon;
  index: number;
  movePokemon: (dragIndex: number, hoverIndex: number) => void;
}

const DraggablePokemon: FC<DraggablePokemonProps> = ({ pokemon, index, movePokemon }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ handlerId }, drop] = useDrop<
    DraggablePokemonProps,
    void,
    { handlerId: Identifier | null }
  >({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DraggablePokemonProps, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      movePokemon(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => ({ id: pokemon.id, index }),
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center p-2 bg-gray-700 rounded-lg cursor-move transition-all"
    >
        <div className="flex-shrink-0 w-16 h-16 relative">
            <Image src={pokemon.spriteUrl} alt={pokemon.name} fill sizes="64px" className="object-contain" />
        </div>
        <p className="ml-4 capitalize font-semibold text-lg">{pokemon.name}</p>
    </div>
  );
};


function getOrderText(orderBy: OrderBy, orderDirection: 'asc' | 'desc') {
    const direction = orderDirection === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest';
    let stat = '';
    switch(orderBy) {
        case 'pokedex': stat = 'Pokédex Number'; break;
        case 'bst': stat = 'Base Stat Total'; break;
        case 'special-attack': stat = 'Special Attack'; break;
        case 'special-defense': stat = 'Special Defense'; break;
        default: stat = orderBy.charAt(0).toUpperCase() + orderBy.slice(1);
    }
    return `Order by ${stat}, ${direction}`;
}


export const OrderModeBoard: FC<OrderModeBoardProps> = ({ puzzle, checkAnswersAction, mode }) => {
  const [state, formAction] = useActionState(checkAnswersAction, getInitialState(puzzle));
  const [score, setScore] = useState(0);
  const [playerOrder, setPlayerOrder] = useState<Pokemon[]>(puzzle.pokemonList!);

  const puzzleId = useMemo(() => puzzle.pokemonList?.map(p => p.id).sort().join('-') ?? '', [puzzle]);

  useEffect(() => {
    const savedScore = localStorage.getItem('jepokuScore');
    if (savedScore) {
      setScore(parseInt(savedScore, 10));
    }
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

  const movePokemon = (dragIndex: number, hoverIndex: number) => {
    setPlayerOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, draggedItem);
      return newOrder;
    });
  };

  const accuracyPercent = state.accuracy ? Math.round(state.accuracy * 100) : 0;
  
  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl mx-auto border-gray-700 bg-gray-800/50 text-white">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Order Mode</CardTitle>
              <CardDescription className="text-gray-300 flex items-center gap-2 mt-2">
                {puzzle.orderDirection === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                {getOrderText(puzzle.orderBy!, puzzle.orderDirection!)}
              </CardDescription>
            </div>
            <div className="text-right">
               <div className="flex items-center gap-2 text-xl font-bold">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <span>Score: {score}</span>
                </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className='text-gray-300 hover:text-white hover:bg-gray-700'>
                            <HelpCircle className="h-6 w-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Drag and drop the Pokémon into the correct order. 80% accuracy to pass.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="puzzle" value={JSON.stringify(puzzle)} />
            <input type="hidden" name="playerOrder" value={JSON.stringify(playerOrder.map(p => p.id))} />
            
            <div className="space-y-2">
                {playerOrder.map((pokemon, i) => (
                    <DraggablePokemon key={pokemon.id} index={i} pokemon={pokemon} movePokemon={movePokemon} />
                ))}
            </div>

            <div className="mt-6">
              {state.isCorrect !== undefined ? (
                <div className="text-center space-y-4">
                    <p className={`text-2xl font-bold ${state.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                        {state.isCorrect ? "You passed!" : "Not quite!"}
                    </p>
                    <p className="text-lg">Your accuracy was {accuracyPercent}%. (80% needed to pass)</p>
                    <Button asChild size="lg" className="w-full">
                        <a href={`/?mode=${mode}`}>Play Next Puzzle</a>
                    </Button>
                </div>
              ) : (
                <SubmitButton isCorrect={false} />
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
