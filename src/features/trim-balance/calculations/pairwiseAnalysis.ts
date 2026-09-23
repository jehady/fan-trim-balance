import type { PlotPointLabel } from "../types/trimBalance";
import { distance, type Point } from "./geometry";

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

/** Manual worksheet quantity: U = point-to-point distance / (SP1 + SP2). */
export function calculatePairwiseAnalysis(points: BalancePoint[]): PairwiseAnalysis[] {
  const results: PairwiseAnalysis[] = [];
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const combinedSensitivity = points[first].sensitivity + points[second].sensitivity;
      results.push({
        pair: `${points[first].label}${points[second].label}`,
        distanceCmG: distance(points[first].point, points[second].point),
        combinedSensitivity,
        amplitude: combinedSensitivity === 0 ? Number.NaN : distance(points[first].point, points[second].point) / combinedSensitivity,
      });
    }
  }
  return results;
}
