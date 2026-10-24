import type { Point } from "../calculations/geometry";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { ThreeShotCircles } from "../calculations/geometry";
import type { PlotPointLabel, TrimBalanceCalculation } from "../types/trimBalance";

export type PlotPoint = ReturnType<typeof buildPlotPoints>[number];
export type PlotGeometry = ThreeShotCircles;
export type Analysis = { point: PlotPoint; geometry: PlotGeometry };
export type ResultantMetrics = { resultantPoint: Point; resultantAmplitude: number; resultantAngleDeg: number; w6CmG: number; sensitivity: number };
export type UpdateCalculation = (change: (item: TrimBalanceCalculation) => TrimBalanceCalculation) => void;
export type ResultantSelection = Partial<Record<PlotPointLabel, Point>>;
