
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { shuffle } from './utils';

const generationToIdMap: { [key: string]: number } = {
    'Kanto': 1, 'Johto': 2, 'Hoenn': 3, 'Sinnoh': 4,
    'Unova': 5, 'Kalos': 6, 'Alola': 7, 'Galar': 8, 'Paldea': 9,
}

function formatString(str: string): string {
    return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export async function createCriteriaPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: criteria ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const targetPokemon = shuffle(allPokemon)[0];
    const clues: { label: string; value: string }[] = [];

    // Clue 1: Type 1
    clues.push({ label: 'Type 1', value: formatString(targetPokemon.types[0]) });
    
    // Clue 2: Type 2 or lack thereof
    clues.push({ label: 'Type 2', value: targetPokemon.types[1] ? formatString(targetPokemon.types[1]) : 'None' });
    
    // Clue 3: Generation Part 1
    const genId = generationToIdMap[targetPokemon.region as keyof typeof generationToIdMap] || 0;
    clues.push({ label: 'Generation Group', value: genId >= 5 ? 'Gen 5 or later' : 'Gen 4 or earlier' });
    
    // Clue 4: Egg Group
    clues.push({ label: 'Primary Egg Group', value: targetPokemon.eggGroups.length > 0 ? formatString(targetPokemon.eggGroups[0]) : 'None' });
    
    // Clue 5: Evolution Status
    let evoStatus = 'Does Not Evolve';
    if (targetPokemon.canEvolve) evoStatus = 'Can Evolve';
    else if (targetPokemon.isFinalEvolution) evoStatus = 'Final Evolution';
    clues.push({ label: 'Evolution Status', value: evoStatus });
    
    // Clue 6: Generation Part 2
    clues.push({ label: 'Generation', value: targetPokemon.region });
    
    // Clue 7: Random Ability
    clues.push({ label: 'Possible Ability', value: formatString(shuffle(targetPokemon.abilities)[0]) });

    // Clue 8: Pokedex Number
    clues.push({ label: 'Pokédex Number', value: targetPokemon.id.toString() });

    // Clue 9: Number of mons in line
    clues.push({ label: 'Evolution Line Size', value: `${targetPokemon.evolutionLineSize}` });

    // Clue 10: Legendary/Mythical status
    let status = 'Regular';
    if (targetPokemon.isLegendary) status = 'Legendary';
    if (targetPokemon.isMythical) status = 'Mythical';
    if (targetPokemon.isUltraBeast) status = 'Ultra Beast';
    if (targetPokemon.isParadox) status = 'Paradox';
    clues.push({ label: 'Status', value: status });
    
    // Clue 11 & 12: Random moves
    const randomMoves = shuffle(targetPokemon.moves).slice(0, 2);
    clues.push({ label: 'Learns', value: formatString(randomMoves[0]) });
    if(randomMoves[1]) clues.push({ label: 'Also Learns', value: formatString(randomMoves[1]) });

    console.log(`[criteria] Successfully generated puzzle. Target: ${targetPokemon.name}`);

    return {
        grid: [],
        rowAnswers: [],
        colAnswers: [],
        mode: 'criteria',
        targetPokemon,
        clues,
    };
}
