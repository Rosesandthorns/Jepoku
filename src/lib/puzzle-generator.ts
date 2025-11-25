

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
    ['Bug', 'Dragon'], ['Bug', 'Ghost'],
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
    const visibleCount = 3;

    // Initial random population
    for (let r = 0; r < gridSize; r++) {
        const visibleCols = shuffle([...indices]).slice(0, visibleCount);
        for (const c of visibleCols) {
            mask[r][c] = true;
        }
    }

    // Iteratively balance the grid
    for (let i = 0; i < 50; i++) { // Safety break after 50 iterations
        let changesMade = false;

        // Check and fix columns
        for (let c = 0; c < gridSize; c++) {
            const col = mask.map(row => row[c]);
            const count = col.filter(v => v).length;
            if (count > visibleCount) {
                const visibleRows = indices.filter(r => mask[r][c]);
                const toHide = shuffle(visibleRows)[0];
                mask[toHide][c] = false;
                changesMade = true;
            } else if (count < visibleCount) {
                const hiddenRows = indices.filter(r => !mask[r][c]);
                const toShow = shuffle(hiddenRows)[0];
                mask[toShow][c] = true;
                changesMade = true;
            }
        }
        
        // Check and fix rows
        for (let r = 0; r < gridSize; r++) {
            const row = mask[r];
            const count = row.filter(v => v).length;
             if (count > visibleCount) {
                const visibleCols = indices.filter(c => mask[r][c]);
                const toHide = shuffle(visibleCols)[0];
                mask[r][toHide] = false;
                changesMade = true;
            } else if (count < visibleCount) {
                const hiddenCols = indices.filter(c => !mask[r][c]);
                const toShow = shuffle(hiddenCols)[0];
                mask[r][toShow] = true;
                changesMade = true;
            }
        }

        if (!changesMade) break; // If a full pass makes no changes, we're stable.
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
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    if (mode === 'ditto') {
        allPokemon = allPokemon.filter(p => p.name !== 'ditto');
    }

    const isBlindedLike = mode === 'blinded' || mode === 'scarred';
    const isHardLike = mode === 'hard' || mode === 'imposter' || mode === 'scarred';
    const gridSize = isBlindedLike ? 6 : 3;

    let criteriaPool: string[];
    switch (mode) {
        case 'hard':
        case 'imposter':
        case 'scarred':
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
        let rowAnswers: string[];
        let colAnswers: string[];

        // --- CRITERIA SELECTION LOGIC ---
        if (isHardLike) {
            let availableCriteria = [...criteriaPool];
            const allSelected: string[] = [];
            
            for(let i = 0; i < gridSize * 2; i++) {
                if (availableCriteria.length === 0) break;
                
                const selected = shuffle(availableCriteria)[0];
                allSelected.push(selected);
                
                availableCriteria = availableCriteria.filter(c => c !== selected);

                const opposingPair = OPPOSING_HARD_CRITERIA.find(p => p.includes(selected));
                if (opposingPair) {
                    const opposite = opposingPair.find(p => p !== selected);
                    availableCriteria = availableCriteria.filter(c => c !== opposite);
                }
            }

            if (allSelected.length < gridSize * 2) continue; 

            rowAnswers = allSelected.slice(0, gridSize);
            colAnswers = allSelected.slice(gridSize, gridSize * 2);

        } else if (isBlindedLike) {
            const types = criteriaPool.filter(c => !REGIONS.includes(c) && !c.startsWith('Has') && !c.startsWith('Knows') && !c.startsWith('Learns') && !['Mega', 'Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Can Evolve', 'Final Evolution', 'Partner Pokemon'].includes(c));
            const otherCriteria = criteriaPool.filter(c => !types.includes(c));

            let tempRowAnswers = shuffle(otherCriteria).slice(0, gridSize);
            let tempColAnswers: string[] = [];

            let availableTypes = shuffle(types);

            for (let i = 0; i < gridSize; i++) {
                let foundType = false;
                for (let j = 0; j < availableTypes.length; j++) {
                    const candidateType = availableTypes[j];
                    
                    const isImpossible = tempRowAnswers.some(rowCrit => {
                        const pair: [string, string] = [rowCrit, candidateType].sort() as [string, string];
                        return IMPOSSIBLE_TYPE_PAIRS.some(p => p[0] === pair[0] && p[1] === pair[1]);
                    });

                    if (!isImpossible) {
                        tempColAnswers.push(candidateType);
                        availableTypes.splice(j, 1);
                        foundType = true;
                        break;
                    }
                }
                if (!foundType) {
                    tempColAnswers = []; 
                    break;
                }
            }

            if (tempColAnswers.length !== gridSize) continue;

            if (Math.random() > 0.5) {
                rowAnswers = tempRowAnswers;
                colAnswers = tempColAnswers;
            } else {
                rowAnswers = tempColAnswers;
                colAnswers = tempRowAnswers;
            }
        } else {
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

    console.error(`Failed to generate a ${mode} puzzle after multiple retries.`);
    return null;
}

async function createOddOneOutPuzzle(): Promise<Puzzle | null> {
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const gridSize = 5;
    const criteriaPool = NORMAL_CRITERIA;
    const criteriaMap = buildCriteriaMap(allPokemon, criteriaPool);

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

                const rowCandidates = new Set(criteriaMap.get(rowCriterion) || []);
                const colCandidates = criteriaMap.get(colCriterion) || [];

                const candidates = shuffle(colCandidates.filter(p => rowCandidates.has(p) && !usedPokemonIds.has(p.id)));

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

async function createImposterPuzzle(): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }
    
    const gridSize = 3;

    // 1. Generate a valid 3x3 hard mode puzzle
    let basePuzzle: Puzzle | null = null;
    for (let i = 0; i < 50; i++) { // Try a few times to get a base puzzle
        const puzzle = await createStandardPuzzle('imposter'); // Uses hard criteria
        if (puzzle && puzzle.grid.length === gridSize) {
            basePuzzle = puzzle;
            break;
        }
    }
    if (!basePuzzle) {
        console.error("Failed to create base puzzle for Imposter mode.");
        return null;
    }

    const { grid, rowAnswers, colAnswers } = basePuzzle;
    const usedPokemonIds = new Set(grid.flat().map(p => p.id));
    
    // 2. Select one random Pokémon to replace
    const imposterRow = Math.floor(Math.random() * gridSize);
    const imposterCol = Math.floor(Math.random() * gridSize);
    const imposterCoord = { row: imposterRow, col: imposterCol };
    
    const originalPokemon = grid[imposterRow][imposterCol];
    usedPokemonIds.delete(originalPokemon.id);

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
        return {
            grid,
            rowAnswers,
            colAnswers,
            mode: 'imposter',
            oddOneOutCoords: [imposterCoord], // Store the single imposter
        };
    } else {
         // This is unlikely but possible. We'll just return the solvable hard puzzle
         // instead of failing outright. The user won't know the difference.
         // Or we could retry. For now, let's retry.
         return createImposterPuzzle();
    }
}


async function createMissMatchedPuzzle(): Promise<Puzzle | null> {
    const allPokemon = await getAllPokemonWithDetails();
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
    const pokemonToShuffle = solutionGrid.flat();
    const emptyIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    // Remove one Pokémon to create an empty slot
    const pokemonForGrid = pokemonToShuffle.filter((_, i) => i !== emptyIndex);
    const shuffledPokemon = shuffle(pokemonForGrid);
    
    const shuffledGrid: (Pokemon | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let currentPokeIndex = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (r * gridSize + c !== emptyIndex) {
                shuffledGrid[r][c] = shuffledPokemon[currentPokeIndex++];
            }
        }
    }

    return {
        grid: solvedPuzzle.grid,
        rowAnswers: solvedPuzzle.rowAnswers,
        colAnswers: solvedPuzzle.colAnswers,
        mode: 'miss-matched',
        shuffledGrid,
        solutionGrid,
        revealedCriterion: {
            axis: revealedAxis,
            index: revealedIndex,
            value: revealedValue,
        },
    };
}

async function createOrderPuzzle(): Promise<Puzzle | null> {
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
            case 'hp': return p.stats.hp;
            case 'attack': return p.stats.attack;
            case 'defense': return p.stats.defense;
            case 'special-attack': return p.stats.specialAttack;
            case 'special-defense': return p.stats.specialDefense;
            case 'speed': return p.stats.speed;
            case 'bst': return Object.values(p.stats).reduce((a, b) => a + b, 0);
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
        case 'scarred':
             return createStandardPuzzle(mode);
        default:
            return createStandardPuzzle('normal');
    }
}
