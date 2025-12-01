

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
  height: number;
  weight: number;
  pokedexEntry: string;
  eggGroups: string[];
  evolutionLineSize: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
}

export type JepokuMode = 'normal' | 'hard' | 'blinded' | 'easy' | 'odd-one-out' | 'imposter' | 'miss-matched' | 'timer' | 'order' | 'sprite' | 'dual' | 'dex' | 'criteria' | 'easy-criteria' | 'crossword';

export type OrderBy = 'pokedex' | 'height' | 'weight' | 'bst' | 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

interface CrosswordClue {
    number: number;
    direction: 'across' | 'down';
    row: number;
    col: number;
    length: number;
    clue: string; // The types, e.g. "Fire / Flying"
    answer: string; // The pokemon name
}

export interface Puzzle {
  grid: (Pokemon | null)[][];
  rowAnswers: string[];
  colAnswers: string[];
  mode: JepokuMode;
  visibleMask?: boolean[][];
  oddOneOutCoords?: {row: number, col: number}[];
  
  // For Dual Mode
  rowAnswersHard?: string[];
  colAnswersHard?: string[];

  // For Miss-Matched mode
  shuffledGrid?: (Pokemon | null)[][];
  revealedCriterion?: {
    axis: 'row' | 'col';
    index: number;
    value: string;
  };
  solutionGrid?: (Pokemon | null)[][];

  // For Order mode
  pokemonList?: Pokemon[];
  orderBy?: OrderBy;
  orderDirection?: 'asc' | 'desc';
  correctOrderIds?: number[];

  // For Dex mode
  dexDisplay?: ('number' | 'entry')[][];
  
  // For Criteria mode
  targetPokemon?: Pokemon;
  clues?: { label: string; value: string }[];

  // For Crossword mode
  crosswordGrid?: (string | null)[][];
  crosswordClues?: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}

export interface ValidationResult {
  rowResults: (boolean | null)[];
  colResults: (boolean | null)[];
  isCriteriaCorrect: boolean;
  isCorrect: boolean;
  
  // For Dual Mode
  rowResultsHard?: (boolean | null)[];
  colResultsHard?: (boolean | null)[];

  // For Odd-one-out
  oddOneOutSelectionResults?: (boolean | null)[][];
  isOddOneOutSelectionCorrect?: boolean;
  
  // For Miss-matched
  isPlacementCorrect?: boolean;

  // For Order mode
  accuracy?: number;
}

export interface CrosswordValidationResult {
    isCorrect: boolean;
    letterResults?: (boolean | null)[][];
}
