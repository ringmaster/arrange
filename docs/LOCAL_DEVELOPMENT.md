# Local Development Setup for Music Arrangement Analyzer

This guide provides instructions for setting up and running the Music Arrangement Analyzer project on your local machine.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm (included with Node.js)
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/score.git
cd score
```

### 2. Install Dependencies

From the project root directory, run:

```bash
npm install
```

This will install all necessary dependencies defined in `package.json`.

### 3. Start the Development Server

Launch the development server with:

```bash
npm run dev
```

This will start the Vite development server. Open your browser and navigate to:

```
http://localhost:5173/
```

The page will automatically reload when you make changes to the code.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to analyze code for potential errors

## Project Structure

```
score/
├── public/          # Static assets
├── src/
│   ├── assets/      # Images, fonts, etc.
│   ├── components/  # React components
│   ├── styles/      # CSS stylesheets
│   ├── utils/       # Utility functions
│   ├── App.tsx      # Main application component
│   ├── main.tsx     # Application entry point
│   └── types.ts     # TypeScript type definitions
├── index.html       # HTML template
└── vite.config.ts   # Vite configuration
```

## Making Changes

### Components

The application uses React functional components with hooks. Here's an example of how to modify a component:

1. Open the component file, e.g., `src/components/InstrumentRow.tsx`
2. Make your changes
3. Save the file
4. The browser will automatically reload to show your changes

### Styling

The application uses standard CSS files located in the `src/styles/` directory. Each component typically has its own CSS file.

### Type Definitions

All TypeScript interfaces are defined in `src/types.ts`. When adding new features, make sure to update the type definitions accordingly.

## Testing Your Changes

After making changes, make sure to:

1. Check for any TypeScript errors in the terminal
2. Verify your changes work as expected in the browser
3. Test edge cases and different screen sizes

## Building for Production

To create a production build:

```bash
npm run build
```

This will generate optimized files in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Troubleshooting

### Development Server Issues

If you encounter problems with the development server:

1. Stop the server (Ctrl+C)
2. Delete the `node_modules/.vite` directory
3. Restart the server with `npm run dev`

### Dependencies Issues

If you encounter dependency-related errors:

1. Delete the `node_modules` directory
2. Delete the `package-lock.json` file
3. Run `npm install` again

## Contributing

When contributing to this project:

1. Make your changes in a feature branch
2. Ensure all lint checks pass with `npm run lint`
3. Build the project with `npm run build` to ensure it builds successfully
4. Submit a pull request with a clear description of your changes
