export type N1Speed = "TO" | "93.7" | "85" | "81" | "66" | "54";

export const N1_SPEEDS = ["TO", "93.7", "85", "81", "66", "54"] as const satisfies readonly N1Speed[];

export interface VibrationMeasurement {
  n1Speed: N1Speed;
  bearingVibration: number;
  ffccvVibration: number;
}

export interface EngineRun {
  measurements: VibrationMeasurement[];
}

export interface ThreeShotInput {
  initialRun: EngineRun;
  firstRun: EngineRun;
  secondRun: EngineRun;
  thirdRun: EngineRun;
}

export interface CalculationInformation {
  id: string;
  aircraftRegistration: string;
  engineSerialNumber: string;
  engineModel: string;
  date: string;
  technician: string;
  notes: string;
}

export type CalculationStatus =
  | "Draft"
  | "In Progress"
  | "Correction Calculated"
  | "Final Run Completed"
  | "Completed";

export interface VibrationLimit {
  bearing?: number;
  ffccv?: number;
}

export interface TrimBalanceCalculation extends ThreeShotInput {
  information: CalculationInformation;
  finalRun: EngineRun;
  limits: VibrationLimit;
  testScrewPositions: {
    first: number;
    second: number;
    third: number;
  };
  status: CalculationStatus;
  updatedAt: string;
}

export type PlotPointLabel = "A" | "B" | "C" | "D" | "E" | "F";

export type SensorType = "bearing" | "ffccv";

export interface SelectedPlotPoint {
  label: PlotPointLabel;
  sensor: SensorType;
  n1Speed: N1Speed;
  initialVibration: number;
}

export interface PlotPointData extends SelectedPlotPoint {
  firstVibration: number;
  secondVibration: number;
  thirdVibration: number;
}
