export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  spriteUrl: string;
  isMega: boolean;
  region: string;
  abilities: string[];
  canEvolve: boolean;
  isFinalEvolution: boolean;
  isPartner: boolean;
  isLegendary: boolean;
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
