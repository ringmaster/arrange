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
  onUpdateActivity: (instrumentId: string, activityId: string, startBar: number, endBar: number) => void;
  onDeleteActivity: (instrumentId: string, activityId: string) => void;
}

const ArrangementGrid: React.FC<ArrangementGridProps> = ({
  instruments,
  sections,
  totalBars,
  onAddInstrument,
  onUpdateInstrumentName,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Function to convert bar number to position percentage with exact grid alignment
  const barToPercent = (bar: number) => {
    return ((bar - 1) / totalBars) * 100;
  };

  // Function to calculate section backgrounds for the grid
  const getSectionBackgrounds = () => {
    const sortedSections = [...sections].sort((a, b) => a.startBar - b.startBar);

    return sortedSections.map((section, index) => {
      const isEven = index % 2 === 0;

      // Calculate the bar width as a percentage
      const barWidth = 100 / totalBars;

      // Calculate start with a small gap (1/5 of a bar width)
      const startBar = section.startBar;
      const startPercent = ((startBar - 1) / totalBars) * 100;
      const gapSize = barWidth / 5;
      const adjustedStartPercent = startPercent + gapSize;

      // Calculate end to be exactly at the end of the last bar
      const endBar = section.endBar;
      const endPercent = ((endBar) / totalBars) * 100;

      return {
        left: `${adjustedStartPercent}%`,
        width: `${endPercent - adjustedStartPercent}%`,
        backgroundColor: isEven ? 'rgba(200, 200, 200, 0.2)' : 'rgba(240, 240, 240, 0.2)'
      };
    });
  };

  // Handler for clicking on the empty area below instrument rows
  const handleAddInstrumentClick = () => {
    onAddInstrument();
  };

  return (
    <div className="arrangement-grid-container" ref={gridRef}>
      {/* Timeline with bar numbers */}
      <div className="timeline-ruler">
        {Array.from({ length: totalBars }, (_, i) => i + 1).map(barNum => (
          <div
            key={`ruler-${barNum}`}
            className={`ruler-mark ${barNum % 4 === 1 ? 'major-bar' : ''}`}
            style={{ left: `${barToPercent(barNum)}%` }}
          >
            {barNum % 4 === 1 && (
              <span className="bar-number">{barNum}</span>
            )}
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
              style={style}
            />
          ))}
        </div>

        {/* Vertical grid lines */}
        <div className="grid-lines">
          {Array.from({ length: totalBars + 1 }, (_, i) => i + 1).map(barNum => (
            <div
              key={`gridline-${barNum}`}
              className={`grid-line ${barNum % 4 === 1 ? 'major-line' : ''}`}
              style={{ left: `${barToPercent(barNum)}%` }}
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
              onUpdateName={(name) => onUpdateInstrumentName(instrument.id, name)}
              onAddActivity={(startBar, endBar) => onAddActivity(instrument.id, startBar, endBar)}
              onUpdateActivity={(activityId, startBar, endBar) =>
                onUpdateActivity(instrument.id, activityId, startBar, endBar)
              }
              onDeleteActivity={(activityId) => onDeleteActivity(instrument.id, activityId)}
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
