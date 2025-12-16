
'use server';
import 'server-only';
import type { Pokemon } from './definitions';
import { unstable_cache } from 'next/cache';
import { POKEAPI_URL, POKEMON_COUNT, POKEMON_CACHE_TAG } from './constants';

const PARTNER_POKEMON = [
    'bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee',
    'chikorita', 'cyndaquil', 'totodile',
    'treecko', 'torchic', 'mudkip',
    'turtwig', 'chimchar', 'piplup',
    'snivy', 'tepig', 'oshawott',
    'chespin', 'fennekin', 'froakie',
    'rowlet', 'litten', 'popplio',
    'grookey', 'scorbunny', 'sobble',
    'sprigatito', 'fuecoco', 'quaxly'
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

interface PokeApiMove {
    move: PokeApiResource;
}

interface PokeApiStat {
    base_stat: number;
    stat: PokeApiResource;
}

interface PokeApiPokemon {
  id: number;
  name:string;
  types: PokeApiType[];
  abilities: PokeApiAbility[];
  moves: PokeApiMove[];
  species: PokeApiResource;
  stats: PokeApiStat[];
  height: number;
  weight: number;
}

interface PokeApiFlavorTextEntry {
    flavor_text: string;
    language: PokeApiResource;
}

interface PokeApiVariety {
    is_default: boolean;
    pokemon: PokeApiResource;
}

interface PokeApiSpecies {
    id: number;
    name: string;
    evolution_chain: { url: string; };
    evolves_from_species: PokeApiResource | null;
    generation: PokeApiResource;
    is_legendary: boolean;
    is_mythical: boolean;
    flavor_text_entries: PokeApiFlavorTextEntry[];
    egg_groups: PokeApiResource[];
    varieties: PokeApiVariety[];
}

interface EvolutionNode {
    species: PokeApiResource;
    evolves_to: EvolutionNode[];
}

interface PokeApiEvolutionChain {
    id: number;
    chain: EvolutionNode;
}

const generationToRegionMap: { [key: string]: string } = {
    'generation-i': 'Kanto',
    'generation-ii': 'Johto',
    'generation-iii': 'Hoenn',
    'generation-iv': 'Sinnoh',
    'generation-v': 'Unova',
    'generation-vi': 'Kalos',
    'generation-vii': 'Alola',
    'generation-viii': 'Galar',
    'generation-ix': 'Paldea',
}

const generationToIdMap: { [key: string]: number } = {
    'generation-i': 1,
    'generation-ii': 2,
    'generation-iii': 3,
    'generation-iv': 4,
    'generation-v': 5,
    'generation-vi': 6,
    'generation-vii': 7,
    'generation-viii': 8,
    'generation-ix': 9,
}

function toSentenceCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function cleanFlavorText(text: string): string {
    return text
        .replace(/[\n\f\r]/g, ' ')
        .replace(/POKéMON/g, 'Pokémon')
        .split('. ')
        .map(sentence => toSentenceCase(sentence))
        .join('. ');
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
  { revalidate: 3600 } // Revalidate once an hour
);

function getEvolutionLineSize(chain: EvolutionNode): number {
    let size = 0;
    const queue = [chain];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node) {
            size++;
            node.evolves_to.forEach(evo => queue.push(evo));
        }
    }
    return size;
}

export const getAllPokemonWithDetails = unstable_cache(
  async (): Promise<Pokemon[]> => {
    try {
      console.log('Fetching all Pokemon details...');
      const response = await fetch(`${POKEAPI_URL}/pokemon?limit=${POKEMON_COUNT}`);
      if (!response.ok) throw new Error('Failed to fetch Pokemon list');
      const listData = await response.json();

      const evolutionChainCache = new Map<string, PokeApiEvolutionChain>();
      
      const processPokemon = async (p: PokeApiResource): Promise<Pokemon | null> => {
        try {
          const pokemonRes = await fetch(p.url);
          if (!pokemonRes.ok) return null;
          const pokemonData: PokeApiPokemon = await pokemonRes.json();
          
          const speciesRes = await fetch(pokemonData.species.url);
          if (!speciesRes.ok) return null;
          const speciesData: PokeApiSpecies = await speciesRes.json();

          let evolutionChainData = evolutionChainCache.get(speciesData.evolution_chain.url);
          if (!evolutionChainData) {
              const evolutionChainRes = await fetch(speciesData.evolution_chain.url);
              if (evolutionChainRes.ok) {
                  evolutionChainData = await evolutionChainRes.json();
                  evolutionChainCache.set(speciesData.evolution_chain.url, evolutionChainData!);
              }
          }
          
          if (!evolutionChainData) return null;

          const evolutionLineSize = getEvolutionLineSize(evolutionChainData.chain);

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

          const isMega = speciesData.varieties.some(v => !v.is_default && v.pokemon.name.includes('-mega'));
          const region = generationToRegionMap[speciesData.generation.name] || 'Unknown';

          const stats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
          pokemonData.stats.forEach(s => {
              switch(s.stat.name) {
                  case 'hp': stats.hp = s.base_stat; break;
                  case 'attack': stats.attack = s.base_stat; break;
                  case 'defense': stats.defense = s.base_stat; break;
                  case 'special-attack': stats.specialAttack = s.base_stat; break;
                  case 'special-defense': stats.specialDefense = s.base_stat; break;
                  case 'speed': stats.speed = s.base_stat; break;
              }
          });

          const abilities = pokemonData.abilities.map(a => a.ability.name);
          const isUltraBeast = abilities.includes('beast-boost');
          const isParadox = abilities.includes('protosynthesis') || abilities.includes('quark-drive');

          const englishFlavorText = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
          const pokedexEntry = englishFlavorText ? cleanFlavorText(englishFlavorText.flavor_text) : 'No Pokédex entry found.';
          const eggGroups = speciesData.egg_groups.map(eg => eg.name);

          return {
            id: pokemonData.id,
            name: pokemonData.name,
            types: pokemonData.types.map(t => t.type.name),
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`,
            isMega,
            region,
            abilities,
            moves: pokemonData.moves.map(m => m.move.name),
            canEvolve,
            isFinalEvolution,
            isPartner: PARTNER_POKEMON.includes(pokemonData.name),
            isLegendary: speciesData.is_legendary,
            isMythical: speciesData.is_mythical,
            isUltraBeast,
            isParadox,
            height: pokemonData.height,
            weight: pokemonData.weight,
            pokedexEntry,
            stats,
            eggGroups,
            evolutionLineSize,
          };
        } catch (e) {
          console.error(`Failed to process ${p.name}`, e)
          return null;
        }
      };

      // Batch requests to prevent hitting rate limits or memory issues
      const BATCH_SIZE = 20;
      const allPokemon: Pokemon[] = [];
      const items = listData.results as PokeApiResource[];

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(processPokemon));
          allPokemon.push(...batchResults.filter((p): p is Pokemon => p !== null));
      }

      console.log(`Successfully fetched ${allPokemon.length} Pokemon details.`);
      return allPokemon;
    } catch (error) {
      console.error("Error fetching all Pokemon details:", error);
      return [];
    }
  },
  [POKEMON_CACHE_TAG],
  { 
    revalidate: 3600,
    tags: [POKEMON_CACHE_TAG]
  }
);

    