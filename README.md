# Music Arrangement Analyzer 🎵

A modern Single Page Application (SPA) for visualizing and editing music track arrangements by breaking down instrument activity across bars and song sections. Built with React and TypeScript.

## Features

### 📊 Grid Interface
- Timeline grid: horizontal bars (time) × vertical instrument rows
- Responsive canvas for 16-64 bars and multiple instrument rows
- Visual rendering optimized for smooth performance with drag operations
- Grid snapping to bar boundaries

### 🎸 Instrument Management
- Dynamic row creation by clicking below existing rows
- Single instrument per row with customizable names
- Inline name editing with click interaction
- Preset instruments (bass, guitar, vox, keys, pads, perc, drums)
- Automatic unique color assignment per instrument row

### 🔄 Activity Bars (Loop Visualization)
- Colored horizontal bars spanning bar columns
- Visual representation of how long each instrument plays
- Multiple non-overlapping activity bars per instrument row
- Drag interactions:
  - Drag right edge to resize duration
  - Drag entire bar to reposition within row
  - Visual feedback during drag operations

### 📝 Section Organization
- Named regions (Intro, Verse, Chorus, etc.) above timeline
- Visual grouping with clear boundaries and labels
- Independent management from instrument activities
- Drag-to-resize section boundaries
- Inline section name editing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd score
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Managing Arrangement
1. Edit the arrangement name by clicking on it in the header
2. Adjust total bar count using the dropdown in the footer
3. Export/import arrangements as JSON files using the header buttons

### Working with Sections
1. Click on the empty timeline to add a new section
2. Click on a section name to edit it
3. Drag section edges to resize them
4. Use the × button to delete a section

### Managing Instruments
1. Click "Add Instrument" at the bottom of the grid to add a new instrument row
2. Click on an instrument name to edit it
3. Each instrument automatically gets assigned a unique color
4. Instrument rows are displayed vertically in the grid

### Working with Activities
1. Click on an empty area in an instrument row to add a new activity
2. Drag the left/right edges of an activity to resize it
3. Drag the middle of an activity to reposition it
4. Use the × button to delete an activity

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules with CSS variables for theming
- **State Management**: React hooks (useState, useReducer, useCallback)
- **File Handling**: JSON import/export via browser file APIs
- **Unique IDs**: UUID for elements identification
- **Storage**: localStorage for auto-saving work in progress

## Project Structure

```
src/
├── components/              # UI Components
│   ├── ArrangementGrid.tsx  # Main grid component
│   ├── Footer.tsx           # Controls and status
│   ├── Header.tsx           # Name, import/export controls
│   ├── InstrumentRow.tsx    # Individual instrument rows
│   └── SectionBar.tsx       # Section headers and boundaries
├── styles/                  # Component styles
│   ├── ArrangementGrid.css
│   ├── Footer.css
│   ├── Header.css
│   ├── InstrumentRow.css
│   └── SectionBar.css
├── utils/                   # Utility functions
│   └── colorUtils.ts        # Color generation and manipulation
├── types.ts                 # TypeScript type definitions
├── App.tsx                  # Main application component
├── App.css                  # Application styles
├── main.tsx                 # Application entry point
├── index.css                # Global styles
└── vite-env.d.ts            # Vite type definitions
```

## Data Structure

### JSON Schema
```typescript
interface ArrangementData {
  name: string;
  totalBars: number;
  sections: Array<{
    id: string;
    name: string;
    startBar: number;
    endBar: number;
  }>;
  instruments: Array<{
    id: string;
    name: string;
    color: string;
    activities: Array<{
      id: string;
      startBar: number;
      endBar: number;
    }>;
  }>;
}
```

### User Interactions
- Click operations for selection and creation
- Drag operations for resize and repositioning
- Visual feedback during interactions
- Grid snapping to bar boundaries

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Technical Features

- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **Auto-save**: Arrangement data is automatically saved to localStorage
- **JSON Import/Export**: Save and load arrangements as JSON files
- **Drag Operations**: Smooth, responsive dragging with visual feedback
- **Optimized Rendering**: Efficient handling of typical datasets (up to 64 bars × 12 instruments)

## Limitations

- Data is stored in the browser's localStorage (not cloud-synced)
- Complex arrangements with many instruments may impact performance on older devices
- No audio playback or synchronization with actual music files

## Future Enhancements

- [ ] Audio file synchronization
- [ ] Loop repetition visualization
- [ ] Keyboard shortcuts for common operations
- [ ] Template system for common arrangements
- [ ] Export to music production formats
- [ ] Collaboration features
- [ ] Advanced analytics and statistics
- [ ] Custom color schemes and themes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- React team for the robust framework
- Vite team for the fast build tool
- Music producers and arrangers who provided feedback on the UX design
