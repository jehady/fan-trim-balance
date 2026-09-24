import { N1_SPEEDS, type EngineRun, type TrimBalanceCalculation } from "../types/trimBalance";

export const storageKey = "cfm56-7b-trim-balance-calculations";

export const blankRun = (): EngineRun => ({
  measurements: N1_SPEEDS.map((n1Speed) => ({ n1Speed, bearingVibration: Number.NaN, ffccvVibration: Number.NaN })),
});

export function createCalculation(): TrimBalanceCalculation {
  const now = new Date();
  return {
    information: { id: `TB-${now.toISOString().slice(0, 10).replaceAll("-", "")}`, aircraftRegistration: "", engineSerialNumber: "", engineModel: "CFM56-7B", date: now.toISOString().slice(0, 10), technician: "", notes: "" },
    initialRun: blankRun(),
    firstRun: blankRun(),
    secondRun: blankRun(),
    thirdRun: blankRun(),
    finalRun: blankRun(),
    limits: {},
    testScrewPositions: { first: 35, second: 23, third: 11 },
    status: "Draft",
    updatedAt: now.toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMeasurementValue(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function normalizeRun(value: unknown): EngineRun | null {
  if (!isRecord(value) || !Array.isArray(value.measurements)) return null;
  const rawMeasurements = value.measurements;
  const measurements = N1_SPEEDS.map((n1Speed) => {
    const source = rawMeasurements.find((item: unknown) => isRecord(item) && item.n1Speed === n1Speed);
    if (!isRecord(source) || !isMeasurementValue(source.bearingVibration) || !isMeasurementValue(source.ffccvVibration)) return null;
    return { n1Speed, bearingVibration: source.bearingVibration ?? Number.NaN, ffccvVibration: source.ffccvVibration ?? Number.NaN };
  });
  return measurements.every((measurement) => measurement !== null) ? { measurements } as EngineRun : null;
}

function isValidLimits(value: unknown): value is TrimBalanceCalculation["limits"] {
  if (!isRecord(value)) return false;
  return ["bearing", "ffccv"].every((key) => value[key] === undefined || (typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0));
}

function isValidCalculationRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.information) || !isRecord(value.testScrewPositions)) return false;
  const information = value.information;
  const positions = value.testScrewPositions;
  const fields = ["id", "aircraftRegistration", "engineSerialNumber", "engineModel", "date", "technician", "notes"];
  const validPosition = (key: string) => typeof positions[key] === "number" && Number.isInteger(positions[key]) && positions[key] >= 1 && positions[key] <= 36;
  return fields.every((field) => typeof information[field] === "string") &&
    ["first", "second", "third"].every(validPosition) &&
    ["initialRun", "firstRun", "secondRun", "thirdRun", "finalRun"].every((key) => normalizeRun(value[key]) !== null) &&
    isValidLimits(value.limits) &&
    (value.status === "Draft" || value.status === "In Progress" || value.status === "Completed") &&
    typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt));
}

export function restoreCalculation(item: unknown): TrimBalanceCalculation | null {
  if (!isValidCalculationRecord(item)) return null;
  const initialRun = normalizeRun(item.initialRun);
  const firstRun = normalizeRun(item.firstRun);
  const secondRun = normalizeRun(item.secondRun);
  const thirdRun = normalizeRun(item.thirdRun);
  const finalRun = normalizeRun(item.finalRun);
  if (!initialRun || !firstRun || !secondRun || !thirdRun || !finalRun) return null;
  return { ...item, initialRun, firstRun, secondRun, thirdRun, finalRun } as TrimBalanceCalculation;
}
