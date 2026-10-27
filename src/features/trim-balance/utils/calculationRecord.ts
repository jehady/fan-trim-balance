import { N1_SPEEDS, normalizeCalculationStatus, type CalculationInformation, type EngineRun, type TrimBalanceCalculation } from "../types/trimBalance";

export const storageKey = "cfm56-7b-trim-balance-calculations";

export const blankRun = (): EngineRun => ({
  measurements: N1_SPEEDS.map((n1Speed) => ({ n1Speed, bearingVibration: Number.NaN, ffccvVibration: Number.NaN })),
});

export function createCalculation(now = new Date()): TrimBalanceCalculation {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const uniquePart = globalThis.crypto?.randomUUID?.() ??
    `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return {
    information: { id: `TB-${date}-${uniquePart}`, aircraftType: "", aircraftRegistration: "", aircraftEffectivity: "", initialScrewConfiguration: "", engineSerialNumber: "", engineModel: "CFM56-7B", date: now.toISOString().slice(0, 10), technician: "", notes: "" },
    initialRun: blankRun(),
    firstRun: blankRun(),
    secondRun: blankRun(),
    thirdRun: blankRun(),
    finalRun: blankRun(),
    limits: {},
    limitSources: {},
    selectedResultants: {},
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
  if (rawMeasurements.length !== N1_SPEEDS.length) return null;
  const speeds = rawMeasurements.map((measurement) =>
    isRecord(measurement) && typeof measurement.n1Speed === "string" ? measurement.n1Speed : null
  );
  if (speeds.some((speed) => speed === null || !N1_SPEEDS.includes(speed as typeof N1_SPEEDS[number])) ||
    new Set(speeds).size !== N1_SPEEDS.length) {
    return null;
  }
  const measurements = N1_SPEEDS.map((n1Speed) => {
    const source = rawMeasurements.find((item: unknown) => isRecord(item) && item.n1Speed === n1Speed);
    if (!isRecord(source) || !isMeasurementValue(source.bearingVibration) || !isMeasurementValue(source.ffccvVibration)) return null;
    return { n1Speed, bearingVibration: source.bearingVibration ?? Number.NaN, ffccvVibration: source.ffccvVibration ?? Number.NaN };
  });
  return measurements.every((measurement) => measurement !== null) ? { measurements } as EngineRun : null;
}

function isValidStatus(value: unknown): value is string {
  return typeof value === "string" && (
    value === "Draft" || value === "In Progress" || value === "Completed" ||
    value === "Correction Calculated" || value === "Final Run Completed"
  );
}

function isValidLimits(value: unknown): value is TrimBalanceCalculation["limits"] {
  if (!isRecord(value)) return false;
  return ["bearing", "ffccv"].every((key) => value[key] === undefined || (typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0));
}

const plotPointLabels = ["A", "B", "C", "D", "E", "F"] as const;

function isValidSelectedResultants(value: unknown): value is NonNullable<TrimBalanceCalculation["selectedResultants"]> {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([label, point]) =>
    plotPointLabels.includes(label as typeof plotPointLabels[number]) &&
    isRecord(point) &&
    typeof point.x === "number" && Number.isFinite(point.x) &&
    typeof point.y === "number" && Number.isFinite(point.y) &&
    !(Number.isNaN(point.x) || Number.isNaN(point.y) || point.x === Infinity || point.y === Infinity || point.x === -Infinity || point.y === -Infinity)
  );
}

function isValidLimitSources(value: unknown): value is NonNullable<TrimBalanceCalculation["limitSources"]> {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return ["bearing", "ffccv"].every((sensor) => {
    const source = value[sensor];
    if (source === undefined) return true;
    if (!isRecord(source)) return false;
    return ["documentTitle", "revisionOrDate", "effectivity", "sectionOrFigure"]
      .every((key) => typeof source[key] === "string") &&
      source.verificationStatus === "unverified";
  });
}

function isValidCalculationRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.information) || !isRecord(value.testScrewPositions)) return false;
  const information = value.information;
  const positions = value.testScrewPositions;
  const fields = ["id", "aircraftRegistration", "engineSerialNumber", "engineModel", "date", "technician", "notes"];
  const validPosition = (key: string) => typeof positions[key] === "number" && Number.isInteger(positions[key]) && positions[key] >= 1 && positions[key] <= 36;
  return fields.every((field) => typeof information[field] === "string") &&
    (information.aircraftType === undefined || typeof information.aircraftType === "string") &&
    (information.aircraftEffectivity === undefined || typeof information.aircraftEffectivity === "string") &&
    (information.initialScrewConfiguration === undefined || typeof information.initialScrewConfiguration === "string") &&
    ["first", "second", "third"].every(validPosition) &&
    ["initialRun", "firstRun", "secondRun", "thirdRun", "finalRun"].every((key) => normalizeRun(value[key]) !== null) &&
    isValidLimits(value.limits) &&
    isValidLimitSources(value.limitSources) &&
    isValidSelectedResultants(value.selectedResultants) &&
    isValidStatus(value.status) &&
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
  const information = item.information as CalculationInformation;
  return {
    ...item,
    status: normalizeCalculationStatus(item.status),
    information: {
      ...information,
      aircraftType: information.aircraftType ?? "",
      aircraftEffectivity: information.aircraftEffectivity ?? "",
      initialScrewConfiguration: information.initialScrewConfiguration ?? "",
    },
    limitSources: item.limitSources ?? {},
    selectedResultants: item.selectedResultants ?? {},
    initialRun,
    firstRun,
    secondRun,
    thirdRun,
    finalRun,
  } as TrimBalanceCalculation;
}
