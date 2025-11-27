
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

export async function createEasyCriteriaPuzzle(): Promise<Puzzle | null> {
    console.log(`--- Generating new puzzle for mode: easy-criteria ---`);
    const allPokemon = await getAllPokemonWithDetails();
    if (!allPokemon.length) {
        console.error("No Pokemon data available.");
        return null;
    }

    const targetPokemon = shuffle(allPokemon)[0];
    const clues: { label: string; value: string }[] = [];
    const genId = generationToIdMap[targetPokemon.region] || 0;

    // --- New Fixed Order Clues ---
    clues.push({ label: 'Type 1', value: formatString(targetPokemon.types[0]) });
    clues.push({ label: 'Type 2', value: targetPokemon.types[1] ? formatString(targetPokemon.types[1]) : 'None' });
    
    clues.push({ label: 'Generation Era', value: genId >= 5 ? 'Gen 5 or Above' : 'Gen 4 or Below' });

    clues.push({ label: 'Primary Egg Group', value: targetPokemon.eggGroups.length > 0 ? formatString(targetPokemon.eggGroups[0]) : 'None' });
    
    clues.push({ label: 'Generation', value: targetPokemon.region });
    
    clues.push({ label: 'Base Stat Total', value: Object.values(targetPokemon.stats).reduce((a, b) => a + b, 0).toString() });
    
    clues.push({ label: 'Pokédex Number', value: targetPokemon.id.toString() });

    clues.push({ label: 'A Possible Ability', value: formatString(shuffle(targetPokemon.abilities)[0]) });

    let evoStatus = 'Does Not Evolve';
    if (targetPokemon.canEvolve) evoStatus = 'Can Evolve';
    else if (targetPokemon.isFinalEvolution) evoStatus = 'Final Evolution';
    clues.push({ label: 'Evolution Status', value: evoStatus });


    console.log(`[easy-criteria] Successfully generated puzzle. Target: ${targetPokemon.name}`);

    return {
        grid: [],
        rowAnswers: [],
        colAnswers: [],
        mode: 'easy-criteria',
        targetPokemon,
        clues,
    };
}
