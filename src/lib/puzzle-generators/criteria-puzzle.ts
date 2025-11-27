
'use server';

import type { Puzzle, Pokemon } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { shuffle } from './utils';

const generationToIdMap: { [key: string]: number } = {
    'Kanto': 1, 'Johto': 2, 'Hoenn': 3, 'Sinnoh': 4,
    'Unova': 5, 'Kalos': 6, 'Alola': 7, 'Galar': 8, 'Paldea': 9,
}

function formatString(str: string): string {
    if (!str) return 'N/A';
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
    const allClues: { label: string; value: string }[] = [];

    // Type 1
    allClues.push({ label: 'Type 1', value: formatString(targetPokemon.types[0]) });
    
    // Type 2 or lack thereof
    allClues.push({ label: 'Type 2', value: targetPokemon.types[1] ? formatString(targetPokemon.types[1]) : 'None' });
    
    // Generation
    allClues.push({ label: 'Generation', value: targetPokemon.region });
    
    // Egg Group
    allClues.push({ label: 'Primary Egg Group', value: targetPokemon.eggGroups.length > 0 ? formatString(targetPokemon.eggGroups[0]) : 'None' });
    
    // Evolution Status
    let evoStatus = 'Does Not Evolve';
    if (targetPokemon.canEvolve) evoStatus = 'Can Evolve';
    else if (targetPokemon.isFinalEvolution) evoStatus = 'Final Evolution';
    allClues.push({ label: 'Evolution Status', value: evoStatus });
        
    // Random Ability
    allClues.push({ label: 'Possible Ability', value: formatString(shuffle(targetPokemon.abilities)[0]) });

    // Pokedex Number
    allClues.push({ label: 'Pokédex Number', value: targetPokemon.id.toString() });

    // Evolution Line Size
    allClues.push({ label: 'Evolution Line Size', value: `${targetPokemon.evolutionLineSize}` });

    // Legendary/Mythical status
    let status = 'Regular';
    if (targetPokemon.isLegendary) status = 'Legendary';
    if (targetPokemon.isMythical) status = 'Mythical';
    if (targetPokemon.isUltraBeast) status = 'Ultra Beast';
    if (targetPokemon.isParadox) status = 'Paradox';
    allClues.push({ label: 'Status', value: status });
    
    // Random moves
    const randomMoves = shuffle(targetPokemon.moves).slice(0, 2);
    if(randomMoves[0]) allClues.push({ label: 'Learns', value: formatString(randomMoves[0]) });
    if(randomMoves[1]) allClues.push({ label: 'Also Learns', value: formatString(randomMoves[1]) });

    // Stats
    const bst = Object.values(targetPokemon.stats).reduce((a, b) => a + b, 0);
    allClues.push({ label: 'Base Stat Total', value: bst.toString() });
    allClues.push({ label: 'HP', value: targetPokemon.stats.hp.toString() });
    allClues.push({ label: 'Attack', value: targetPokemon.stats.attack.toString() });
    allClues.push({ label: 'Defense', value: targetPokemon.stats.defense.toString() });
    allClues.push({ label: 'Sp. Atk', value: targetPokemon.stats.specialAttack.toString() });
    allClues.push({ label: 'Sp. Def', value: targetPokemon.stats.specialDefense.toString() });
    allClues.push({ label: 'Speed', value: targetPokemon.stats.speed.toString() });
    
    const clues = shuffle(allClues);

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
