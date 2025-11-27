
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
    const independentClues: { label: string; value: string }[] = [];

    // --- Independent Clues ---
    independentClues.push({ label: 'Type 1', value: formatString(targetPokemon.types[0]) });
    independentClues.push({ label: 'Type 2', value: targetPokemon.types[1] ? formatString(targetPokemon.types[1]) : 'None' });
    independentClues.push({ label: 'Primary Egg Group', value: targetPokemon.eggGroups.length > 0 ? formatString(targetPokemon.eggGroups[0]) : 'None' });
    
    let evoStatus = 'Does Not Evolve';
    if (targetPokemon.canEvolve) evoStatus = 'Can Evolve';
    else if (targetPokemon.isFinalEvolution) evoStatus = 'Final Evolution';
    independentClues.push({ label: 'Evolution Status', value: evoStatus });
    
    independentClues.push({ label: 'Possible Ability', value: formatString(shuffle(targetPokemon.abilities)[0]) });
    independentClues.push({ label: 'Evolution Line Size', value: `${targetPokemon.evolutionLineSize}` });

    let status = 'Regular';
    if (targetPokemon.isLegendary) status = 'Legendary';
    if (targetPokemon.isMythical) status = 'Mythical';
    if (targetPokemon.isUltraBeast) status = 'Ultra Beast';
    if (targetPokemon.isParadox) status = 'Paradox';
    independentClues.push({ label: 'Status', value: status });

    const randomMoves = shuffle(targetPokemon.moves).slice(0, 2);
    if(randomMoves[0]) independentClues.push({ label: 'Learns', value: formatString(randomMoves[0]) });
    if(randomMoves[1]) independentClues.push({ label: 'Also Learns', value: formatString(randomMoves[1]) });

    const bst = Object.values(targetPokemon.stats).reduce((a, b) => a + b, 0);
    independentClues.push({ label: 'Base Stat Total', value: bst.toString() });
    independentClues.push({ label: 'HP', value: targetPokemon.stats.hp.toString() });
    independentClues.push({ label: 'Attack', value: targetPokemon.stats.attack.toString() });
    independentClues.push({ label: 'Defense', value: targetPokemon.stats.defense.toString() });
    independentClues.push({ label: 'Sp. Atk', value: targetPokemon.stats.specialAttack.toString() });
    independentClues.push({ label: 'Sp. Def', value: targetPokemon.stats.specialDefense.toString() });
    independentClues.push({ label: 'Speed', value: targetPokemon.stats.speed.toString() });

    // --- Dependent Clues Logic ---
    const shuffledIndependent = shuffle(independentClues);
    const finalClues: { label: string; value: string }[] = [];
    
    const genId = generationToIdMap[targetPokemon.region] || 0;
    const genEraClue = { label: 'Generation Era', value: genId >= 5 ? 'Gen 5 or Above' : 'Gen 4 or Below' };
    const genSpecificClue = { label: 'Generation', value: targetPokemon.region };
    const dexClue = { label: 'Pokédex Number', value: targetPokemon.id.toString() };

    // Insert generation era clue at a random position
    const eraClueIndex = Math.floor(Math.random() * (shuffledIndependent.length + 1));
    shuffledIndependent.splice(eraClueIndex, 0, genEraClue);

    // Now, build the final list, inserting dependent clues after their prerequisites
    let genEraClueAdded = false;
    let genSpecificClueAdded = false;
    const cluesToAddLater: {prereq: string, clue: {label: string, value: string}}[] = [
        {prereq: 'Generation Era', clue: genSpecificClue},
        {prereq: 'Generation', clue: dexClue}
    ];

    for (const clue of shuffledIndependent) {
        finalClues.push(clue);
        
        const dependentClue = cluesToAddLater.find(d => d.prereq === clue.label);
        if (dependentClue) {
            finalClues.push(dependentClue.clue);
        }
    }

    console.log(`[criteria] Successfully generated puzzle. Target: ${targetPokemon.name}`);

    return {
        grid: [],
        rowAnswers: [],
        colAnswers: [],
        mode: 'criteria',
        targetPokemon,
        clues: finalClues,
    };
}
