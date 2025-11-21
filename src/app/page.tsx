import { GameBoard } from '@/components/game-board';
import { generatePuzzle } from '@/lib/puzzle-generator';
import type { ValidationResult } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const revalidate = 0;

export default async function HomePage() {
  const puzzle = await generatePuzzle();

  if (!puzzle) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertTriangle className="text-destructive" />
              Generation Error
            </CardTitle>
            <CardDescription>
              We couldn't generate a new puzzle. This can happen sometimes due to the complexity of finding a valid grid.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p>Please try again by refreshing the page.</p>
            <Button asChild>
              <a href="/">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function checkAnswers(
    prevState: ValidationResult,
    formData: FormData
  ): Promise<ValidationResult> {
    'use server';

    const guesses = {
      rows: [
        formData.get('row-0') as string,
        formData.get('row-1') as string,
        formData.get('row-2') as string,
      ],
      cols: [
        formData.get('col-0') as string,
        formData.get('col-1') as string,
        formData.get('col-2') as string,
      ],
    };

    const rowResults = puzzle.rowAnswers.map((answer, i) => 
      guesses.rows[i]?.trim().toLowerCase() === answer.toLowerCase()
    );
    const colResults = puzzle.colAnswers.map((answer, i) =>
      guesses.cols[i]?.trim().toLowerCase() === answer.toLowerCase()
    );

    const isCorrect = [...rowResults, ...colResults].every(Boolean);

    return {
      rowResults,
      colResults,
      isCorrect,
    };
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-5xl font-bold tracking-tighter text-primary sm:text-6xl font-headline">
            Jepoku
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            A reverse Pokedoku. Can you guess the common trait for each row and column?
          </p>
        </header>

        <GameBoard puzzle={puzzle} checkAnswersAction={checkAnswers} />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">PokeAPI</a>. All Pokémon content is &copy; Nintendo, Game Freak, and The Pokémon Company.</p>
        </footer>
      </div>
    </main>
  );
}
