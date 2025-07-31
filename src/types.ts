// types.ts
export interface Activity {
  id: string;
  startBar: number;
  endBar: number;
}

export interface Instrument {
  id: string;
  name: string;
  color: string;
  activities: Activity[];
}

export interface Section {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
}

export interface ArrangementData {
  name: string;
  totalBars: number;
  sections: Section[];
  instruments: Instrument[];
}
