import { normalizeAngleDegrees, type Point } from "./geometry";
import type { BalancePoint, PairwiseAnalysis } from "./pairwiseAnalysis";

export interface FinalCorrectionResult {
  selectedPair: string;
  u: number;
  firstPoint: Point;
  secondPoint: Point;
  pairDistance: number;
  distanceFromFirst: number;
  finalPoint: Point;
  finalWeightCmG: number;
  finalAngleDeg: number;
}

export function selectMaximumUPair(pairs: PairwiseAnalysis[]): PairwiseAnalysis | undefined {
  return pairs.reduce<PairwiseAnalysis | undefined>(
    (highest, pair) => !highest || pair.amplitude > highest.amplitude ? pair : highest,
    undefined
  );
}

/**
 * Applies the worksheet vector construction to the selected pair. U is the
 * distance from the first selected balance point after scaling by its
 * sensitivity; the final correction is the resulting origin vector.
 */
export function calculateFinalCorrection(
  first: BalancePoint,
  second: BalancePoint,
  pair: PairwiseAnalysis
): FinalCorrectionResult {
  const directionX = second.point.x - first.point.x;
  const directionY = second.point.y - first.point.y;
  const pairDistance = Math.hypot(directionX, directionY);
  if (pairDistance === 0) {
    throw new RangeError("Selected pair points must not overlap.");
  }

  const distanceFromFirst = pair.amplitude * first.sensitivity;
  const finalPoint = {
    x: first.point.x + (directionX / pairDistance) * distanceFromFirst,
    y: first.point.y + (directionY / pairDistance) * distanceFromFirst,
  };

  return {
    selectedPair: pair.pair,
    u: pair.amplitude,
    firstPoint: first.point,
    secondPoint: second.point,
    pairDistance,
    distanceFromFirst,
    finalPoint,
    finalWeightCmG: Math.hypot(finalPoint.x, finalPoint.y),
    finalAngleDeg: normalizeAngleDegrees(Math.atan2(finalPoint.x, finalPoint.y) * 180 / Math.PI),
  };
}

export function calculateFinalCorrectionFromPairwise(
  points: BalancePoint[],
  pairs: PairwiseAnalysis[]
): FinalCorrectionResult | undefined {
  const selectedPair = selectMaximumUPair(pairs);
  if (!selectedPair) {
    return undefined;
  }

  const first = points.find((point) => point.label === selectedPair.pair[0]);
  const second = points.find((point) => point.label === selectedPair.pair[1]);
  if (!first || !second) {
    throw new Error(`Selected pair ${selectedPair.pair} has no matching balance points.`);
  }

  return calculateFinalCorrection(first, second, selectedPair);
}
