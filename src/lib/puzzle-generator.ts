import 'server-only';
import { getAllPokemonWithDetails } from './pokedex';
import type { Puzzle, Pokemon, JepokuMode } from './definitions';
import { NORMAL_CRITERIA, HARD_CRITERIA } from './criteria';

const MAX_PUZZLE_ATTEMPTS = 5000;

const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

const IMPOSSIBLE_TYPE_PAIRS: [string, string][] = [
    ['Normal', 'Bug'], ['Normal', 'Ice'], ['Normal', 'Rock'], ['Normal', 'Steel'],
    ['Fire', 'Fairy'],
    ['Ice', 'Poison'],
    ['Ground', 'Fairy'],
    ['Bug', 'Dragon'],
    ['Rock', 'Ghost']
];

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function getPokemonCriteria(pokemon: Pokemon): Set<string> {
    const criteria = new Set<string>(pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    if (pokemon.isMega) criteria.add('Mega');
    if (pokemon.isLegendary) criteria.add('Legendary');
    if (pokemon.isMythical) criteria.add('Mythical');
    if (pokemon.isUltraBeast) criteria.add('Ultra Beast');
    if (pokemon.isParadox) criteria.add('Paradox');
    if (pokemon.region) criteria.add(pokemon.region);

    // Abilities
    if (pokemon.abilities.includes('sturdy')) criteria.add('Has: Sturdy');
    if (pokemon.abilities.includes('swift-swim')) criteria.add('Has: Swift Swim');
    if (pokemon.abilities.includes('cursed-body')) criteria.add('Has: Cursed Body');
    if (pokemon.abilities.includes('mold-breaker')) criteria.add('Has: Mold Breaker');
    if (pokemon.abilities.includes('drizzle')) criteria.add('Has: Drizzle');
    if (pokemon.abilities.includes('sand-stream')) criteria.add('Has: Sand Stream');
    if (pokemon.abilities.includes('snow-warning')) criteria.add('Has: Snow Warning');
    if (pokemon.abilities.includes('grassy-surge')) criteria.add('Has: Grassy Surge');
    if (pokemon.abilities.includes('magic-guard')) criteria.add('Has: Magic Guard');
    if (pokemon.abilities.includes('thick-fat')) criteria.add('Has: Thick Fat');
    if (pokemon.abilities.includes('flash-fire')) criteria.add('Has: Flash Fire');
    if (pokemon.abilities.includes('water-absorb')) criteria.add('Has: Water Absorb');
    if (pokemon.abilities.includes('sap-sipper')) criteria.add('Has: Sap Sipper');
    if (pokemon.abilities.includes('prankster')) criteria.add('Has: Prankster');
    if (pokemon.abilities.includes('competitive')) criteria.add('Has: Competitive');
    if (pokemon.abilities.includes('frisk')) criteria.add('Has: Frisk');

    // Moves
    if (pokemon.moves.includes('brick-break')) criteria.add('Knows: Brick Break');
    if (pokemon.moves.includes('grass-knot')) criteria.add('Knows: Grass Knot');
    if (pokemon.moves.includes('iron-tail')) criteria.add('Knows: Iron Tail');
    if (pokemon.moves.includes('cut')) criteria.add('Knows: Cut');
    if (pokemon.moves.includes('flamethrower')) criteria.add('Knows: Flame Thrower');
    if (pokemon.moves.includes('leer')) criteria.add('Knows: Leer');
    if (pokemon.moves.includes('mud-slap')) criteria.add('Knows: Mud Slap');
    if (pokemon.moves.includes('earthquake')) criteria.add('Learns Earthquake');
    if (pokemon.moves.includes('bind')) criteria.add('Learns Bind');
    if (pokemon.moves.includes('close-combat')) criteria.add('Learns Close Combat');
    if (pokemon.moves.includes('dazzling-gleam')) criteria.add('Learns Dazzling Gleam');
    if (pokemon.moves.includes('dark-pulse')) criteria.add('Learns Dark Pulse');
    if (pokemon.moves.includes('heal-pulse')) criteria.add('Learns Heal Pulse');
    if (pokemon.moves.includes('scratch')) criteria.add('Learns Scratch');
    if (pokemon.moves.includes('wish')) criteria.add('Learns Wish');
    if (pokemon.moves.includes('healing-wish')) criteria.add('Learns Healing Wish');
    if (pokemon.moves.includes('belly-drum')) criteria.add('Learns Belly Drum');
    if (pokemon.moves.includes('after-you')) criteria.add('Learns After You');
    if (pokemon.moves.includes('sucker-punch')) criteria.add('Learns Sucker Punch');


    if (pokemon.canEvolve) criteria.add('Can Evolve');
    if (pokemon.isFinalEvolution) criteria.add('Final Evolution');
    if (pokemon.isPartner) criteria.add('Partner Pokemon');

    // Base Stats
    if (pokemon.stats.hp > 100) criteria.add('Above 100 hp');
    if (pokemon.stats.attack > 100) criteria.add('Above 100 atk');
    if (pokemon.stats.defense > 100) criteria.add('Above 100 def');
    if (pokemon.stats.specialAttack > 100) criteria.add('Above 100 sp atk');
    if (pokemon.stats.specialDefense > 100) criteria.add('Above 100 sp def');
    if (pokemon.stats.speed > 100) criteria.add('Above 100 speed');

    if (pokemon.stats.hp < 50) criteria.add('Below 50 hp');
    if (pokemon.stats.attack < 50) criteria.add('Below 50 atk');
    if (pokemon.stats.defense < 50) criteria.add('Below 50 def');
    if (pokemon.stats.specialAttack < 50) criteria.add('Below 50 sp atk');
    if (pokemon.stats.specialDefense < 50) criteria.add('Below 50 sp def');
    if (pokemon.stats.speed < 50) criteria.add('Below 50 speed');
    
    // BST
    const bst = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);
    if (bst < 320) criteria.add('Has below 320 bst');
    if (bst > 620) criteria.add('Has above 620 bst');

    return criteria;
}

function generateVisibilityMask(gridSize: number, visibleCount: number): boolean[][] {
    const mask: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    const indices = Array.from({ length: gridSize }, (_, i) => i);

    // Ensure each row has `visibleCount` visible cells
    for (let r = 0; r < gridSize; r++) {
        const visibleCols = shuffle(indices).slice(0, visibleCount);
        for (const c of visibleCols) {
            mask[r][c] = true;
        }
    }

    // Check and adjust columns
    for (let c = 0; c < gridSize; c++) {
        let colVisibleCount = 0;
        for (let r = 0; r < gridSize; r++) {
            if (mask[r][c]) {
                colVisibleCount++;
            }
        }

        // If a column has too few visible cells, add more
        if (colVisibleCount < visibleCount) {
            const deficit = visibleCount - colVisibleCount;
            const hiddenRows = indices.filter(r => !mask[r][c]);
            const rowsToReveal = shuffle(hiddenRows).slice(0, deficit);
            for (const r of rowsToReveal) {
                mask[r][c] = true;
            }
        }
        // If a column has too many, hide some (this part is tricky)
        else if (colVisibleCount > visibleCount) {
            const surplus = colVisibleCount - visibleCount;
            const visibleRows = indices.filter(r => mask[r][c]);
            
            // Find rows that can afford to lose a visible cell
            const candidatesForHiding = visibleRows.filter(r => {
                const rowVisibleCount = mask[r].filter(Boolean).length;
                return rowVisibleCount > visibleCount;
            });
            
            const rowsToHide = shuffle(candidatesForHiding).slice(0, surplus);
            for (const r of rowsToHide) {
                mask[r][c] = false;
            }
        }
    }
    
    // Final check to enforce row counts, as column adjustments might have changed them
     for (let r = 0; r < gridSize; r++) {
        let rowVisibleCount = mask[r].filter(Boolean).length;
        if (rowVisibleCount > visibleCount) {
            const surplus = rowVisibleCount - visibleCount;
            const visibleCols = indices.filter(c => mask[r][c]);

            const candidatesForHiding = visibleCols.filter(c => {
                const colVisibleCount = mask.map(row => row[c]).filter(Boolean).length;
                return colVisibleCount > visibleCount;
            });

            const colsToHide = shuffle(candidatesForHiding).slice(0, surplus);
            for (const c of colsToHide) {
                mask[r][c] = false;
            }
        }
    }

    return mask;
}


async function createValidPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const gridSize = mode === 'blinded' ? 6 : 3;
    const criteriaPool = mode === 'hard' ? HARD_CRITERIA : NORMAL_CRITERIA;
    const shuffledPokemon = shuffle(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const shuffledCriteria = shuffle([...criteriaPool]);
        if (shuffledCriteria.length < gridSize * 2) return null;

        let rowAnswers: string[];
        let colAnswers: string[];

        if (mode === 'blinded') {
            const useRegionsOnRows = Math.random() > 0.5;
            const regionCriteria = shuffle(REGIONS).slice(0, gridSize);
            const nonRegionCriteria = shuffle(criteriaPool.filter(c => !REGIONS.includes(c)));
            
            if (useRegionsOnRows) {
                rowAnswers = regionCriteria;
                colAnswers = nonRegionCriteria.slice(0, gridSize);
            } else {
                colAnswers = regionCriteria;
                rowAnswers = nonRegionCriteria.slice(0, gridSize);
            }

            // Check for impossible type pairs
            const rowTypes = rowAnswers.map(c => c.split(' ')[0]);
            const colTypes = colAnswers.map(c => c.split(' ')[0]);
            let impossiblePairFound = false;
            for (const rType of rowTypes) {
                for (const cType of colTypes) {
                     const pair1 = `${rType}/${cType}`;
                     const pair2 = `${cType}/${rType}`;
                     if (IMPOSSIBLE_TYPE_PAIRS.some(p => `${p[0]}/${p[1]}` === pair1 || `${p[0]}/${p[1]}` === pair2)) {
                        impossiblePairFound = true;
                        break;
                    }
                }
                if (impossiblePairFound) break;
            }
            if (impossiblePairFound) continue;

        } else {
            rowAnswers = shuffledCriteria.slice(0, gridSize);
            colAnswers = shuffledCriteria.slice(gridSize, gridSize * 2);
        }

        const allAnswers = new Set([...rowAnswers, ...colAnswers]);
        if (allAnswers.size !== gridSize * 2) {
            continue;
        }

        const grid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        const usedPokemonIds = new Set<number>();
        let success = true;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const rowCriterion = rowAnswers[r];
                const colCriterion = colAnswers[c];

                const candidates = shuffledPokemon.filter(p => {
                    if (usedPokemonIds.has(p.id)) return false;
                    const pCriteria = getPokemonCriteria(p);
                    return pCriteria.has(rowCriterion) && pCriteria.has(colCriterion);
                });

                if (candidates.length > 0) {
                    const chosenPokemon = candidates[0];
                    grid[r][c] = chosenPokemon;
                    usedPokemonIds.add(chosenPokemon.id);
                } else {
                    success = false;
                    break;
                }
            }
            if (!success) break;
        }

        if (success) {
            const puzzle: Puzzle = {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
            };

            if (mode === 'blinded') {
                puzzle.visibleMask = generateVisibilityMask(gridSize, 3);
            }

            return puzzle;
        }
    }

    console.error("Failed to generate a puzzle after multiple retries.");
    return null;
}


export async function generatePuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    return createValidPuzzle(mode);
}
