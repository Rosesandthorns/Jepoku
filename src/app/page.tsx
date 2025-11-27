
import Link from 'next/link';
import { PuzzleLoader } from '@/components/puzzle-loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { RefreshButton } from '@/components/refresh-button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-2 sm:p-4 md:p-6 justify-start">
      <div className="w-full max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-5xl font-bold tracking-tighter text-primary sm:text-6xl font-headline">
              Jepoku
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              A reverse Pokedoku. Can you guess the common trait?
            </p>
          </div>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open game modes</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Game Modes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/?mode=easy" >Easy Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/" >Normal Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=hard" >Hard Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=dual" >Dual Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=dex" >Dex Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=sprite" >Sprite Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=timer" >Timer Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=blinded" >Blinded Mode</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=order" >Order Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=odd-one-out" >Odd one out</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=miss-matched" >Miss Matched</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=imposter" >Imposter</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/?mode=ditto" >Ditto Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=criteria" >Criteria Mode</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/?mode=easy-criteria" >Easy Criteria</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Coming Soon</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                    Scarred Mode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <RefreshButton />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <PuzzleLoader />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">PokeAPI</a>. All Pokémon content is &copy; Nintendo, Game Freak, and The Pokémon Company.</p>
        </footer>
      </div>
    </main>
  );
}
