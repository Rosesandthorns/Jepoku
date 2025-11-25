
import 'server-only';
import { getAllPokemonWithDetails } from './pokedex';
import type { Puzzle, Pokemon, JepokuMode, OrderBy } from './definitions';
import { NORMAL_CRITERIA, HARD_CRITERIA, EASY_CRITERIA } from './criteria';

const MAX_PUZZLE_ATTEMPTS = 50000;

const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

const IMPOSSIBLE_TYPE_PAIRS: [string, string][] = [
    ['Normal', 'Ice'], ['Normal', 'Bug'], ['Normal', 'Rock'], ['Normal', 'Steel'],
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

function generateVisibilityMask(gridSize: number): boolean[][] {
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

function buildCriteriaMap(pokemonList: Pokemon[], criteriaPool: string[]): Map<string, Pokemon[]> {
    const map = new Map<string, Pokemon[]>();
    for (const criterion of criteriaPool) {
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

async function createStandardPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: ${mode} ---`);
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    if (mode === 'ditto') {
        allPokemon = allPokemon.filter(p => p.name !== 'ditto');
    }

    const isBlindedLike = mode === 'blinded';
    const isHardLike = mode === 'hard' || mode === 'imposter';
    const gridSize = isBlindedLike ? 5 : 3;

    let criteriaPool: string[];
    switch (mode) {
        case 'hard':
        case 'imposter':
            criteriaPool = [...HARD_CRITERIA, ...NORMAL_CRITERIA];
            break;
        case 'easy':
        case 'timer':
            criteriaPool = EASY_CRITERIA;
            break;
        default:
            criteriaPool = NORMAL_CRITERIA;
    }
    
    const criteriaMap = buildCriteriaMap(allPokemon, criteriaPool);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[${mode}] Generation attempt: ${attempt}...`);
        }
        
        let rowAnswers: string[] = [];
        let colAnswers: string[] = [];
        let availableCriteria = shuffle([...criteriaPool]);

        if (isBlindedLike) {
            // Aggressive iterative refinement for large grids
            const selectedCriteria: string[] = [];
            let hasRegionAxis: 'row' | 'col' | null = null;
            const currentPool = shuffle([...criteriaPool]);

            while (selectedCriteria.length < gridSize * 2 && currentPool.length > 0) {
                const isRow = selectedCriteria.length < gridSize;
                const axisAnswers = isRow ? rowAnswers : colAnswers;
                const otherAxisAnswers = isRow ? colAnswers : rowAnswers;

                let foundCriterion = false;
                for (let i = 0; i < currentPool.length; i++) {
                    const nextCriterion = currentPool[i];

                    // Rule: Don't pick the same criterion twice
                    if (selectedCriteria.includes(nextCriterion)) continue;

                    // Rule: Regions on one axis only
                    if (REGIONS.includes(nextCriterion)) {
                        if (hasRegionAxis && (isRow ? hasRegionAxis === 'col' : hasRegionAxis === 'row')) {
                            continue; // This axis can't have a region
                        }
                    }

                    // Rule: No impossible type intersections
                    let hasImpossiblePair = false;
                    for (const otherCrit of otherAxisAnswers) {
                        const isImpossible = IMPOSSIBLE_TYPE_PAIRS.some(pair =>
                            (pair[0] === nextCriterion && pair[1] === otherCrit) || (pair[1] === nextCriterion && pair[0] === otherCrit)
                        );
                        if (isImpossible) {
                            hasImpossiblePair = true;
                            break;
                        }
                    }
                    if (hasImpossiblePair) continue;

                    // If all checks pass, select this criterion
                    axisAnswers.push(nextCriterion);
                    selectedCriteria.push(nextCriterion);
                    currentPool.splice(i, 1); // Remove from pool for this attempt
                    if (REGIONS.includes(nextCriterion) && !hasRegionAxis) {
                        hasRegionAxis = isRow ? 'row' : 'col';
                    }
                    foundCriterion = true;
                    break; // Exit the inner for-loop to find a criterion for the next slot
                }
                
                if (!foundCriterion) {
                    break; // Could not find a valid criterion for this slot, must restart entire attempt
                }
            }

            if (selectedCriteria.length < gridSize * 2) {
                continue; // Restart outer for-loop if we failed to fill all slots
            }
        } else if (isHardLike) {
            const allSelected: string[] = [];
            for(let i = 0; i < gridSize * 2; i++) {
                if (availableCriteria.length === 0) break;
                const selected = availableCriteria.pop()!;
                allSelected.push(selected);
                const opposingPair = OPPOSING_HARD_CRITERIA.find(p => p.includes(selected));
                if (opposingPair) {
                    const opposite = opposingPair.find(p => p !== selected);
                    availableCriteria = availableCriteria.filter(c => c !== opposite);
                }
            }
            if (allSelected.length < gridSize * 2) continue;
            rowAnswers = allSelected.slice(0, gridSize);
            colAnswers = allSelected.slice(gridSize, gridSize * 2);
        } else {
            rowAnswers = availableCriteria.slice(0, gridSize);
            colAnswers = availableCriteria.slice(gridSize, gridSize * 2);
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

                const rowCandidates = new Set(criteriaMap.get(rowCriterion) || []);
                const colCandidates = criteriaMap.get(colCriterion) || [];

                const candidates = shuffle(colCandidates.filter(p => rowCandidates.has(p) && !usedPokemonIds.has(p.id)));

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
            console.log(`[${mode}] Successfully generated puzzle after ${attempt + 1} attempts.`);
            const puzzle: Puzzle = {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
                mode
            };

            if (isBlindedLike) {
                 puzzle.visibleMask = generateVisibilityMask(gridSize);
            }

            return puzzle;
        }
    }

    console.error(`[${mode}] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}

async function createOddOneOutPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: odd-one-out ---`);
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }
    
    const gridSize = 5;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[odd-one-out] Generation attempt: ${attempt}...`);
        }
        
        // 1. Generate a valid 5x5 base puzzle first.
        const basePuzzle = await createStandardPuzzle('blinded'); // Use the 5x5 generator logic
        if (!basePuzzle) continue;
        
        const { grid, rowAnswers, colAnswers } = basePuzzle;
        const usedPokemonIds = new Set(grid.flat().map(p => p.id));
        
        // 2. Select imposter coordinates (one per row/col)
        const imposterCoords: {row: number, col: number}[] = [];
        const rowIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        const colIndices = shuffle(Array.from({length: gridSize}, (_, i) => i));
        for(let i = 0; i < gridSize; i++) {
            imposterCoords.push({row: rowIndices[i], col: colIndices[i]});
        }
        
        // 3. Replace with imposters
        let impostersPlaced = true;
        for (const coord of imposterCoords) {
            const rowCriterion = rowAnswers[coord.row];
            const colCriterion = colAnswers[coord.col];
            const originalPokemonId = (grid[coord.row][coord.col] as Pokemon).id;
            usedPokemonIds.delete(originalPokemonId);

            // Find a pokemon that fits NEITHER criterion
            const imposterCandidates = shuffle(allPokemon.filter(p => {
                if (usedPokemonIds.has(p.id)) return false;
                const pCriteria = getPokemonCriteria(p);
                return !pCriteria.has(rowCriterion) && !pCriteria.has(colCriterion);
            }));

            if (imposterCandidates.length > 0) {
                const chosenImposter = imposterCandidates[0];
                grid[coord.row][coord.col] = chosenImposter;
                usedPokemonIds.add(chosenImposter.id);
            } else {
                impostersPlaced = false;
                break;
            }
        }
        
        if (impostersPlaced) {
            console.log(`[odd-one-out] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid: grid as Pokemon[][],
                rowAnswers,
                colAnswers,
                mode: 'odd-one-out',
                oddOneOutCoords: imposterCoords,
            };
        }
    }
    
    console.error(`[odd-one-out] Failed to generate a puzzle after ${MAX_PUZZLE_ATTEMPTS} attempts.`);
    return null;
}

async function createImposterPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: imposter ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }
    
    const gridSize = 3;

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS / 10; attempt++) {
        // 1. Generate a valid 3x3 hard mode puzzle
        const basePuzzle = await createStandardPuzzle('imposter');
        if (!basePuzzle) continue;
    
        const { grid, rowAnswers, colAnswers } = basePuzzle;
        const usedPokemonIds = new Set(grid.flat().map(p => p.id));
        
        // 2. Select one random Pokémon to replace
        const imposterRow = Math.floor(Math.random() * gridSize);
        const imposterCol = Math.floor(Math.random() * gridSize);
        const imposterCoord = { row: imposterRow, col: imposterCol };
        
        const originalPokemon = grid[imposterRow][imposterCol];
        if (originalPokemon) {
            usedPokemonIds.delete(originalPokemon.id);
        }
    
        const rowCriterion = rowAnswers[imposterRow];
        const colCriterion = colAnswers[imposterCol];
    
        // 3. Find an imposter Pokémon
        const imposterCandidate = shuffle(allPokemon).find(p => {
            if (usedPokemonIds.has(p.id)) return false;
            const pCriteria = getPokemonCriteria(p);
            // Must not fit EITHER criterion
            return !pCriteria.has(rowCriterion) && !pCriteria.has(colCriterion);
        });
    
        if (imposterCandidate) {
            grid[imposterRow][imposterCol] = imposterCandidate;
            console.log(`[imposter] Successfully generated puzzle after ${attempt + 1} attempts.`);
            return {
                grid,
                rowAnswers,
                colAnswers,
                mode: 'imposter',
                oddOneOutCoords: [imposterCoord], // Store the single imposter
            };
        }
    }
    
    console.error(`[imposter] Failed to generate a puzzle after multiple attempts.`);
    return null;
}


async function createMissMatchedPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: miss-matched ---`);
    const gridSize = 3;

    // 1. Generate a valid, solvable 3x3 puzzle
    let solvedPuzzle: Puzzle | null = null;
    for (let i = 0; i < 100; i++) { // Try up to 100 times to create a base puzzle
      const puzzle = await createStandardPuzzle('normal');
      if (puzzle && puzzle.grid.length === gridSize) {
        solvedPuzzle = puzzle;
        break;
      }
    }
    
    if (!solvedPuzzle) {
        console.error("Failed to generate a base puzzle for Miss Matched mode.");
        return null;
    }
    const solutionGrid = solvedPuzzle.grid as Pokemon[][];

    // 2. Reveal one random criterion
    const revealedAxis = Math.random() < 0.5 ? 'row' : 'col';
    const revealedIndex = Math.floor(Math.random() * gridSize);
    const revealedValue = revealedAxis === 'row' ? solvedPuzzle.rowAnswers[revealedIndex] : solvedPuzzle.colAnswers[revealedIndex];

    // 3. Create the shuffled grid
    const pokemonToShuffle: (Pokemon | null)[] = solutionGrid.flat();
    const emptySlotIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    // The pokemon at the empty slot index will be the one left out
    pokemonToShuffle.splice(emptySlotIndex, 1);
    const shuffledPokemon = shuffle(pokemonToShuffle);
    
    const shuffledGrid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let currentPokeIndex = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (r * gridSize + c !== emptySlotIndex) {
                shuffledGrid[r][c] = shuffledPokemon[currentPokeIndex++];
            }
        }
    }
    
    console.log("[miss-matched] Successfully generated puzzle.");

    return {
        ...solvedPuzzle,
        grid: shuffledGrid, // The main grid is the shuffled one
        mode: 'miss-matched',
        shuffledGrid: shuffledGrid,
        solutionGrid: solvedPuzzle.grid,
        revealedCriterion: {
            axis: revealedAxis,
            index: revealedIndex,
            value: revealedValue,
        },
    };
}

async function createOrderPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: order ---`);
    const allPokemon = await getAllPokemonWithDetails();
    const pokemonCount = 16;
    const shuffledPokemon = shuffle([...allPokemon]);
    const pokemonList = shuffledPokemon.slice(0, pokemonCount);

    const orderByOptions: OrderBy[] = [
        'pokedex', 'height', 'weight', 'bst', 'hp', 'attack', 
        'defense', 'special-attack', 'special-defense', 'speed'
    ];
    const orderBy = shuffle(orderByOptions)[0];
    const orderDirection = Math.random() > 0.5 ? 'asc' : 'desc';

    const getStat = (p: Pokemon, stat: OrderBy) => {
        switch (stat) {
            case 'pokedex': return p.id;
            case 'height': return p.height;
            case 'weight': return p.weight;
            case 'bst': return Object.values(p.stats).reduce((a, b) => a + b, 0);
            case 'hp': return p.stats.hp;
            case 'attack': return p.stats.attack;
            case 'defense': return p.stats.defense;
            case 'special-attack': return p.stats.specialAttack;
            case 'special-defense': return p.stats.specialDefense;
            case 'speed': return p.stats.speed;
        }
    };

    const sortedPokemon = [...pokemonList].sort((a, b) => {
        const statA = getStat(a, orderBy);
        const statB = getStat(b, orderBy);
        if (orderDirection === 'asc') {
            return statA - statB;
        } else {
            return statB - statA;
        }
    });

    const correctOrderIds = sortedPokemon.map(p => p.id);
    console.log("[order] Successfully generated puzzle.");

    return {
        grid: [],
        rowAnswers: [],
        colAnswers: [],
        mode: 'order',
        pokemonList: shuffle(pokemonList), // Present in random order
        orderBy,
        orderDirection,
        correctOrderIds,
    };
}


export async function generatePuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    switch (mode) {
        case 'odd-one-out':
            return createOddOneOutPuzzle();
        case 'imposter':
            return createImposterPuzzle();
        case 'miss-matched':
            return createMissMatchedPuzzle();
        case 'order':
            return createOrderPuzzle();
        case 'easy':
        case 'normal':
        case 'hard':
        case 'blinded':
        case 'timer':
        case 'ditto':
             return createStandardPuzzle(mode);
        default:
            return createStandardPuzzle('normal');
    }
}
