import React, { useState, useRef, useEffect } from 'react';
import type { Instrument, Section } from '../types';
import { getContrastTextColor, getColorVariation } from '../utils/colorUtils';
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
  sections: Section[];
  onUpdateName: (name: string) => void;
  onAddActivity: (startBar: number, endBar: number) => void;
  onUpdateActivity: (activityId: string, startBar: number, endBar: number, variation?: number) => void;
  onDeleteActivity: (activityId: string) => void;
  barToPercent: (bar: number) => number;
}

const InstrumentRow: React.FC<InstrumentRowProps> = ({
  instrument,
  totalBars,
  sections,
  onUpdateName,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
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

  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [creationStartBar, setCreationStartBar] = useState<number | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<number>(0);

  const rowRef = useRef<HTMLDivElement>(null);

  // Convert mouse position to bar number - consistently calculate bar position
  // Helper function to get bar position from mouse position
  const getBarPositionFromMousePos = (mousePos: number) => {
    if (!rowRef.current) return 1;

    const rect = rowRef.current.getBoundingClientRect();
    const relativeX = mousePos - rect.left;
    const percent = relativeX / rect.width;
    return Math.max(1, Math.min(totalBars, Math.floor(percent * totalBars + 1)));
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

    // Capture initial values with consistent bar positioning
    const initialBar = getBarPositionFromMousePos(e.clientX);

    setIsDragging(true);
    setDragInfo({
      activityId,
      edge,
      initialBar,
      initialStart: activity.startBar,
      initialEnd: activity.endBar
    });
  };

  // Handle wheel event on activity bar to cycle through variations
  const handleActivityWheel = (e: React.WheelEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const activity = instrument.activities.find(a => a.id === activityId);
    if (!activity) return;

    // Store the last wheel event timestamp to throttle scrolling
    const now = Date.now();
    const wheelThrottleDelay = 500; // 500ms delay between variation changes

    // Get or create a data attribute on the element to store the last wheel time
    const target = e.currentTarget as HTMLElement;
    const lastWheelTime = parseInt(target.dataset.lastWheelTime || '0', 10);

    // If not enough time has passed since the last wheel event, ignore this one
    if (now - lastWheelTime < wheelThrottleDelay) {
      return;
    }

    // Update the last wheel time
    target.dataset.lastWheelTime = now.toString();

    // Determine direction: up (negative deltaY) or down (positive deltaY)
    const direction = e.deltaY < 0 ? -1 : 1;

    // Get current variation or default to 0
    const currentVariation = activity.variation || 0;

    // Calculate new variation (cycle through 0-4)
    const MAX_VARIATIONS = 4;
    let newVariation = (currentVariation + direction) % (MAX_VARIATIONS + 1);
    if (newVariation < 0) newVariation = MAX_VARIATIONS;

    // Update the activity with the new variation
    onUpdateActivity(activity.id, activity.startBar, activity.endBar, newVariation);
  };

  // Handle mouse movement during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragInfo) return;

    // Use the same bar positioning logic for consistency
    const currentBar = getBarPositionFromMousePos(e.clientX);
    const barDiff = currentBar - dragInfo.initialBar;

    const activity = instrument.activities.find(a => a.id === dragInfo.activityId);
    if (!activity) return;

    if (dragInfo.edge === 'start') {
      // Dragging start edge - don't allow to go beyond end
      const newStartBar = Math.min(
        Math.max(1, dragInfo.initialStart + barDiff),
        activity.endBar
      );
      onUpdateActivity(activity.id, newStartBar, activity.endBar, activity.variation);
    } else if (dragInfo.edge === 'end') {
      // Dragging end edge - don't allow to go below start
      const newEndBar = Math.max(
        Math.min(totalBars, dragInfo.initialEnd + barDiff),
        activity.startBar
      );
      onUpdateActivity(activity.id, activity.startBar, newEndBar, activity.variation);
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
        onUpdateActivity(activity.id, newStartBar, newEndBar, activity.variation);
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
      const currentBar = getBarPositionFromMousePos(e.clientX);

      const barDiff = currentBar - dragInfo.initialBar;
      const activity = instrument.activities.find(a => a.id === dragInfo.activityId);
      if (!activity) return;

      if (dragInfo.edge === 'start') {
        // Dragging start edge - don't allow to go beyond end
        const newStartBar = Math.min(
          Math.max(1, dragInfo.initialStart + barDiff),
          activity.endBar
        );
        onUpdateActivity(activity.id, newStartBar, activity.endBar, activity.variation);
      } else if (dragInfo.edge === 'end') {
        // Dragging end edge - don't allow to go below start
        const newEndBar = Math.max(
          Math.min(totalBars, dragInfo.initialEnd + barDiff),
          activity.startBar
        );
        onUpdateActivity(activity.id, activity.startBar, newEndBar, activity.variation);
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
          onUpdateActivity(activity.id, newStartBar, newEndBar, activity.variation);
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
  }, [isDragging, dragInfo, totalBars, instrument.activities, onUpdateActivity, getBarPositionFromMousePos]);

  // Find section at a given bar position
  const findSectionAtBar = (bar: number) => {
    return sections.find(section => bar >= section.startBar && bar <= section.endBar);
  };

  // Start creating a new activity by dragging
  const handleRowMouseDown = (e: React.MouseEvent) => {
    // Only handle direct clicks on the row background (not on activities)
    if ((e.target as HTMLElement).classList.contains('instrument-row-background')) {
      // Use consistent bar positioning logic
      const clickedBar = getBarPositionFromMousePos(e.clientX);

      // Check for conflicts with existing activities
      const hasConflict = instrument.activities.some(activity => {
        return (clickedBar >= activity.startBar && clickedBar <= activity.endBar);
      });

      if (!hasConflict) {
        setIsCreatingActivity(true);
        setCreationStartBar(clickedBar);
        setCurrentMousePos(e.clientX);
        e.preventDefault(); // Prevent text selection during drag
      }
    }
  };

  // Handle mousemove while creating a new activity
  const handleCreationMouseMove = (e: React.MouseEvent) => {
    if (isCreatingActivity && creationStartBar !== null) {
      // Track current mouse position for preview rendering
      setCurrentMousePos(e.clientX);
    }
  };

  // Handle mouseup to finalize activity creation
  const handleCreationMouseUp = (e: React.MouseEvent) => {
    if (isCreatingActivity && creationStartBar !== null) {
      // Use consistent bar positioning logic
      const endBar = getBarPositionFromMousePos(e.clientX);

      if (Math.abs(endBar - creationStartBar) < 1) {
        // If drag distance is very small, treat it as a click
        const clickedBar = creationStartBar;

        // Find section at clicked position
        const section = findSectionAtBar(clickedBar);

        let finalStartBar, finalEndBar;
        if (section) {
          // Match activity width to full section width
          finalStartBar = section.startBar;
          finalEndBar = section.endBar;
        } else {
          // Default to a 4-bar activity or less if near the end
          finalStartBar = clickedBar;
          finalEndBar = Math.min(totalBars, clickedBar + 3);
        }

        // Check for conflicts with existing activities
        const hasConflict = instrument.activities.some(activity => {
          return (finalStartBar <= activity.endBar && finalEndBar >= activity.startBar);
        });

        if (!hasConflict) {
          onAddActivity(finalStartBar, finalEndBar);
        }
      } else {
        // Drag creation - use the dragged range
        const startBar = Math.min(creationStartBar, endBar);
        const finalEndBar = Math.max(creationStartBar, endBar);

        // Check for conflicts with existing activities
        const hasConflict = instrument.activities.some(activity => {
          return (startBar <= activity.endBar && finalEndBar >= activity.startBar);
        });

        if (!hasConflict) {
          onAddActivity(startBar, finalEndBar);
        }
      }

      // Reset creation state
      setIsCreatingActivity(false);
      setCreationStartBar(null);
    }
  };

  // Handle clicking on empty row space to add new activity
  const handleRowClick = (e: React.MouseEvent) => {
    // Only handle direct clicks on the row background (not on activities)
    if ((e.target as HTMLElement).classList.contains('instrument-row-background')) {
      // Use consistent bar positioning logic
      const clickedBar = getBarPositionFromMousePos(e.clientX);

      // Find section at clicked position
      const section = findSectionAtBar(clickedBar);

      let startBar, endBar;
      if (section) {
        // Match activity width to full section width
        startBar = section.startBar;
        endBar = section.endBar;
      } else {
        // Default to a 4-bar activity or less if near the end
        startBar = clickedBar;
        endBar = Math.min(totalBars, clickedBar + 3);
      }

      // Check for conflicts with existing activities
      const hasConflict = instrument.activities.some(activity => {
        return (startBar <= activity.endBar && endBar >= activity.startBar);
      });

      if (!hasConflict) {
        onAddActivity(startBar, endBar);
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
      onMouseMove={(e) => {
        if (isDragging) {
          handleMouseMove(e);
        } else if (isCreatingActivity) {
          handleCreationMouseMove(e);
        }
      }}
      onMouseUp={isDragging ? handleMouseUp : isCreatingActivity ? handleCreationMouseUp : undefined}
      onMouseDown={!isDragging ? handleRowMouseDown : undefined}
    >
      {/* Instrument name/label - occupies top half of the row */}
      <div className="instrument-label" style={{ borderLeft: `3px solid ${instrument.color}` }}>
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
            ref={(input) => {
              if (input) {
                input.select();
              }
            }}
          />
        ) : (
          <div className="instrument-name" onClick={handleNameClick} title="Click to edit instrument name">
            {instrument.name}
          </div>
        )}
      </div>

      {/* Activity row - occupies bottom half of the row */}
      <div className="instrument-row-content" onClick={!isCreatingActivity ? handleRowClick : undefined}>
        <div className="instrument-row-background"></div>

        {/* Preview of activity being created */}
        {isCreatingActivity && creationStartBar !== null && (
          <div
            className="activity-bar activity-preview"
            style={{
              left: `${getExactBarPosition(Math.min(creationStartBar, getBarPositionFromMousePos(currentMousePos)), totalBars)}%`,
              width: `${getExactBarWidth(
                Math.min(creationStartBar, getBarPositionFromMousePos(currentMousePos)),
                Math.max(creationStartBar, getBarPositionFromMousePos(currentMousePos)),
                totalBars
              )}%`,
              backgroundColor: instrument.color,
              opacity: 0.5
            }}
          />
        )}

        {/* Activity bars */}
        {instrument.activities.map(activity => {
          // Use exact bar positioning to ensure perfect alignment with grid lines
          const startPercent = getExactBarPosition(activity.startBar, totalBars);
          const width = getExactBarWidth(activity.startBar, activity.endBar, totalBars);

          // Get color variation based on the activity's variation property
          const variation = activity.variation || 0;
          const activityColor = variation === 0
            ? instrument.color
            : getColorVariation(instrument.color, variation, 4);

          // Get text color based on the activity color
          const textColorForVariation = getContrastTextColor(activityColor);

          return (
            <div
              key={activity.id}
              className="activity-bar"
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
                backgroundColor: activityColor,
                cursor: 'move'
              }}
              onWheel={(e) => handleActivityWheel(e, activity.id)}
              title={`Scroll to change variations (currently: ${variation > 0 ? 'Variation ' + variation : 'Default'})`}
            >
              <div
                className="activity-handle left-handle"
                onMouseDown={(e) => handleActivityMouseDown(e, activity.id, 'start')}
              ></div>

              <div
                className="activity-content"
                onMouseDown={(e) => handleActivityMouseDown(e, activity.id, 'move')}
              >
                <span className="activity-info" style={{ color: textColorForVariation }}>
                  {variation > 0 ? `Variation ${variation}` : `•`}
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
