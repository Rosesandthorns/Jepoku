
'use server';

import type { Puzzle, JepokuMode } from './definitions';
import { createStandardPuzzle } from './puzzle-generators/standard-puzzle';
import { createOddOneOutPuzzle } from './puzzle-generators/odd-one-out-puzzle';
import { createImposterPuzzle } from './puzzle-generators/imposter-puzzle';
import { createMissMatchedPuzzle } from './puzzle-generators/miss-matched-puzzle';
import { createOrderPuzzle } from './puzzle-generators/order-puzzle';
import { createDualPuzzle } from './puzzle-generators/dual-puzzle';
import { createDexPuzzle } from './puzzle-generators/dex-puzzle';
import { createCriteriaPuzzle } from './puzzle-generators/criteria-puzzle';


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
        case 'dual':
            return createDualPuzzle();
        case 'dex':
            return createDexPuzzle();
        case 'criteria':
            return createCriteriaPuzzle();
        case 'easy':
        case 'normal':
        case 'hard':
        case 'blinded':
        case 'timer':
        case 'ditto':
        case 'sprite':
             return createStandardPuzzle(mode);
        default:
            return createStandardPuzzle('normal');
    }
}
