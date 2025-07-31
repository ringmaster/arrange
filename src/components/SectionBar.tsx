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
  const sectionBarRef = useRef<HTMLDivElement>(null);

  // Function to convert bar number to position percentage with exact alignment
  const barToPercent = (bar: number) => {
    return ((bar - 1) / totalBars) * 100;
  };

  // Function to convert mouse position to bar number
  const positionToBar = (clientX: number) => {
    if (!sectionBarRef.current) return 1;

    const rect = sectionBarRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percent = relativeX / rect.width;
    const bar = Math.max(1, Math.min(totalBars, Math.round(percent * totalBars)));

    return bar;
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
    const newBar = Math.round(positionToBar(e.clientX));
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

      // Check for conflicts with other sections
      const hasConflict = sections.some(s => {
        if (s.id === section.id) return false; // Skip self
        return (newStartBar <= s.endBar && newEndBar >= s.startBar);
      });

      if (!hasConflict) {
        onUpdateSection(draggingSection.id, {
          startBar: newStartBar,
          endBar: newEndBar
        });
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingSection(null);
    setIsDragging(false);
  };

  // Global mouse handlers for dragging outside the section bar
  useEffect(() => {
    if (!isDragging || !draggingSection) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!sectionBarRef.current) return;

      const section = sections.find(s => s.id === draggingSection.id);
      if (!section) return;

      // Calculate bar position relative to the section bar, constraining within its bounds
      const rect = sectionBarRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = relativeX / rect.width;
      const newBar = Math.max(1, Math.min(totalBars, Math.round(percent * totalBars)));
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

        // Check for conflicts with other sections
        const hasConflict = sections.some(s => {
          if (s.id === section.id) return false; // Skip self
          return (newStartBar <= s.endBar && newEndBar >= s.startBar);
        });

        if (!hasConflict) {
          onUpdateSection(draggingSection.id, {
            startBar: newStartBar,
            endBar: newEndBar
          });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingSection(null);
      setIsDragging(false);
    };

    // Add global event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, draggingSection, sections, totalBars, onUpdateSection]);

  const handleBarClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the timeline (not on sections)
    if ((e.target as HTMLElement).classList.contains('section-timeline')) {
      // Ensure we snap exactly to grid lines
      const clickedBar = Math.round(positionToBar(e.clientX));

      // Find a non-overlapping position for the new section
      // Start with a default 4-bar section
      let startBar = clickedBar;
      let endBar = Math.min(totalBars, startBar + 3);

      // Adjust if there are overlaps
      const overlappingSections = sections.filter(
        s => (startBar <= s.endBar && endBar >= s.startBar)
      );

      if (overlappingSections.length > 0) {
        // Find the nearest empty space
        const sortedSections = [...sections].sort((a, b) => a.startBar - b.startBar);

        // Try to find a gap
        for (let i = 0; i < sortedSections.length; i++) {
          const currentSection = sortedSections[i];
          const nextSection = sortedSections[i + 1];

          if (!nextSection) {
            // If this is the last section, place after it
            if (currentSection.endBar < totalBars) {
              startBar = currentSection.endBar + 1;
              endBar = Math.min(totalBars, startBar + 3);
              break;
            }
          } else {
            // Check for gap between sections
            if (currentSection.endBar + 1 < nextSection.startBar) {
              startBar = currentSection.endBar + 1;
              endBar = Math.min(nextSection.startBar - 1, startBar + 3);
              break;
            }
          }
        }

        // If no gap found, try before the first section
        if (sortedSections[0]?.startBar > 1) {
          startBar = 1;
          endBar = Math.min(sortedSections[0].startBar - 1, 4);
        }
      }

      // Prompt user for section name
      const sectionName = prompt('Enter section name:', 'New Section');
      if (sectionName) {
        onAddSection(sectionName, startBar, endBar);
      }
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      onDeleteSection(sectionId);
    }
  };

  return (
    <div
      className="section-bar"
      ref={sectionBarRef}
      onClick={handleBarClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}

    >
      <div className="section-timeline">
        {/* Bar number indicators */}
        {Array.from({ length: totalBars }, (_, i) => i + 1).map(barNum => (
          <div
            key={`bar-${barNum}`}
            className={`bar-indicator ${barNum % 4 === 1 ? 'major-bar' : ''}`}
            style={{ left: `${barToPercent(barNum)}%` }}
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
            style={{
              left: `${barToPercent(section.startBar)}%`,
              width: `${barToPercent(section.endBar + 1) - barToPercent(section.startBar)}%`,
              boxSizing: 'border-box'
            }}
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
