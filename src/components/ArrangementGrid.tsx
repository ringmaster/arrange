import React, { useRef } from 'react';
import type { Instrument, Section } from '../types';
import InstrumentRow from './InstrumentRow';
import '../styles/ArrangementGrid.css';

interface ArrangementGridProps {
  instruments: Instrument[];
  sections: Section[];
  totalBars: number;
  onAddInstrument: () => void;
  onUpdateInstrumentName: (instrumentId: string, name: string) => void;
  onAddActivity: (instrumentId: string, startBar: number, endBar: number) => void;
  onUpdateActivity: (instrumentId: string, activityId: string, startBar: number, endBar: number, variation?: number) => void;
  onDeleteActivity: (instrumentId: string, activityId: string) => void;
  onSeekToBar?: (barIndex: number) => void;
}

const ArrangementGrid: React.FC<ArrangementGridProps> = ({
  instruments,
  sections,
  totalBars,
  onAddInstrument,
  onUpdateInstrumentName,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onSeekToBar
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Function to convert bar number to position percentage with exact grid alignment
  const barToPercent = (bar: number) => {
    return ((bar - 1) / totalBars) * 100;
  };

  // Function to calculate section backgrounds for the grid
  const getSectionBackgrounds = () => {
    const sortedSections = [...sections].sort((a, b) => a.startBar - b.startBar);

    return sortedSections.map((section) => {
      // The section background styles are calculated below

      // Calculate start to be exactly at the start of the section
      const startBar = section.startBar;
      const startPercent = ((startBar - 1) / totalBars) * 100;

      // Calculate end to be exactly at the end of the last bar
      const endBar = section.endBar;
      const endPercent = ((endBar) / totalBars) * 100;

      return {
        left: `${startPercent}%`,
        width: `${endPercent - startPercent}%`,
        backgroundColor: 'hsl(222, 47%, 11%)',
        borderLeft: '5px solid #4a5568',
        borderRight: '5px solid #4a5568'
      };
    });
  };

  // Handler for clicking on the empty area below instrument rows
  const handleAddInstrumentClick = () => {
    onAddInstrument();
  };

  // Handle click on the grid to seek to a specific bar when shift key is pressed
  const handleGridClick = (e: React.MouseEvent) => {
    // Only handle when shift key is pressed and onSeekToBar is provided
    if (!e.shiftKey || !onSeekToBar) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    // Calculate which bar was clicked based on position
    const relativeX = e.clientX - gridRect.left;
    const gridWidth = gridRect.width;

    let barIndex;
    if (totalBars > 64) {
      // Fixed width mode (20px per bar)
      barIndex = Math.floor(relativeX / 20);
    } else {
      // Percentage-based mode
      const clickPercent = relativeX / gridWidth;
      barIndex = Math.floor(clickPercent * totalBars);
    }

    // Ensure the bar index is within valid range
    if (barIndex >= 0 && barIndex < totalBars) {
      console.log(`Shift+Click: Seeking to bar ${barIndex + 1}`);
      onSeekToBar(barIndex);
    }
  };

  return (
    <div
      className="arrangement-grid-container"
      ref={gridRef}
      data-bars-count={totalBars > 64 ? "65" : totalBars.toString()}
      onClick={handleGridClick}
      title={onSeekToBar ? "Shift+Click to seek audio to this position" : ""}
    >
      {/* Timeline with bar numbers */}
      <div className="timeline-ruler">
        {Array.from({ length: totalBars }, (_, i) => i + 1).map(barNum => (
          <div
            key={`ruler-${barNum}`}
            className={`ruler-mark ${barNum % 4 === 1 ? 'major-bar' : ''}`}
            style={{
              left: totalBars > 64
                ? `calc(${barNum - 1} * 20px)`
                : `${barToPercent(barNum)}%`
            }}
          >
            <span className="bar-number">{barNum}</span>
          </div>
        ))}
      </div>

      {/* Main grid area */}
      <div className="grid-content">
        {/* Section background guides */}
        <div className="section-backgrounds">
          {getSectionBackgrounds().map((style, index) => (
            <div
              key={`section-bg-${index}`}
              className="section-background"
              style={totalBars > 64
                ? {
                  left: `calc(${parseFloat((style.left as string).replace('%', '')) / 100 * totalBars * 20}px)`,
                  width: `calc(${parseFloat((style.width as string).replace('%', '')) / 100 * totalBars * 20}px)`,
                  backgroundColor: style.backgroundColor,
                  borderLeft: style.borderLeft,
                  borderRight: style.borderRight
                }
                : style
              }
            />
          ))}
        </div>

        {/* Vertical grid lines */}
        <div className="grid-lines">
          {Array.from({ length: totalBars + 1 }, (_, i) => i + 1).map(barNum => (
            <div
              key={`gridline-${barNum}`}
              className={`grid-line ${barNum % 4 === 1 ? 'major-line' : ''}`}
              style={{
                left: totalBars > 64
                  ? `calc(${barNum - 1} * 20px)`
                  : `${barToPercent(barNum)}%`
              }}
            />
          ))}
        </div>

        {/* Instrument rows */}
        <div className="instrument-rows">
          {instruments.map(instrument => (
            <InstrumentRow
              key={instrument.id}
              instrument={instrument}
              totalBars={totalBars}
              sections={sections}
              onUpdateName={(name: string) => onUpdateInstrumentName(instrument.id, name)}
              onAddActivity={(startBar: number, endBar: number) => onAddActivity(instrument.id, startBar, endBar)}
              onUpdateActivity={(activityId: string, startBar: number, endBar: number, variation?: number) =>
                onUpdateActivity(instrument.id, activityId, startBar, endBar, variation)
              }
              onDeleteActivity={(activityId: string) => onDeleteActivity(instrument.id, activityId)}
              barToPercent={barToPercent}
            />
          ))}
        </div>

        {/* Add instrument button area */}
        <div
          className="add-instrument-area"
          onClick={handleAddInstrumentClick}
          title="Click here to add a new instrument"
        >
          <div className="add-instrument-button">
            <span className="plus-icon">+</span>
            <span>Add Instrument</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrangementGrid;
