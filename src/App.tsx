import React, { useState, useEffect, useCallback } from 'react';
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

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('arrangementData');
    if (savedData) {
      try {
        setArrangementData(JSON.parse(savedData));
        // After loading saved data, calculate if we need to show more bars
        setTimeout(() => calculateRequiredBars(), 0);
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []);

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

    // Check if we need to expand the total bars
    calculateRequiredBars();
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
      let shouldCheckBars = variation === undefined;

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

    // Only check if we need to expand bars when actually changing bar positions, not just variations
    if (variation === undefined) {
      calculateRequiredBars();
    }
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

    // Check if we need to expand the total bars
    calculateRequiredBars();
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

    // Check if we need to expand the total bars
    calculateRequiredBars();
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

  const updateTotalBars = useCallback((totalBars: number) => {
    setArrangementData(prev => ({ ...prev, totalBars }));
  }, []);

  // Calculate the required number of bars based on current content
  const calculateRequiredBars = () => {
    let maxUsedBar = 0;

    // Check maximum bar used in sections
    arrangementData.sections.forEach(section => {
      maxUsedBar = Math.max(maxUsedBar, section.endBar);
    });

    // Check maximum bar used in activities
    arrangementData.instruments.forEach(instrument => {
      instrument.activities.forEach(activity => {
        maxUsedBar = Math.max(maxUsedBar, activity.endBar);
      });
    });

    // Always show at least 64 bars, or 4 more than the maximum used
    const requiredBars = Math.max(64, maxUsedBar + 4);

    // Update totalBars if needed, but only ever increase, never decrease
    if (requiredBars > arrangementData.totalBars) {
      updateTotalBars(requiredBars);
    }
  };

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

      // After import, calculate if we need to show more bars
      setTimeout(() => calculateRequiredBars(), 0);
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
      />

      <Footer
        totalBars={arrangementData.totalBars}
        onUpdateTotalBars={updateTotalBars}
      />
    </div>
  );
};

export default App;
