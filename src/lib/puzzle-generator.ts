
import 'server-only';
import { getAllPokemonWithDetails } from './pokedex';
import type { Puzzle, Pokemon, JepokuMode } from './definitions';
import { NORMAL_CRITERIA, HARD_CRITERIA, EASY_CRITERIA } from './criteria';

const MAX_PUZZLE_ATTEMPTS = 20000;

const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

const IMPOSSIBLE_TYPE_PAIRS: [string, string][] = [
    ['Normal', 'Bug'], ['Normal', 'Ice'], ['Normal', 'Rock'], ['Normal', 'Steel'],
    ['Fire', 'Fairy'],
    ['Ice', 'Poison'],
    ['Ground', 'Fairy'],
    ['Bug', 'Dragon'],
    ['Rock', 'Ghost']
];

const OPPOSING_HARD_CRITERIA: [string, string][] = [
    ['Above 100 hp', 'Below 50 hp'],
    ['Above 100 atk', 'Below 50 atk'],
    ['Above 100 def', 'Below 50 def'],
    ['Above 100 sp atk', 'Below 50 sp atk'],
    ['Above 100 sp def', 'Below 50 sp def'],
    ['Above 100 speed', 'Below 50 speed'],
    ['Has above 620 bst', 'Has below 320 bst'],
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
    
    // Initial random population
    for (let r = 0; r < gridSize; r++) {
        const visibleCols = shuffle(indices).slice(0, visibleCount);
        for (const c of visibleCols) {
            mask[r][c] = true;
        }
    }

    // Iteratively balance the grid
    for (let iteration = 0; iteration < 50; iteration++) {
        let isPerfect = true;

        // Check and adjust columns
        for (let c = 0; c < gridSize; c++) {
            const visibleRows = indices.filter(r => mask[r][c]);
            const diff = visibleRows.length - visibleCount;
            if (diff > 0) { // Too many visible
                isPerfect = false;
                const toHide = shuffle(visibleRows).slice(0, diff);
                toHide.forEach(r => mask[r][c] = false);
            } else if (diff < 0) { // Too few visible
                isPerfect = false;
                const hiddenRows = indices.filter(r => !mask[r][c]);
                const toShow = shuffle(hiddenRows).slice(0, -diff);
                toShow.forEach(r => mask[r][c] = true);
            }
        }
        
        // Check and adjust rows
        for (let r = 0; r < gridSize; r++) {
            const visibleCols = indices.filter(c => mask[r][c]);
            const diff = visibleCols.length - visibleCount;
            if (diff > 0) { // Too many visible
                isPerfect = false;
                const toHide = shuffle(visibleCols).slice(0, diff);
                toHide.forEach(c => mask[r][c] = false);
            } else if (diff < 0) { // Too few visible
                isPerfect = false;
                const hiddenCols = indices.filter(c => !mask[r][c]);
                const toShow = shuffle(hiddenCols).slice(0, -diff);
                toShow.forEach(c => mask[r][c] = true);
            }
        }

        if (isPerfect) break;
    }

    return mask;
}


async function createStandardPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const isBlindedLike = mode === 'blinded' || mode === 'scarred';
    const isHardLike = mode === 'hard' || mode === 'scarred';
    const gridSize = isBlindedLike ? 6 : 3;

    let criteriaPool: string[];
    switch (mode) {
        case 'hard':
        case 'scarred':
            criteriaPool = HARD_CRITERIA;
            break;
        case 'easy':
            criteriaPool = EASY_CRITERIA;
            break;
        default:
            criteriaPool = NORMAL_CRITERIA;
    }
    
    const shuffledPokemon = shuffle(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        let rowAnswers: string[];
        let colAnswers: string[];

        // --- CRITERIA SELECTION LOGIC ---
        if (isHardLike) {
            const groupA = OPPOSING_HARD_CRITERIA.map(p => p[0]);
            const groupB = OPPOSING_HARD_CRITERIA.map(p => p[1]);
            const others = HARD_CRITERIA.filter(c => !groupA.includes(c) && !groupB.includes(c));
            
            const poolA = shuffle([...groupA, ...others]);
            const poolB = shuffle([...groupB, ...others]);

            if (Math.random() > 0.5) {
                rowAnswers = poolA.slice(0, gridSize);
                colAnswers = poolB.slice(0, gridSize);
            } else {
                rowAnswers = poolB.slice(0, gridSize);
                colAnswers = poolA.slice(0, gridSize);
            }
        } else if (isBlindedLike) { // For 'blinded' mode (which is normal criteria)
            const regionsCanBeInRows = Math.random() > 0.5;
            const poolWithRegions = shuffle([...criteriaPool]);
            const poolWithoutRegions = shuffle(criteriaPool.filter(c => !REGIONS.includes(c)));

            if (regionsCanBeInRows) {
                rowAnswers = poolWithRegions.slice(0, gridSize);
                colAnswers = poolWithoutRegions.slice(0, gridSize);
            } else {
                rowAnswers = poolWithoutRegions.slice(0, gridSize);
                colAnswers = poolWithRegions.slice(0, gridSize);
            }

            // Check for impossible type pairs
            let impossiblePairFound = false;
            for (const rAnswer of rowAnswers) {
                for (const cAnswer of colAnswers) {
                     const pair: [string, string] = [rAnswer, cAnswer].sort() as [string, string];
                     if (IMPOSSIBLE_TYPE_PAIRS.some(p => p[0] === pair[0] && p[1] === pair[1])) {
                        impossiblePairFound = true;
                        break;
                    }
                }
                if (impossiblePairFound) break;
            }
            if (impossiblePairFound) continue;
        } else { // For 'normal', 'easy'
            const shuffledCriteria = shuffle([...criteriaPool]);
            if (shuffledCriteria.length < gridSize * 2) return null;
            rowAnswers = shuffledCriteria.slice(0, gridSize);
            colAnswers = shuffledCriteria.slice(gridSize, gridSize * 2);
        }
        // --- END CRITERIA SELECTION ---

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
                mode
            };

            if (isBlindedLike) {
                puzzle.visibleMask = generateVisibilityMask(gridSize, 3);
            }

            return puzzle;
        }
    }

    console.error(`Failed to generate a ${mode} puzzle after multiple retries.`);
    return null;
}

async function createOddOneOutPuzzle(): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const gridSize = 5;
    const criteriaPool = NORMAL_CRITERIA;
    const shuffledPokemon = shuffle(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        const shuffledCriteria = shuffle([...criteriaPool]);
        if (shuffledCriteria.length < gridSize * 2) return null;
        const rowAnswers = shuffledCriteria.slice(0, gridSize);
        const colAnswers = shuffledCriteria.slice(gridSize, gridSize * 2);

        const allAnswers = new Set([...rowAnswers, ...colAnswers]);
        if (allAnswers.size !== gridSize * 2) continue;

        const grid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        const usedPokemonIds = new Set<number>();
        
        let validGrid = true;
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
                    validGrid = false;
                    break;
                }
            }
            if (!validGrid) break;
        }
        if (!validGrid) continue;

        const imposterCoords: {row: number, col: number}[] = [];
        const rowIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        const colIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        for(let i = 0; i < gridSize; i++) {
            imposterCoords.push({row: rowIndices[i], col: colIndices[i]});
        }
        
        let impostersPlaced = true;
        for (const coord of imposterCoords) {
            const rowCriterion = rowAnswers[coord.row];
            const colCriterion = colAnswers[coord.col];
            const originalPokemonId = (grid[coord.row][coord.col] as Pokemon).id;
            usedPokemonIds.delete(originalPokemonId);


            const imposterCandidates = shuffledPokemon.filter(p => {
                if (usedPokemonIds.has(p.id)) return false;
                const pCriteria = getPokemonCriteria(p);
                // An imposter can fit ONE of the criteria, but not both. Or neither.
                // This makes it harder. Let's go with NOT fitting EITHER.
                return !pCriteria.has(rowCriterion) && !pCriteria.has(colCriterion);
            });

            if (imposterCandidates.length > 0) {
                const chosenImposter = imposterCandidates[0];
                grid[coord.row][coord.col] = chosenImposter;
                usedPokemonIds.add(chosenImposter.id);
            } else {
                impostersPlaced = false;
                usedPokemonIds.add(originalPokemonId); // add back if failed
                break;
            }
        }
        if (!impostersPlaced) continue;

        return {
            grid: grid as Pokemon[][],
            rowAnswers,
            colAnswers,
            mode: 'odd-one-out',
            oddOneOutCoords: imposterCoords,
        };
    }
    
    console.error("Failed to generate an Odd One Out puzzle after multiple retries.");
    return null;
}


export async function generatePuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    if (mode === 'odd-one-out') {
        return createOddOneOutPuzzle();
    }
    return createStandardPuzzle(mode);
}
