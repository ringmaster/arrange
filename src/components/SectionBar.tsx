import React, { useState, useRef, useEffect } from 'react';
import type { Section } from '../types';
import '../styles/SectionBar.css';

interface SectionBarProps {
  sections: Section[];
  totalBars: number;
  onAddSection: (name: string, startBar: number, endBar: number) => void;
  onUpdateSection: (sectionId: string, updates: Partial<Omit<Section, 'id'>>) => void;
  onDeleteSection: (sectionId: string) => void;
}

const SectionBar: React.FC<SectionBarProps> = ({
  sections,
  totalBars,
  onAddSection,
  onUpdateSection,
  onDeleteSection
}) => {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempSectionName, setTempSectionName] = useState('');
  const [draggingSection, setDraggingSection] = useState<{
    id: string;
    edge: 'start' | 'end' | 'move' | null;
    initialBar: number;
    initialStart?: number;
    initialEnd?: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [creationStartBar, setCreationStartBar] = useState<number | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<number>(0);
  const sectionBarRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Function to convert bar number to position percentage with exact alignment
  const barToPercent = (bar: number) => {
    return ((bar - 1) / totalBars) * 100;
  };

  // Helper function to ensure exact bar positioning
  const getExactBarPosition = (bar: number, totalBars: number): number => {
    return ((bar - 1) / totalBars) * 100;
  };

  // Function to calculate the exact width of a section bar
  const getExactBarWidth = (startBar: number, endBar: number, totalBars: number): number => {
    // Calculate percentage width that spans the exact number of bars
    return ((endBar - startBar + 1) / totalBars) * 100;
  };

  // Function to convert mouse position to bar number
  const positionToBar = (clientX: number) => {
    if (!timelineRef.current) return 1;

    const rect = timelineRef.current.getBoundingClientRect();
    const containerWidth = rect.width;

    // Get position relative to the container
    const relativeX = clientX - rect.left;

    // Direct calculation method - simpler and more reliable
    const barPosition = Math.ceil(relativeX / (containerWidth / totalBars));
    const validBar = Math.max(1, Math.min(totalBars, barPosition));

    return validBar;
  };

  const handleSectionNameClick = (section: Section) => {
    setEditingSectionId(section.id);
    setTempSectionName(section.name);
  };

  const handleSectionNameBlur = () => {
    if (editingSectionId && tempSectionName.trim()) {
      onUpdateSection(editingSectionId, { name: tempSectionName });
    }
    setEditingSectionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSectionNameBlur();
    } else if (e.key === 'Escape') {
      setEditingSectionId(null);
    }
  };

  // Function to handle mouse down on the timeline to start section creation
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }

    // Don't handle clicks on existing sections
    if ((e.target as HTMLElement).closest('.section-container')) {
      return;
    }

    // Start section creation
    const clickedBar = positionToBar(e.clientX);

    // Check if the clicked position overlaps with any existing section
    const overlappingSections = sections.filter(
      s => (clickedBar >= s.startBar && clickedBar <= s.endBar)
    );

    if (overlappingSections.length === 0) {
      setIsCreatingSection(true);
      setCreationStartBar(clickedBar);
      setCurrentMousePos(e.clientX);
      e.preventDefault(); // Prevent text selection during drag
    }
  };

  // Function to handle clicks directly on the timeline
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging || isCreatingSection) {
      return;
    }

    // Don't handle clicks on existing sections
    if ((e.target as HTMLElement).closest('.section-container')) {
      return;
    }

    // Get the clicked bar position
    const clickedBar = positionToBar(e.clientX);

    // Find if the clicked position overlaps with any existing section
    const overlappingSections = sections.filter(
      s => (clickedBar >= s.startBar && clickedBar <= s.endBar)
    );

    if (overlappingSections.length > 0) {
      return; // Don't create a section if clicking on an existing section's area
    }

    // Find the section that contains this position, if any
    const containingSection = sections.find(
      s => (clickedBar >= s.startBar && clickedBar <= s.endBar)
    );

    // Create a section spanning the containing section or default to 4 bars
    let startBar, endBar;

    if (containingSection) {
      startBar = containingSection.startBar;
      endBar = containingSection.endBar;
    } else {
      startBar = clickedBar;
      endBar = Math.min(totalBars, startBar + 3);
    }

    // Determine the section name
    let sectionName;
    if (sections.length === 0) {
      sectionName = "Intro";
    } else {
      // Find all single-letter section names
      const letterSections = sections.filter(s => /^[A-Z]$/.test(s.name));

      if (letterSections.length > 0) {
        // Get next letter in alphabet
        const sortedLetterSections = [...letterSections].sort((a, b) => a.name.localeCompare(b.name));
        const lastLetter = sortedLetterSections[sortedLetterSections.length - 1].name;
        const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
        sectionName = (nextLetter > "Z") ? "A" : nextLetter;
      } else {
        sectionName = "A";
      }
    }

    // Call the provided callback to create the section
    onAddSection(sectionName, startBar, endBar);
  };

  const handleMouseDown = (e: React.MouseEvent, sectionId: string, edge: 'start' | 'end' | 'move' | null) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setDraggingSection({
      id: sectionId,
      edge,
      initialBar: positionToBar(e.clientX),
      initialStart: section.startBar,
      initialEnd: section.endBar
    });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingSection || !isDragging) return;

    const section = sections.find(s => s.id === draggingSection.id);
    if (!section) return;

    // Ensure we snap exactly to grid lines
    const newBar = positionToBar(e.clientX);
    const barDiff = newBar - draggingSection.initialBar;

    if (draggingSection.edge === 'start') {
      // Don't allow start to go beyond end bar
      const validBar = Math.min(newBar, section.endBar);
      onUpdateSection(draggingSection.id, { startBar: validBar });
    } else if (draggingSection.edge === 'end') {
      // Don't allow end to go below start bar
      const validBar = Math.max(newBar, section.startBar);
      onUpdateSection(draggingSection.id, { endBar: validBar });
    } else if (draggingSection.edge === 'move' && draggingSection.initialStart !== undefined && draggingSection.initialEnd !== undefined) {
      // Move the entire section
      const sectionLength = draggingSection.initialEnd - draggingSection.initialStart;
      let newStartBar = Math.max(1, draggingSection.initialStart + barDiff);
      let newEndBar = newStartBar + sectionLength;

      // Constrain to grid bounds
      if (newEndBar > totalBars) {
        newEndBar = totalBars;
        newStartBar = Math.max(1, newEndBar - sectionLength);
      }

      onUpdateSection(draggingSection.id, {
        startBar: newStartBar,
        endBar: newEndBar
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isCreatingSection && creationStartBar !== null) {
      const endBar = positionToBar(e.clientX);

      // Only create if the drag distance is meaningful
      if (Math.abs(endBar - creationStartBar) >= 1) {
        const startBar = Math.min(creationStartBar, endBar);
        const finalEndBar = Math.max(creationStartBar, endBar);

        // Check for conflicts with existing sections
        const hasConflict = sections.some(section => {
          return (startBar <= section.endBar && finalEndBar >= section.startBar);
        });

        if (!hasConflict) {
          // Determine the section name
          let sectionName;
          if (sections.length === 0) {
            sectionName = "Intro";
          } else {
            // Find all single-letter section names (A, B, C, etc.)
            const letterSections = sections.filter(s => /^[A-Z]$/.test(s.name));

            if (letterSections.length > 0) {
              // Sort sections alphabetically to find the highest letter
              const sortedLetterSections = [...letterSections].sort((a, b) => a.name.localeCompare(b.name));
              const lastLetter = sortedLetterSections[sortedLetterSections.length - 1].name;

              // Get the next letter in the alphabet
              const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);

              // If we've gone beyond Z, start with A again
              sectionName = (nextLetter > "Z") ? "A" : nextLetter;
            } else {
              // No single-letter sections exist yet, start with "A"
              sectionName = "A";
            }
          }

          onAddSection(sectionName, startBar, finalEndBar);
        }
      }

      // Reset creation state
      setIsCreatingSection(false);
      setCreationStartBar(null);
    }

    setDraggingSection(null);
    setIsDragging(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    onDeleteSection(sectionId);
  };

  return (
    <div
      className="section-bar"
      ref={sectionBarRef}
      onMouseMove={(e) => {
        if (isDragging) {
          handleMouseMove(e);
        } else if (isCreatingSection) {
          setCurrentMousePos(e.clientX);
        }
      }}
      onMouseUp={handleMouseUp}
    >
      <div
        className="section-timeline"
        onClick={handleTimelineClick}
        onMouseDown={handleTimelineMouseDown}
        ref={timelineRef}
      >
        {/* Preview of section being created */}
        {isCreatingSection && creationStartBar !== null && (
          <div
            className="section-container section-preview"
            style={{
              left: `${barToPercent(Math.min(creationStartBar, positionToBar(currentMousePos)))}%`,
              width: `${getExactBarWidth(
                Math.min(creationStartBar, positionToBar(currentMousePos)),
                Math.max(creationStartBar, positionToBar(currentMousePos)),
                totalBars
              )}%`,
              backgroundColor: 'rgba(37, 99, 235, 0.3)',
              border: '1px dashed rgba(37, 99, 235, 0.5)',
              zIndex: 3,
              pointerEvents: 'none',
              position: 'absolute'
            }}
          />
        )}
        {/* Bar number indicators */}
        {Array.from({ length: totalBars }, (_, i) => i + 1).map(barNum => (
          <div
            key={`bar-${barNum}`}
            className={`bar-indicator ${barNum % 4 === 1 ? 'major-bar' : ''}`}
            style={{
              left: totalBars > 64
                ? `calc(${barNum - 1} * 20px)`
                : `${barToPercent(barNum)}%`
            }}
          >
            {barNum % 4 === 1 && (
              <span className="bar-number">{barNum}</span>
            )}
          </div>
        ))}

        {/* Section elements */}
        {sections.map(section => (
          <div
            key={section.id}
            className="section-container"
            style={totalBars > 64
              ? {
                left: `calc(${section.startBar - 1} * 20px)`,
                width: `calc(${section.endBar - section.startBar + 1} * 20px)`,
                boxSizing: 'border-box',
                zIndex: 5
              }
              : {
                left: `${barToPercent(section.startBar)}%`,
                width: `${getExactBarWidth(section.startBar, section.endBar, totalBars)}%`,
                boxSizing: 'border-box',
                zIndex: 5
              }
            }
          >
            <div
              className="section-handle left-handle"
              onMouseDown={(e) => handleMouseDown(e, section.id, 'start')}
            ></div>

            <div
              className="section-content"
              onMouseDown={(e) => handleMouseDown(e, section.id, 'move')}
            >
              {editingSectionId === section.id ? (
                <input
                  type="text"
                  value={tempSectionName}
                  onChange={e => setTempSectionName(e.target.value)}
                  onBlur={handleSectionNameBlur}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="section-name-input"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="section-name"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSectionNameClick(section);
                  }}
                >
                  {section.name}
                </div>
              )}
              <button
                className="delete-section-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSection(section.id);
                }}
                title="Delete section"
              >
                ×
              </button>
            </div>

            <div
              className="section-handle right-handle"
              onMouseDown={(e) => handleMouseDown(e, section.id, 'end')}
            ></div>
          </div>
        ))}
      </div>
      <div className="section-instructions">
        Click on empty timeline to add a new section • Click section name to edit • Drag edges to resize • Drag middle to move
      </div>
    </div>
  );
};

export default SectionBar;
