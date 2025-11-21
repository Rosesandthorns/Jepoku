# **App Name**: Jepoku

## Core Features:

- Puzzle Generation: Dynamically generate a new reverse Pokedoku grid (3x3) with Pokémon images from PokeAPI.
- Attribute Determination: Behind the scenes, programatically select Pokemon attributes to use as row/column criteria (using PokeAPI data), ensuring logical consistency and solveability.
- Input Guessing: Allow users to input their guesses for each row and column's common attribute via a form input.
- Submission and Validation: Submit the guesses and validate them against the actual common attributes (using PokeAPI data). Display if the answers were right or not.
- Scoring and Leaderboard: Keep track of how many boards are guessed correctly to display how far you've progressed.

## Style Guidelines:

- Primary color: Light Indigo (#9770FF) to reflect psychic and ghost type theming, aligning to mystery and problem solving.
- Background color: Light Gray (#EEEEEE) to provide a clean and neutral backdrop.
- Accent color: Soft Green (#70FF79) to provide a subtle and informative secondary theme.
- Body and headline font: 'Inter', a sans-serif, for a clean, modern user experience.
- Use minimalist icons related to game actions like submission and scoring.
- The 3x3 grid should be centered on the screen, with clearly labeled input fields for guesses.
- Use subtle animations, such as highlighting correct guesses and gently revealing Pokémon upon solving a puzzle.