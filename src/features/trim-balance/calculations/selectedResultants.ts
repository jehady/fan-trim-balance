import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
import { normalizeAngleDegrees, polarToCartesian, validateResultantSelection, type Point, type ThreeShotCircles } from "./geometry";
import { calculatePairwiseAnalysis, type BalancePoint, type PairwiseAnalysis } from "./pairwiseAnalysis";
import type { PlotPointData, PlotPointLabel } from "../types/trimBalance";

export type SelectedResultants = Partial<Record<PlotPointLabel, Point>>;

export function validateAllSelectedResultants(
  points: PlotPointData[],
  selections: SelectedResultants,
  circlesByLabel: Partial<Record<PlotPointLabel, ThreeShotCircles>>
): boolean {
  if (points.length !== 6) {
    return false;
  }

  return points.every((point) => {
    const selected = selections[point.label];
    const circles = circlesByLabel[point.label];
    if (!selected || !circles) {
      return false;
    }
    const validation = validateResultantSelection(
      [circles.firstCircle, circles.secondCircle, circles.thirdCircle],
      selected
    );
    if (!validation.valid) {
      return false;
    }
    return Number.isFinite(selected.x) && Number.isFinite(selected.y);
  });
}

export interface SelectedResultMetrics {
  resultantPoint: Point;
  resultantAmplitude: number;
  resultantAngleDeg: number;
  w6CmG: number;
  sensitivity: number;
}

export function storeSelectedResultant(
  selections: SelectedResultants,
  label: PlotPointLabel,
  point: Point
): SelectedResultants {
  return { ...selections, [label]: point };
}

export function calculateSelectedResultMetrics(
  point: PlotPointData,
  resultant: Point | undefined
): SelectedResultMetrics | undefined {
  if (!resultant) {
    return undefined;
  }

  const resultantAmplitude = Math.hypot(resultant.x, resultant.y);
  if (resultantAmplitude === 0) {
    return undefined;
  }

  return {
    resultantPoint: resultant,
    resultantAmplitude,
    resultantAngleDeg: normalizeAngleDegrees(Math.atan2(resultant.x, resultant.y) * 180 / Math.PI),
    w6CmG: calculateBalanceWeight(point.initialVibration, resultantAmplitude),
    sensitivity: calculateSensitivity(resultantAmplitude),
  };
}

export function calculateSelectedPairwiseAnalysis(
  points: PlotPointData[],
  selections: SelectedResultants
): PairwiseAnalysis[] {
  return calculatePairwiseAnalysis(buildSelectedBalancePoints(points, selections));
}

export function buildSelectedBalancePoints(
  points: PlotPointData[],
  selections: SelectedResultants
): BalancePoint[] {
  return points.flatMap((point) => {
    const metrics = calculateSelectedResultMetrics(point, selections[point.label]);
    return metrics ? [{ label: point.label, point: polarToCartesian(metrics.w6CmG, metrics.resultantAngleDeg), sensitivity: metrics.sensitivity }] : [];
  });
}
