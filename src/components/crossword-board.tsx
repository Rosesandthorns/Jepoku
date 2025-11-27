
'use client';

import { useState, useRef, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import type { Puzzle, JepokuMode, CrosswordValidationResult } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrosswordBoardProps {
    getPuzzleAction: (mode: JepokuMode) => Promise<Puzzle | null>;
    checkAnswersAction: (prevState: CrosswordValidationResult, payload: FormData) => Promise<CrosswordValidationResult>;
    mode: JepokuMode;
}

const getInitialState = (): CrosswordValidationResult => ({
    isCorrect: false,
    letterResults: undefined,
});

function SubmitButton({ isCorrect }: { isCorrect: boolean }) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending || isCorrect} className="w-full" size="lg">
            {pending ? 'Checking...' : isCorrect ? 'Solved!' : 'Check Puzzle'}
            <Check className="ml-2 h-4 w-4" />
        </Button>
    );
}

export function CrosswordBoard({ getPuzzleAction, checkAnswersAction, mode }: CrosswordBoardProps) {
    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [isPending, startTransition] = useState(true);
    const [state, formAction] = useActionState(checkAnswersAction, getInitialState());

    const [playerAnswers, setPlayerAnswers] = useState<Record<string, string>>({});
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        startTransition(true);
        getPuzzleAction(mode).then(newPuzzle => {
            setPuzzle(newPuzzle);
            startTransition(false);
        });
    }, [getPuzzleAction, mode]);

    if (isPending || !puzzle || !puzzle.crosswordGrid || !puzzle.crosswordClues) {
        return (
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" />
                        Generating Crossword
                    </CardTitle>
                    <CardDescription>Finding Pokémon that fit together just right...</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const { crosswordGrid, crosswordClues } = puzzle;
    const { letterResults, isCorrect } = state;

    const cluesWithNumbers = [...crosswordClues.across, ...crosswordClues.down];
    const clueNumberMap: Record<string, number> = {};
    cluesWithNumbers.forEach(c => {
        clueNumberMap[`${c.row}-${c.col}`] = c.number;
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, row: number, col: number) => {
        const { value } = e.target;
        const upperValue = value.toUpperCase();
        
        // This is a simplified input handling. A real crossword would be more complex.
        const gridKey = `${row}-${col}`;
        setPlayerAnswers(prev => ({...prev, [gridKey]: upperValue}));
        
        if (upperValue.length > 0) {
            // This is a naive next-input-focus logic.
            const nextKey = `${row}-${col+1}`;
            inputRefs.current[nextKey]?.focus();
        }
    };
    
    const handleFormSubmit = (formData: FormData) => {
        const fullPlayerAnswers: Record<string, string> = {};
        [...crosswordClues.across, ...crosswordClues.down].forEach(clue => {
            let answer = '';
            for (let i = 0; i < clue.length; i++) {
                let r = clue.row;
                let c = clue.col;
                if (clue.direction === 'across') c += i;
                else r += i;
                answer += playerAnswers[`${r}-${c}`] || ' ';
            }
            fullPlayerAnswers[`${clue.direction}-${clue.number}`] = answer;
        });
        
        formData.set('playerAnswers', JSON.stringify(fullPlayerAnswers));
        formAction(formData);
    }


    return (
        <Card className="w-full max-w-4xl mx-auto border-gray-700 bg-gray-800/50 text-white p-4">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Crossword Mode</CardTitle>
                <CardDescription className="text-gray-300">Fill in the Pokémon names based on their types.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <div className="grid bg-gray-900 p-2 rounded-lg" style={{ gridTemplateColumns: `repeat(${crosswordGrid.length}, minmax(0, 1fr))` }}>
                            {crosswordGrid.map((row, r) =>
                                row.map((cell, c) => {
                                    const key = `${r}-${c}`;
                                    const clueNumber = clueNumberMap[key];
                                    const isCorrectLetter = letterResults?.[r]?.[c] === true;
                                    const isIncorrectLetter = letterResults?.[r]?.[c] === false;

                                    if (cell === null) {
                                        return <div key={key} className="aspect-square bg-gray-900" />;
                                    }
                                    return (
                                        <div key={key} className="relative aspect-square">
                                            {clueNumber && <div className="absolute top-0 left-0.5 text-xs text-gray-400 font-bold">{clueNumber}</div>}
                                            <input
                                                ref={el => inputRefs.current[key] = el}
                                                type="text"
                                                maxLength={1}
                                                onChange={(e) => handleInputChange(e, r, c)}
                                                disabled={isCorrect}
                                                className={cn(
                                                    "w-full h-full text-center uppercase font-bold text-lg bg-gray-200 text-black rounded-sm focus:outline-none focus:ring-2 focus:ring-primary",
                                                    isCorrect && "bg-green-200 text-green-800",
                                                    isCorrectLetter && "bg-green-200 text-green-800",
                                                    isIncorrectLetter && "bg-red-200 text-red-800"
                                                )}
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <h3 className="font-bold text-lg mb-2 border-b border-gray-600">Across</h3>
                            <ul className="space-y-1">
                                {crosswordClues.across.map(c => <li key={c.number}><b>{c.number}.</b> {c.clue}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-2 border-b border-gray-600">Down</h3>
                            <ul className="space-y-1">
                                {crosswordClues.down.map(c => <li key={c.number}><b>{c.number}.</b> {c.clue}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                <form action={handleFormSubmit} className="mt-6">
                    <input type="hidden" name="puzzle" value={JSON.stringify(puzzle)} />
                    {isCorrect ? (
                         <div className="text-center space-y-4">
                            <p className="text-2xl font-bold text-green-400">You solved it!</p>
                            <Button asChild size="lg" className="w-full">
                                <a href={`/?mode=${mode}`}>Play Another Crossword</a>
                            </Button>
                        </div>
                    ) : (
                        <SubmitButton isCorrect={isCorrect} />
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
