
'use server';

import type { Puzzle, Pokemon, JepokuMode } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { NORMAL_CRITERIA, HARD_CRITERIA, EASY_CRITERIA } from '@/lib/criteria';
import { shuffle, generateVisibilityMask, buildCriteriaMap, MAX_PUZZLE_ATTEMPTS, REGIONS, IMPOSSIBLE_TYPE_PAIRS, OPPOSING_HARD_CRITERIA } from './utils';

export async function createStandardPuzzle(mode: JepokuMode): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: ${mode} ---`);
    let allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
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
    
    const criteriaMap = buildCriteriaMap(allPokemon);

    for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
        if (attempt > 0 && attempt % 5000 === 0) {
            console.log(`[${mode}] Generation attempt: ${attempt}...`);
        }
        
        let rowAnswers: string[] = [];
        let colAnswers: string[] = [];
        let availableCriteria = shuffle([...criteriaPool]);

        if (isBlindedLike) {
            const selectedCriteria: string[] = [];
            let hasRegionAxis: 'row' | 'col' | null = null;
            
            while(selectedCriteria.length < gridSize * 2 && availableCriteria.length > 0) {
                const isRow = selectedCriteria.length < gridSize;
                const axisAnswers = isRow ? rowAnswers : colAnswers;
                const otherAxisAnswers = isRow ? colAnswers : rowAnswers;
                
                let foundCriterion = false;
                for (let i = 0; i < availableCriteria.length; i++) {
                    const nextCriterion = availableCriteria[i];

                    if (REGIONS.includes(nextCriterion)) {
                        if (hasRegionAxis && (isRow ? hasRegionAxis === 'col' : hasRegionAxis === 'row')) {
                            continue;
                        }
                    }

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

                    axisAnswers.push(nextCriterion);
                    selectedCriteria.push(nextCriterion);
                    availableCriteria.splice(i, 1);
                    if (REGIONS.includes(nextCriterion) && !hasRegionAxis) {
                        hasRegionAxis = isRow ? 'row' : 'col';
                    }
                    foundCriterion = true;
                    break;
                }
                
                if (!foundCriterion) {
                    availableCriteria = shuffle([...criteriaPool]); // Reset if stuck
                }
            }

            if (selectedCriteria.length < gridSize * 2) {
                continue;
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

                const candidates = colCandidates.filter(p => rowCandidates.has(p) && !usedPokemonIds.has(p.id));

                if (candidates.length > 0) {
                    const chosenPokemon = shuffle(candidates)[0];
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
