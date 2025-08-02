import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import SectionBar from './components/SectionBar';
import ArrangementGrid from './components/ArrangementGrid';
import Footer from './components/Footer';
import type { ArrangementData, Section } from './types';
import { generateUniqueColor } from './utils/colorUtils';
import { v4 as uuidv4 } from 'uuid';



const DEFAULT_INSTRUMENTS = ['bass', 'guitar', 'vox', 'keys', 'pads', 'perc', 'drums'];

const App: React.FC = () => {
  const [arrangementData, setArrangementData] = useState<ArrangementData>({
    name: 'New Arrangement',
    totalBars: 64,
    sections: [],
    instruments: [],
  });
  // Use a ref instead of state to avoid re-renders
  const seekToBarFnRef = useRef<((barIndex: number) => void) | null>(null);

  const updateTotalBars = useCallback((totalBars: number) => {
    setArrangementData(prev => ({ ...prev, totalBars }));
  }, []);

  // Handle seeking to a specific bar in the audio
  const handleSeekToBar = useCallback((barIndex: number) => {
    if (typeof seekToBarFnRef.current === 'function') {
      try {
        seekToBarFnRef.current(barIndex);
      } catch (error) {
        console.error('Error seeking to bar:', error);
      }
    } else {
      console.log('No audio player reference available for seeking');
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('arrangementData');
    if (savedData) {
      try {
        setArrangementData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []); // No dependencies needed for initial load

  // Effect to update localStorage when data changes
  useEffect(() => {
    localStorage.setItem('arrangementData', JSON.stringify(arrangementData));
  }, [arrangementData]);

  const addInstrument = useCallback(() => {
    const usedNames = arrangementData.instruments.map(i => i.name.toLowerCase());
    let nextInstrument = DEFAULT_INSTRUMENTS.find(i => !usedNames.includes(i));

    if (!nextInstrument) {
      nextInstrument = `Instrument ${arrangementData.instruments.length + 1}`;
    }

    setArrangementData(prev => ({
      ...prev,
      instruments: [
        ...prev.instruments,
        {
          id: uuidv4(),
          name: nextInstrument!,
          color: generateUniqueColor(prev.instruments.map(i => i.color)),
          activities: [],
        },
      ],
    }));
  }, [arrangementData.instruments]);

  const updateInstrumentName = useCallback((instrumentId: string, name: string) => {
    setArrangementData(prev => ({
      ...prev,
      instruments: prev.instruments.map(inst =>
        inst.id === instrumentId ? { ...inst, name } : inst
      ),
    }));
  }, []);

  const addActivity = useCallback((instrumentId: string, startBar: number, endBar: number) => {
    setArrangementData(prev => ({
      ...prev,
      instruments: prev.instruments.map(inst =>
        inst.id === instrumentId
          ? {
            ...inst,
            activities: [
              ...inst.activities,
              { id: uuidv4(), startBar, endBar }
            ]
          }
          : inst
      ),
    }));

    // BPM-based bar calculation will be implemented in the future
  }, []);

  const updateActivity = useCallback((
    instrumentId: string,
    activityId: string,
    startBar: number,
    endBar: number,
    variation?: number
  ) => {
    setArrangementData(prev => {
      // Only expand bars, never shrink them when just changing a variation
      // We only check bars when variation is undefined
      return {
        ...prev,
        instruments: prev.instruments.map(inst =>
          inst.id === instrumentId
            ? {
              ...inst,
              activities: inst.activities.map(activity =>
                activity.id === activityId
                  ? { ...activity, startBar, endBar, variation: variation !== undefined ? variation : activity.variation }
                  : activity
              )
            }
            : inst
        ),
      };
    });

    // BPM-based bar calculation will be implemented in the future
  }, []);

  const deleteActivity = useCallback((instrumentId: string, activityId: string) => {
    setArrangementData(prev => ({
      ...prev,
      instruments: prev.instruments.map(inst =>
        inst.id === instrumentId
          ? {
            ...inst,
            activities: inst.activities.filter(a => a.id !== activityId)
          }
          : inst
      ),
    }));
  }, []);

  const addSection = useCallback((name: string, startBar: number, endBar: number) => {
    setArrangementData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: uuidv4(), name, startBar, endBar },
      ].sort((a, b) => a.startBar - b.startBar),
    }));

    // BPM-based bar calculation will be implemented in the future
  }, []);

  const updateSection = useCallback((
    sectionId: string,
    updates: Partial<Omit<Section, 'id'>>
  ) => {
    setArrangementData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, ...updates }
          : section
      ).sort((a, b) => a.startBar - b.startBar),
    }));

    // BPM-based bar calculation will be implemented in the future
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setArrangementData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
  }, []);

  const updateArrangementName = useCallback((name: string) => {
    setArrangementData(prev => ({ ...prev, name }));
  }, []);

  const createNewArrangement = useCallback(() => {
    setArrangementData({
      name: 'New Arrangement',
      totalBars: 64,
      sections: [],
      instruments: [],
    });
  }, []);

  const exportArrangement = useCallback(() => {
    const dataStr = JSON.stringify(arrangementData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportName = `${arrangementData.name.replace(/\s+/g, '_')}_arrangement.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  }, [arrangementData]);

  const importArrangement = useCallback((jsonData: string) => {
    try {
      const parsedData = JSON.parse(jsonData) as ArrangementData;
      // Validate structure
      if (
        typeof parsedData.name !== 'string' ||
        typeof parsedData.totalBars !== 'number' ||
        !Array.isArray(parsedData.sections) ||
        !Array.isArray(parsedData.instruments)
      ) {
        throw new Error('Invalid arrangement data structure');
      }

      setArrangementData(parsedData);

      // BPM-based bar calculation will be implemented in the future
    } catch (e) {
      console.error('Failed to import arrangement data', e);
      alert('The file does not contain valid arrangement data.');
    }
  }, []);

  return (
    <div className="music-analyzer-app">
      <Header
        arrangementName={arrangementData.name}
        onNameChange={updateArrangementName}
        onExport={exportArrangement}
        onImport={importArrangement}
        onNew={createNewArrangement}
      />

      <SectionBar
        sections={arrangementData.sections}
        totalBars={arrangementData.totalBars}
        onAddSection={addSection}
        onUpdateSection={updateSection}
        onDeleteSection={deleteSection}
      />

      <ArrangementGrid
        instruments={arrangementData.instruments}
        sections={arrangementData.sections}
        totalBars={arrangementData.totalBars}
        onAddInstrument={addInstrument}
        onUpdateInstrumentName={updateInstrumentName}
        onAddActivity={addActivity}
        onUpdateActivity={updateActivity}
        onDeleteActivity={deleteActivity}
        onSeekToBar={handleSeekToBar}
      />

      <Footer
        totalBars={arrangementData.totalBars}
        onUpdateTotalBars={updateTotalBars}
        onSeekToBar={(seekFn) => {
          if (typeof seekFn === 'function') {
            seekToBarFnRef.current = seekFn;
            console.log('Registered audio seek function');
          }
        }}
      />
    </div>
  );
};

export default App;
