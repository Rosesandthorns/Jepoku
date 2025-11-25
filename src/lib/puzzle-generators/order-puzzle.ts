
'use server';

import type { Puzzle, Pokemon, OrderBy } from '@/lib/definitions';
import { getAllPokemonWithDetails } from '@/lib/pokedex';
import { shuffle } from './utils';

export async function createOrderPuzzle(): Promise<Puzzle | null> {
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
        pokemonList: shuffle(pokemonList),
        orderBy,
        orderDirection,
        correctOrderIds,
    };
}
