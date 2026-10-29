export type SensorType = 'earthquake' | 'water' | 'gas' | 'air';

export type CalamityType = 'none' | 'earthquake' | 'water' | 'gas' | 'air';

export interface CalamityScenario {
  id: CalamityType;
  label: string;
  shortLabel: string;
  targetSensorType: SensorType | null;
  headline: string;
  description: string;
  colorHex: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  mitigationActions: {
    id: string;
    label: string;
    effectText: string;
  }[];
}

export interface SensorCategoryMeta {
  type: SensorType;
  label: string;
  shortLabel: string;
  subtitle: string;
  colorHex: string;
  colorInt: number;
  accentHex: string;
  description: string;
  unit: string;
}

export interface SensorMarkerData {
  id: string;
  code: string;
  name: string;
  type: SensorType;
  zone: string;
  position: [number, number, number]; // [x, y, z] where y is base elevation
  mountType:
    | 'Ground'
    | 'Bridge Structure'
    | 'Dam Crest'
    | 'Riverbank'
    | 'Dam Wall'
    | 'Drainage Basin'
    | 'Factory Stack'
    | 'Storage Tank'
    | 'Roadside Pole';
  purpose: string;
  staticReading: string;
  calamityReading: string;
  mitigatedReading: string;
  alertLevel: 'CRITICAL' | 'WARNING';
  automatedAction: string;
}

export interface CityLandmark {
  id: string;
  name: string;
  subtitle: string;
  position: [number, number, number];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}
