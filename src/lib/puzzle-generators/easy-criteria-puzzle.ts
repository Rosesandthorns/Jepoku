
'use server';

import type { Puzzle } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { shuffle } from './utils';

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

    // --- Fixed Order Clues ---
    clues.push({ label: 'Type 1', value: formatString(targetPokemon.types[0]) });
    clues.push({ label: 'Type 2', value: targetPokemon.types[1] ? formatString(targetPokemon.types[1]) : 'None' });
    
    let status = 'Regular';
    if (targetPokemon.isLegendary) status = 'Legendary';
    if (targetPokemon.isMythical) status = 'Mythical';
    if (targetPokemon.isUltraBeast) status = 'Ultra Beast';
    if (targetPokemon.isParadox) status = 'Paradox';
    clues.push({ label: 'Status', value: status });
    
    clues.push({ label: 'Region', value: targetPokemon.region });

    let evoStatus = 'Does Not Evolve';
    if (targetPokemon.canEvolve) evoStatus = 'Can Evolve';
    else if (targetPokemon.isFinalEvolution) evoStatus = 'Final Evolution';
    clues.push({ label: 'Evolution Status', value: evoStatus });
    
    clues.push({ label: 'Pokédex Number', value: targetPokemon.id.toString() });

    clues.push({ label: 'A Possible Ability', value: formatString(shuffle(targetPokemon.abilities)[0]) });
    
    clues.push({ label: 'Base Stat Total', value: Object.values(targetPokemon.stats).reduce((a, b) => a + b, 0).toString() });


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
