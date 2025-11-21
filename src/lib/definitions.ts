export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  spriteUrl: string;
  isMega: boolean;
  region: string;
  abilities: string[];
  moves: string[];
  canEvolve: boolean;
  isFinalEvolution: boolean;
  isPartner: boolean;
  isLegendary: boolean;
  isMythical: boolean;
  isUltraBeast: boolean;
  isParadox: boolean;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
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
