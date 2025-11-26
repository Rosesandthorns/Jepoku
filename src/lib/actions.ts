
'use server';

import type { Puzzle, ValidationResult, JepokuMode, Pokemon } from '@/lib/definitions';
import { generatePuzzle } from '@/lib/puzzle-generator';
import { lcs } from '@/lib/lcs';
import { getPokemonCriteria } from '@/lib/criteria';
import { revalidateTag } from 'next/cache';
import { POKEMON_CACHE_TAG, getPokemonTypes as getTypesFromPokedex } from './pokedex';

export async function getNewPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
  const effectiveMode = mode === 'timer' ? 'easy' : mode;
  return generatePuzzle(effectiveMode);
}

export async function forceRefreshData() {
  console.log('Forcing cache revalidation for all Pokemon data...');
  revalidateTag(POKEMON_CACHE_TAG);
  console.log('Cache revalidation triggered.');
}

export async function getTypes(): Promise<string[]> {
    return getTypesFromPokedex();
}


export async function checkAnswers(
  prevState: ValidationResult,
  formData: FormData
): Promise<ValidationResult> {
  const puzzleString = formData.get('puzzle') as string;
  if (!puzzleString) {
    return {
        rowResults: [],
        colResults: [],
        isCriteriaCorrect: false,
        isCorrect: false,
    };
  }

  const puzzle: Puzzle = JSON.parse(puzzleString);
  const gridSize = puzzle.grid.length;
  const mode = puzzle.mode;

  if (mode === 'order') {
    const playerOrderString = formData.get('playerOrder') as string;
    const playerOrderIds: number[] = JSON.parse(playerOrderString);
    const correctOrderIds = puzzle.correctOrderIds!;
    const accuracy = lcs(playerOrderIds, correctOrderIds) / correctOrderIds.length;
    const isCorrect = accuracy >= 0.8;

    return {
        rowResults: [],
        colResults: [],
        isCriteriaCorrect: false,
        isCorrect,
        accuracy,
    };
  }
  
  if (mode === 'dual') {
    const rowGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`row-${i}`) as string);
    const colGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`col-${i}`) as string);
    const rowGuessesHard = Array.from({ length: gridSize }, (_, i) => formData.get(`row-hard-${i}`) as string);
    const colGuessesHard = Array.from({ length: gridSize }, (_, i) => formData.get(`col-hard-${i}`) as string);

    const rowResults = rowGuesses.map((guess, index) => guess ? guess === puzzle.rowAnswers[index] : null);
    const colResults = colGuesses.map((guess, index) => guess ? guess === puzzle.colAnswers[index] : null);
    const rowResultsHard = rowGuessesHard.map((guess, index) => guess ? guess === puzzle.rowAnswersHard![index] : null);
    const colResultsHard = colGuessesHard.map((guess, index) => guess ? guess === puzzle.colAnswersHard![index] : null);
    
    const isCriteriaCorrect = [...rowResults, ...colResults, ...rowResultsHard, ...colResultsHard].every(res => res === true);
    
    return {
      rowResults,
      colResults,
      rowResultsHard,
      colResultsHard,
      isCriteriaCorrect,
      isCorrect: isCriteriaCorrect,
    };
  }

  const rowGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`row-${i}`) as string);
  const colGuesses = Array.from({ length: gridSize }, (_, i) => formData.get(`col-${i}`) as string);

  let rowResults: (boolean | null)[] = [];
  let colResults: (boolean | null)[] = [];
  let isCriteriaCorrect = false;
  let isPlacementCorrect = false;
  let isOddOneOutSelectionCorrect = false;
  let isCorrect = false;

  if (mode === 'miss-matched') {
    const playerGridString = formData.get('playerGrid') as string;
    const playerGrid: (Pokemon | null)[][] = JSON.parse(playerGridString);

    // Validate that every Pokémon in the player's grid satisfies the player's submitted criteria.
    // The empty slot counts as valid for any criteria.
    isPlacementCorrect = true;
    for(let r=0; r < gridSize; r++) {
      for (let c=0; c < gridSize; c++) {
        const playerMon = playerGrid[r][c];
        if (playerMon) { // If there is a Pokémon in the slot
          const pCriteria = getPokemonCriteria(playerMon);
          const rowGuess = rowGuesses[r];
          const colGuess = colGuesses[c];
          if (!rowGuess || !colGuess || !pCriteria.has(rowGuess) || !pCriteria.has(colGuess)) {
            isPlacementCorrect = false;
            break;
          }
        }
      }
      if (!isPlacementCorrect) break;
    }

    // Since we check placement against the submitted criteria, criteria are correct if placement is correct.
    isCriteriaCorrect = isPlacementCorrect;
    isCorrect = isPlacementCorrect;

    // Provide feedback on which guesses were right, comparing against the original solution
    // This doesn't affect the win state, it's just for UI feedback.
    rowResults = rowGuesses.map((guess, index) => guess ? puzzle.rowAnswers.includes(guess) : null);
    colResults = colGuesses.map((guess, index) => guess ? puzzle.colAnswers.includes(guess) : null);


    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      isPlacementCorrect,
      isCorrect,
    };

  } else if (mode === 'odd-one-out' || mode === 'imposter') {
    rowResults = rowGuesses.map((guess, r) => {
        if (!guess) return null;
        const imposterCol = puzzle.oddOneOutCoords!.find(c => c.row === r)!.col;
        const validPokemon = puzzle.grid[r].filter((_, c) => c !== imposterCol);
        return validPokemon.every(p => p && getPokemonCriteria(p).has(guess));
    });

    colResults = colGuesses.map((guess, c) => {
        if (!guess) return null;
        const imposterRow = puzzle.oddOneOutCoords!.find(coord => coord.col === c)!.row;
        const validPokemon = puzzle.grid.map(row => row[c]).filter((_, r) => r !== imposterRow);
        return validPokemon.every(p => p && getPokemonCriteria(p).has(guess));
    });

    isCriteriaCorrect = [...rowResults, ...colResults].every(res => res === true);

    const selectedImposters = JSON.parse(formData.get('selectedImposters') as string) as {row: number, col: number}[];
    const correctImposterCoords = new Set(puzzle.oddOneOutCoords!.map(coord => `${coord.row},${coord.col}`));
    const selectedImposterCoords = new Set(selectedImposters.map(coord => `${coord.row},${coord.col}`));
    
    isOddOneOutSelectionCorrect = correctImposterCoords.size === selectedImposterCoords.size &&
                                   [...correctImposterCoords].every(coord => selectedImposterCoords.has(coord));

    let oddOneOutSelectionResults: (boolean | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const isSelected = selectedImposterCoords.has(`${r},${c}`);
            const isCorrectImposter = correctImposterCoords.has(`${r},${c}`);
            if(isSelected) {
              oddOneOutSelectionResults[r][c] = isCorrectImposter;
            }
        }
    }
    
    isCorrect = isCriteriaCorrect && isOddOneOutSelectionCorrect;

    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      oddOneOutSelectionResults,
      isOddOneOutSelectionCorrect,
      isCorrect,
    };

  } else { // Normal, Hard, Easy, Blinded, Sprite, Timer, Ditto
    rowResults = rowGuesses.map((guess, index) => guess ? guess === puzzle.rowAnswers[index] : null);
    colResults = colGuesses.map((guess, index) => guess ? guess === puzzle.colAnswers[index] : null);
    isCriteriaCorrect = [...rowResults, ...colResults].every(res => res === true);
    isCorrect = isCriteriaCorrect;

    return {
      rowResults,
      colResults,
      isCriteriaCorrect,
      isCorrect,
    };
  }
}
