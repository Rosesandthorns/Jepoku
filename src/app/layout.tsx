import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Jepoku',
  description: 'A reverse Pokedoku game. Guess the common traits!',
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: { mode?: string };
}>) {
  const mode = params?.mode;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(
        "font-body antialiased transition-colors duration-500",
        mode === 'hard' ? "bg-red-950/20" : "",
        mode === 'blinded' ? "bg-gray-900/90" : "",
      )}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
