import 'server-only';
import { getAllPokemonWithDetails, getPokemonTypes } from './pokedex';
import type { Puzzle, Pokemon } from './definitions';

const MAX_RETRIES = 50;

type Criterion = string;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function checkPokemon(pokemon: Pokemon, criterion: Criterion): boolean {
    if (criterion === 'Mega') return pokemon.isMega;
    if (criterion === 'Kanto') return pokemon.region === 'Kanto';
    if (criterion === 'Johto') return pokemon.region === 'Johto';
    if (criterion === 'Has: Sturdy') return pokemon.abilities.includes('sturdy');
    if (criterion === 'Can Evolve') return pokemon.canEvolve;
    if (criterion === 'Final Evolution') return pokemon.isFinalEvolution;
    if (criterion === 'Partner Pokemon') return pokemon.isPartner;
    // Assume it's a type if not any other criterion
    return pokemon.types.includes(criterion.toLowerCase());
}

async function getCriteria(): Promise<Criterion[]> {
    const types = await getPokemonTypes();
    return [
        ...types,
        'Mega',
        'Kanto',
        'Johto',
        'Has: Sturdy',
        'Can Evolve',
        'Final Evolution',
        'Partner Pokemon'
    ];
}

export async function generatePuzzle(): Promise<Puzzle | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const allPokemon = await getAllPokemonWithDetails();
    if (allPokemon.length === 0) {
      console.error("No Pokemon data available on attempt", attempt);
      continue;
    }

    const availableCriteria = await getCriteria();
    let criteriaPool = shuffle([...availableCriteria]);
    
    const grid: (Pokemon | null)[][] = Array(3).fill(null).map(() => Array(3).fill(null));
    const usedPokemonIds = new Set<number>();
    const usedCriteria = new Set<Criterion>();
    
    const rowAnswers: (Criterion | '')[] = ['', '', ''];
    const colAnswers: (Criterion | '')[] = ['', '', ''];

    try {
      // 1. Choose top-left column criterion and mon
      colAnswers[0] = criteriaPool.pop()!;
      usedCriteria.add(colAnswers[0]);
      
      const mon00Candidates = allPokemon.filter(p => checkPokemon(p, colAnswers[0]));
      if (mon00Candidates.length === 0) continue;
      const mon00 = shuffle(mon00Candidates)[0];
      grid[0][0] = mon00;
      usedPokemonIds.add(mon00.id);

      // 2. Determine top-left row criterion
      const row0Candidates = criteriaPool.filter(c => checkPokemon(mon00, c) && c !== colAnswers[0]);
      if (row0Candidates.length === 0) continue;
      rowAnswers[0] = shuffle(row0Candidates)[0];
      usedCriteria.add(rowAnswers[0]);
      criteriaPool = criteriaPool.filter(c => !usedCriteria.has(c));
      
      // 3. Fill top row and determine column criteria
      for (let c = 1; c < 3; c++) {
          const monCandidates = allPokemon.filter(p => !usedPokemonIds.has(p.id) && checkPokemon(p, rowAnswers[0]));
          if(monCandidates.length === 0) throw new Error();
          const chosenMon = shuffle(monCandidates)[0];
          grid[0][c] = chosenMon;
          usedPokemonIds.add(chosenMon.id);
          
          const colCriteriaCandidates = criteriaPool.filter(crit => checkPokemon(chosenMon, crit));
          if(colCriteriaCandidates.length === 0) throw new Error();
          const chosenColCrit = shuffle(colCriteriaCandidates)[0];
          colAnswers[c] = chosenColCrit;
          usedCriteria.add(chosenColCrit);
          criteriaPool = criteriaPool.filter(crit => !usedCriteria.has(crit));
      }

      // 4. Fill rest of left-most column and determine row criteria
      for (let r = 1; r < 3; r++) {
          const monCandidates = allPokemon.filter(p => !usedPokemonIds.has(p.id) && checkPokemon(p, colAnswers[0]));
           if(monCandidates.length === 0) throw new Error();
          const chosenMon = shuffle(monCandidates)[0];
          grid[r][0] = chosenMon;
          usedPokemonIds.add(chosenMon.id);

          const rowCriteriaCandidates = criteriaPool.filter(crit => checkPokemon(chosenMon, crit));
          if(rowCriteriaCandidates.length === 0) throw new Error();
          const chosenRowCrit = shuffle(rowCriteriaCandidates)[0];
          rowAnswers[r] = chosenRowCrit;
          usedCriteria.add(chosenRowCrit);
          criteriaPool = criteriaPool.filter(crit => !usedCriteria.has(crit));
      }

      // 5. Fill remaining 4 tiles
      for (let r = 1; r < 3; r++) {
          for (let c = 1; c < 3; c++) {
              const monCandidates = allPokemon.filter(p =>
                  !usedPokemonIds.has(p.id) &&
                  checkPokemon(p, rowAnswers[r]) &&
                  checkPokemon(p, colAnswers[c])
              );
              if (monCandidates.length === 0) throw new Error();
              const chosenMon = shuffle(monCandidates)[0];
              grid[r][c] = chosenMon;
              usedPokemonIds.add(chosenMon.id);
          }
      }

      return { grid, rowAnswers: rowAnswers as string[], colAnswers: colAnswers as string[] };

    } catch (e) {
      // This attempt failed, loop will try again
    }
  }

  console.error("Failed to generate a puzzle after multiple retries.");
  return null;
}
