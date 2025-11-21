export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  spriteUrl: string;
}

export interface Puzzle {
  grid: (Pokemon | null)[][];
  rowAnswers: string[];
  colAnswers: string[];
}

export interface ValidationResult {
  rowResults: (boolean | null)[];
  colResults: (boolean | null)[];
  isCorrect: boolean;
}
