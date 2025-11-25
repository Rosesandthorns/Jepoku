
import type { Pokemon } from '@/lib/definitions';
import { NORMAL_CRITERIA, HARD_CRITERIA, EASY_CRITERIA, getPokemonCriteria } from '@/lib/criteria';

export const MAX_PUZZLE_ATTEMPTS = 50000;

export const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

export const IMPOSSIBLE_TYPE_PAIRS: [string, string][] = [
    ['Normal', 'Ice'], ['Normal', 'Bug'], ['Normal', 'Rock'], ['Normal', 'Steel'],
    ['Fire', 'Fairy'],
    ['Ice', 'Poison'],
    ['Ground', 'Fairy'],
    ['Bug', 'Dragon'],
    ['Rock', 'Ghost']
];

export const OPPOSING_HARD_CRITERIA: [string, string][] = [
    ['Above 100 hp', 'Below 50 hp'],
    ['Above 100 atk', 'Below 50 atk'],
    ['Above 100 def', 'Below 50 def'],
    ['Above 100 sp atk', 'Below 50 sp atk'],
    ['Above 100 sp def', 'Below 50 sp def'],
    ['Above 100 speed', 'Below 50 speed'],
    ['Has above 620 bst', 'Has below 320 bst'],
];

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export function generateVisibilityMask(gridSize: number): boolean[][] {
    const mask: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    const indices = Array.from({ length: gridSize }, (_, i) => i);
    const visibleCount = Math.max(1, Math.floor(gridSize / 2)); // e.g., 2 for 5x5, 3 for 6x6

    // Ensure at least `visibleCount` are true for each row
    for (let r = 0; r < gridSize; r++) {
        const visibleCols = shuffle([...indices]).slice(0, visibleCount);
        for (const c of visibleCols) {
            mask[r][c] = true;
        }
    }
    
    // Ensure at least `visibleCount` are true for each column
    for (let c = 0; c < gridSize; c++) {
        const colCount = mask.reduce((acc, row) => acc + (row[c] ? 1 : 0), 0);
        if (colCount < visibleCount) {
            const hiddenRows = indices.filter(r => !mask[r][c]);
            const toShow = shuffle(hiddenRows).slice(0, visibleCount - colCount);
            for(const r of toShow) {
                mask[r][c] = true;
            }
        }
    }

    return mask;
}

export function buildCriteriaMap(pokemonList: Pokemon[]): Map<string, Pokemon[]> {
    const allCriteria = [...new Set([...EASY_CRITERIA, ...NORMAL_CRITERIA, ...HARD_CRITERIA])];
    const map = new Map<string, Pokemon[]>();
    for (const criterion of allCriteria) {
        map.set(criterion, []);
    }

    for (const pokemon of pokemonList) {
        const criteria = getPokemonCriteria(pokemon);
        for (const criterion of criteria) {
            if (map.has(criterion)) {
                map.get(criterion)!.push(pokemon);
            }
        }
    }
    return map;
}
