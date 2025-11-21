import 'server-only';
import type { Pokemon } from './definitions';
import { unstable_cache } from 'next/cache';

const POKEAPI_URL = 'https://pokeapi.co/api/v2';
const POKEMON_COUNT = 1025; // As of Gen 9

interface PokeApiResource {
  name: string;
  url: string;
}

interface PokeApiName {
  language: PokeApiResource;
  name: string;
}

interface PokeApiType {
  slot: number;
  type: PokeApiResource;
}

interface PokeApiPokemon {
  id: number;
  name:string;
  types: PokeApiType[];
}

export const getPokemonTypes = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const response = await fetch(`${POKEAPI_URL}/type`);
      if (!response.ok) throw new Error('Failed to fetch types');
      const data = await response.json();
      const types = data.results
        .map((t: PokeApiResource) => t.name)
        .filter((t: string) => !['unknown', 'shadow'].includes(t));
      return types;
    } catch (error) {
      console.error("Error fetching Pokemon types:", error);
      return [];
    }
  },
  ['pokemon-types'],
  { revalidate: 3600 * 24 } // Revalidate once a day
);

export const getAllPokemonWithTypes = unstable_cache(
  async (): Promise<Pokemon[]> => {
    try {
      const response = await fetch(`${POKEAPI_URL}/pokemon?limit=${POKEMON_COUNT}`);
      if (!response.ok) throw new Error('Failed to fetch Pokemon list');
      const listData = await response.json();

      const pokemonPromises: Promise<Pokemon | null>[] = listData.results.map(async (p: PokeApiResource) => {
        try {
          const pokemonRes = await fetch(p.url);
          if (!pokemonRes.ok) return null;
          const pokemonData: PokeApiPokemon = await pokemonRes.json();
          
          return {
            id: pokemonData.id,
            name: pokemonData.name,
            types: pokemonData.types.map(t => t.type.name),
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`,
          };
        } catch {
          return null;
        }
      });

      const allPokemon = (await Promise.all(pokemonPromises)).filter((p): p is Pokemon => p !== null && p.types.length > 0);
      return allPokemon;
    } catch (error) {
      console.error("Error fetching all Pokemon details:", error);
      return [];
    }
  },
  ['all-pokemon-with-types'],
  { revalidate: 3600 * 24 } // Revalidate once a day
);
