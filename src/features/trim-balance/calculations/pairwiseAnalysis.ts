import type { PlotPointLabel } from "../types/trimBalance";
import type { Point } from "./geometry";

export interface BalancePoint {
  label: PlotPointLabel;
  point: Point;
  sensitivity: number;
}

export interface PairwiseAnalysis {
  pair: string;
  distanceCmG: number;
  combinedSensitivity: number;
  amplitude: number;
}
