import React, { useState, useRef, useEffect } from 'react';
import type { Instrument } from '../types';
import { getContrastTextColor } from '../utils/colorUtils';
import '../styles/InstrumentRow.css';

// Helper function to ensure exact bar positioning
const getExactBarPosition = (bar: number, totalBars: number): number => {
  return ((bar - 1) / totalBars) * 100;
};

// Function to calculate the exact width of an activity bar
const getExactBarWidth = (startBar: number, endBar: number, totalBars: number): number => {
  // Calculate percentage width that spans the exact number of bars
  return ((endBar - startBar + 1) / totalBars) * 100;
};

interface InstrumentRowProps {
  instrument: Instrument;
  totalBars: number;
  onUpdateName: (name: string) => void;
  onAddActivity: (startBar: number, endBar: number) => void;
  onUpdateActivity: (activityId: string, startBar: number, endBar: number) => void;
  onDeleteActivity: (activityId: string) => void;
  barToPercent: (bar: number) => number;
}

const InstrumentRow: React.FC<InstrumentRowProps> = ({
  instrument,
  totalBars,
  onUpdateName,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  barToPercent
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(instrument.name);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    activityId: string | null;
    edge: 'start' | 'end' | 'move' | null;
    initialBar: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const rowRef = useRef<HTMLDivElement>(null);

  // Calculate text color based on background color for contrast
  const textColor = getContrastTextColor(instrument.color);

  // Convert mouse position to bar number
  const positionToBar = (clientX: number) => {
    if (!rowRef.current) return 1;

    const rect = rowRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percent = relativeX / rect.width;
    const bar = Math.max(1, Math.min(totalBars, Math.round(percent * totalBars)));

    return bar;
  };

  // Handle clicking on the instrument name
  const handleNameClick = () => {
    setTempName(instrument.name);
    setIsEditingName(true);
  };

  // Handle finishing name edit
  const handleNameBlur = () => {
    if (tempName.trim()) {
      onUpdateName(tempName);
    } else {
      setTempName(instrument.name);
    }
    setIsEditingName(false);
  };

  // Handle key events in name input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setTempName(instrument.name);
      setIsEditingName(false);
    }
  };

  // Start dragging an activity
  const handleActivityMouseDown = (
    e: React.MouseEvent,
    activityId: string,
    edge: 'start' | 'end' | 'move'
  ) => {
    e.preventDefault();
    const activity = instrument.activities.find(a => a.id === activityId);
    if (!activity) return;

    // Capture initial values
    const initialBar = positionToBar(e.clientX);

    setIsDragging(true);
    setDragInfo({
      activityId,
      edge,
      initialBar,
      initialStart: activity.startBar,
      initialEnd: activity.endBar
    });
  };

  // Handle mouse movement during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragInfo) return;

    const currentBar = positionToBar(e.clientX);
    const barDiff = currentBar - dragInfo.initialBar;

    const activity = instrument.activities.find(a => a.id === dragInfo.activityId);
    if (!activity) return;

    if (dragInfo.edge === 'start') {
      // Dragging start edge - don't allow to go beyond end
      const newStartBar = Math.min(
        Math.max(1, dragInfo.initialStart + barDiff),
        activity.endBar
      );
      onUpdateActivity(activity.id, newStartBar, activity.endBar);
    } else if (dragInfo.edge === 'end') {
      // Dragging end edge - don't allow to go below start
      const newEndBar = Math.max(
        Math.min(totalBars, dragInfo.initialEnd + barDiff),
        activity.startBar
      );
      onUpdateActivity(activity.id, activity.startBar, newEndBar);
    } else if (dragInfo.edge === 'move') {
      // Moving entire activity
      const activityLength = dragInfo.initialEnd - dragInfo.initialStart;
      let newStartBar = Math.max(1, dragInfo.initialStart + barDiff);
      let newEndBar = newStartBar + activityLength;

      // Constrain to grid bounds
      if (newEndBar > totalBars) {
        newEndBar = totalBars;
        newStartBar = Math.max(1, newEndBar - activityLength);
      }

      // Check for conflicts with other activities
      const hasConflict = instrument.activities.some(a => {
        if (a.id === activity.id) return false; // Skip self
        return (newStartBar <= a.endBar && newEndBar >= a.startBar);
      });

      if (!hasConflict) {
        onUpdateActivity(activity.id, newStartBar, newEndBar);
      }
    }
  };

  // End drag operation
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragInfo(null);
  };

  // Global mouse handlers for dragging outside the row
  useEffect(() => {
    if (!isDragging || !dragInfo) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!rowRef.current) return;

      // Calculate bar position relative to the row, constraining within its bounds
      const rect = rowRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = relativeX / rect.width;
      const currentBar = Math.max(1, Math.min(totalBars, Math.round(percent * totalBars)));

      const barDiff = currentBar - dragInfo.initialBar;
      const activity = instrument.activities.find(a => a.id === dragInfo.activityId);
      if (!activity) return;

      if (dragInfo.edge === 'start') {
        // Dragging start edge - don't allow to go beyond end
        const newStartBar = Math.min(
          Math.max(1, dragInfo.initialStart + barDiff),
          activity.endBar
        );
        onUpdateActivity(activity.id, newStartBar, activity.endBar);
      } else if (dragInfo.edge === 'end') {
        // Dragging end edge - don't allow to go below start
        const newEndBar = Math.max(
          Math.min(totalBars, dragInfo.initialEnd + barDiff),
          activity.startBar
        );
        onUpdateActivity(activity.id, activity.startBar, newEndBar);
      } else if (dragInfo.edge === 'move') {
        // Moving entire activity
        const activityLength = dragInfo.initialEnd - dragInfo.initialStart;
        let newStartBar = Math.max(1, dragInfo.initialStart + barDiff);
        let newEndBar = newStartBar + activityLength;

        // Constrain to grid bounds
        if (newEndBar > totalBars) {
          newEndBar = totalBars;
          newStartBar = Math.max(1, newEndBar - activityLength);
        }

        // Check for conflicts with other activities
        const hasConflict = instrument.activities.some(a => {
          if (a.id === activity.id) return false; // Skip self
          return (newStartBar <= a.endBar && newEndBar >= a.startBar);
        });

        if (!hasConflict) {
          onUpdateActivity(activity.id, newStartBar, newEndBar);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragInfo(null);
    };

    // Add global event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragInfo, totalBars, instrument.activities, onUpdateActivity]);

  // Handle clicking on empty row space to add new activity
  const handleRowClick = (e: React.MouseEvent) => {
    // Only handle direct clicks on the row background (not on activities)
    if ((e.target as HTMLElement).classList.contains('instrument-row-background')) {
      const clickedBar = positionToBar(e.clientX);

      // Default to a 4-bar activity or less if near the end
      const endBar = Math.min(totalBars, clickedBar + 3);

      // Check for conflicts with existing activities
      const hasConflict = instrument.activities.some(activity => {
        return (clickedBar <= activity.endBar && endBar >= activity.startBar);
      });

      if (!hasConflict) {
        onAddActivity(clickedBar, endBar);
      }
    }
  };

  // Handle activity delete button click
  const handleDeleteActivity = (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteActivity(activityId);
  };

  return (
    <div
      className="instrument-row"
      ref={rowRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Instrument name/label - occupies top half of the row */}
      <div className="instrument-label" style={{ color: textColor, borderLeft: `3px solid ${instrument.color}` }}>
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="instrument-name-input"
            style={{ color: 'var(--primary-color)', background: 'transparent' }}
          />
        ) : (
          <div className="instrument-name" onClick={handleNameClick} title="Click to edit instrument name">
            {instrument.name}
          </div>
        )}
      </div>

      {/* Activity row - occupies bottom half of the row */}
      <div className="instrument-row-content" onClick={handleRowClick}>
        <div className="instrument-row-background"></div>

        {/* Activity bars */}
        {instrument.activities.map(activity => {
          // Use exact bar positioning to ensure perfect alignment with grid lines
          const startPercent = getExactBarPosition(activity.startBar, totalBars);
          const width = getExactBarWidth(activity.startBar, activity.endBar, totalBars);

          return (
            <div
              key={activity.id}
              className="activity-bar"
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
                backgroundColor: instrument.color
              }}
            >
              <div
                className="activity-handle left-handle"
                onMouseDown={(e) => handleActivityMouseDown(e, activity.id, 'start')}
              ></div>

              <div
                className="activity-content"
                onMouseDown={(e) => handleActivityMouseDown(e, activity.id, 'move')}
              >
                <span className="activity-info" style={{ color: textColor }}>
                  {activity.startBar}-{activity.endBar}
                </span>
                <button
                  className="delete-activity-button"
                  onClick={(e) => handleDeleteActivity(activity.id, e)}
                  title="Delete this activity"
                >
                  ×
                </button>
              </div>

              <div
                className="activity-handle right-handle"
                onMouseDown={(e) => handleActivityMouseDown(e, activity.id, 'end')}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InstrumentRow;
