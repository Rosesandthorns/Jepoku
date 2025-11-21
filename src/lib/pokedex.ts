import 'server-only';
import type { Pokemon } from './definitions';
import { unstable_cache } from 'next/cache';

const POKEAPI_URL = 'https://pokeapi.co/api/v2';
const POKEMON_COUNT = 251; // Kanto + Johto Pokemon
const PARTNER_POKEMON = [
    'bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee',
    'chikorita', 'cyndaquil', 'totodile'
];

interface PokeApiResource {
  name: string;
  url: string;
}

interface PokeApiType {
  slot: number;
  type: PokeApiResource;
}

interface PokeApiAbility {
    ability: PokeApiResource;
    is_hidden: boolean;
    slot: number;
}

interface PokeApiPokemon {
  id: number;
  name:string;
  types: PokeApiType[];
  abilities: PokeApiAbility[];
  species: PokeApiResource;
}

interface PokeApiSpecies {
    id: number;
    name: string;
    evolution_chain: { url: string; };
    evolves_from_species: PokeApiResource | null;
    generation: PokeApiResource;
}

interface PokeApiEvolutionChain {
    id: number;
    chain: {
        species: PokeApiResource;
        evolves_to: {
            species: PokeApiResource;
            evolves_to: {
                species: PokeApiResource;
                evolves_to: any[];
            }[];
        }[];
    };
}

interface PokeApiVariety {
    is_default: boolean;
    pokemon: PokeApiResource;
}
interface PokeApiPokemonSpecies {
    varieties: PokeApiVariety[];
}

const generationToRegion: { [key: string]: string } = {
    'generation-i': 'Kanto',
    'generation-ii': 'Johto',
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

async function hasMegaEvolution(pokemonName: string): Promise<boolean> {
    try {
        const speciesRes = await fetch(`${POKEAPI_URL}/pokemon-species/${pokemonName}`);
        if (!speciesRes.ok) return false;
        const speciesData: PokeApiPokemonSpecies = await speciesRes.json();
        return speciesData.varieties.some(v => !v.is_default && v.pokemon.name.includes('-mega'));
    } catch {
        return false;
    }
}

export const getAllPokemonWithDetails = unstable_cache(
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
          
          const speciesRes = await fetch(pokemonData.species.url);
          if (!speciesRes.ok) return null;
          const speciesData: PokeApiSpecies = await speciesRes.json();

          const evolutionChainRes = await fetch(speciesData.evolution_chain.url);
          if (!evolutionChainRes.ok) return null;
          const evolutionChainData: PokeApiEvolutionChain = await evolutionChainRes.json();

          let canEvolve = false;
          let isFinalEvolution = false;

          const findInChain = (chain: any): any => {
              if (chain.species.name === pokemonData.name) return chain;
              for(const evo of chain.evolves_to) {
                  const found = findInChain(evo);
                  if (found) return found;
              }
              return null;
          }

          const evolutionNode = findInChain(evolutionChainData.chain);
          
          if (evolutionNode) {
              canEvolve = evolutionNode.evolves_to.length > 0;
              isFinalEvolution = evolutionNode.evolves_to.length === 0 && !!speciesData.evolves_from_species;
          }

          const isMega = await hasMegaEvolution(pokemonData.name);
          const region = generationToRegion[speciesData.generation.name] || 'Unknown';


          return {
            id: pokemonData.id,
            name: pokemonData.name,
            types: pokemonData.types.map(t => t.type.name),
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`,
            isMega,
            region,
            abilities: pokemonData.abilities.map(a => a.ability.name),
            canEvolve,
            isFinalEvolution,
            isPartner: PARTNER_POKEMON.includes(pokemonData.name),
          };
        } catch (e) {
          console.error(`Failed to process ${p.name}`, e)
          return null;
        }
      });

      const allPokemon = (await Promise.all(pokemonPromises)).filter((p): p is Pokemon => p !== null);
      return allPokemon;
    } catch (error) {
      console.error("Error fetching all Pokemon details:", error);
      return [];
    }
  },
  ['all-pokemon-with-details-gen2'],
  { revalidate: 3600 * 24 } // Revalidate once a day
);
