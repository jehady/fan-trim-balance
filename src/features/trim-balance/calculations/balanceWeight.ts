export const THREE_SHOT_TEST_WEIGHT_MOMENT_CM_G = 831.8;

export function calculateBalanceWeight(initialUnbalance: number, resultantAmplitude: number): number {
  if (!Number.isFinite(initialUnbalance) || initialUnbalance < 0) {
    throw new RangeError("Initial unbalance must be a non-negative number.");
  }
  if (!Number.isFinite(resultantAmplitude) || resultantAmplitude <= 0) {
    throw new RangeError("Resultant amplitude must be greater than zero.");
  }
  return (THREE_SHOT_TEST_WEIGHT_MOMENT_CM_G * initialUnbalance) / resultantAmplitude;
}

export function calculateSensitivity(resultantAmplitude: number): number {
  if (!Number.isFinite(resultantAmplitude) || resultantAmplitude <= 0) {
    throw new RangeError("Resultant amplitude must be greater than zero.");
  }
  return THREE_SHOT_TEST_WEIGHT_MOMENT_CM_G / resultantAmplitude;
}
