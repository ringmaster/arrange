# Music Arrangement Analyzer - GitHub Pages Deployment

This branch contains the built version of the Music Arrangement Analyzer web application, designed to be served through GitHub Pages. This is an automated deployment built from the source code in the main branch of the [arrange](https://github.com/ringmaster/arrange) repository.

## About the Application

Music Arrangement Analyzer is a visual tool for breaking down instrument activity across bars and song sections. It allows music producers, composers, and arrangers to visualize and edit music track arrangements.

## Features

- **Instrument Tracks**: Add multiple instrument rows with custom names and colors
- **Section Management**: Define song sections with custom names and durations
- **Activity Bars**: Visualize when instruments are active with color-coded bars
- **Color Variations**: Cycle through color variations by scrolling on activity bars
- **Drag Interactions**: Resize and move sections and activities with intuitive drag operations
- **Local Storage**: Your arrangements are automatically saved in your browser

## Development

The source code for this application is in the `main` branch of the [arrange repository](https://github.com/ringmaster/arrange). The `gh-pages` branch is automatically updated by GitHub Actions whenever changes are pushed to the main branch.

To contribute to this project:

1. Clone the repository: `git clone https://github.com/ringmaster/arrange.git`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Make your changes
5. Submit a pull request

## License

This project is available under the MIT License.
