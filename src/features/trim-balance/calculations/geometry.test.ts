import {
  calculateThreeShotGeometry,
  hasCommonArea,
  intersectCircles,
  distance,
  screwPositionToPlotAngle,
  validateResultantSelection,
  type Circle,
} from "./geometry";
import {
  describe,
  expect,
  it,
} from "vitest";

describe("circle intersection", () => {
  it("finds two intersections", () => {
    const circle1: Circle = {
      center: { x: 0, y: 0 },
      radius: 5,
    };

    const circle2: Circle = {
      center: { x: 8, y: 0 },
      radius: 5,
    };

    const result = intersectCircles(
      circle1,
      circle2
    );

    expect(result.intersections).toHaveLength(2);

    const first = result.intersections[0];
    const second = result.intersections[1];

    expect(distance(first, circle1.center))
      .toBeCloseTo(5);

    expect(distance(first, circle2.center))
      .toBeCloseTo(5);

    expect(distance(second, circle1.center))
      .toBeCloseTo(5);

    expect(distance(second, circle2.center))
      .toBeCloseTo(5);
  });
});

describe("manual resultant selection validation", () => {
  const overlapping = [
    { center: { x: 0, y: 0 }, radius: 5 },
    { center: { x: 10, y: 0 }, radius: 5 },
    { center: { x: 5, y: 0 }, radius: 5 },
  ];

  it("accepts a shared boundary point of the three circles", () => {
    expect(validateResultantSelection(overlapping, { x: 5, y: 0 }).valid).toBe(true);
  });

  it("accepts a point in the interior of the common area", () => {
    const circles = [
      { center: { x: 0, y: 0 }, radius: 5 },
      { center: { x: 1, y: 0 }, radius: 5 },
      { center: { x: 0, y: 1 }, radius: 5 },
    ];
    expect(validateResultantSelection(circles, { x: 1, y: 1 }).valid).toBe(true);
  });

  it("rejects a point outside the three-circle common area", () => {
    expect(validateResultantSelection(overlapping, { x: 20, y: 20 })).toMatchObject({
      valid: false,
      reason: "Select the resultant within the common overlap of all three run circles.",
    });
  });

  it("reports when the circles have no common area", () => {
    const inconsistent = [
      { center: { x: 0, y: 0 }, radius: 1 },
      { center: { x: 10, y: 0 }, radius: 1 },
      { center: { x: 0, y: 10 }, radius: 1 },
    ];
    expect(hasCommonArea(inconsistent)).toBe(false);
    expect(validateResultantSelection(inconsistent, { x: 0, y: 0 }).reason).toContain("Cannot determine");
  });

  it("does not let the pointer allowance manufacture a common area for separated circles", () => {
    const separated = [
      { center: { x: 0, y: 0 }, radius: 5 },
      { center: { x: 10.0001, y: 0 }, radius: 5 },
      { center: { x: 5, y: 0 }, radius: 5 },
    ];
    expect(validateResultantSelection(separated, { x: 5, y: 0 }).reason).toContain("Cannot determine");
  });

  it("rejects a zero resultant even when it lies in the common area", () => {
    const circles = [
      { center: { x: 0, y: 0 }, radius: 2 },
      { center: { x: 0, y: 0 }, radius: 2 },
      { center: { x: 0, y: 0 }, radius: 2 },
    ];
    expect(validateResultantSelection(circles, { x: 0, y: 0 }).reason).toContain("zero or too close to zero");
  });
});

describe("3-shot geometry", () => {
  it("uses the manual's physical screw-position convention", () => {
    expect(screwPositionToPlotAngle(35)).toBe(20);
    expect(screwPositionToPlotAngle(23)).toBe(140);
    expect(screwPositionToPlotAngle(11)).toBe(260);
  });

  it("reproduces the training-manual Point A construction", () => {
    const result = calculateThreeShotGeometry({
      initialVibration: 6.5,
      firstRunVibration: 4.0,
      secondRunVibration: 8.6,
      thirdRunVibration: 7.8,
      firstTestScrewPosition: 35,
      secondTestScrewPosition: 23,
      thirdTestScrewPosition: 11,
    });

    expect(result.resultantAmplitude).toBeCloseTo(2.7, 1);
    // The manual reports a 5° reading from a hand-drawn polar graph.
    // With its rounded input amplitudes, the numerical construction is 7.2°,
    // which is in the same 0–10° graphical reading interval.
    expect(result.resultantAngleDeg).toBeGreaterThanOrEqual(0);
    expect(result.resultantAngleDeg).toBeLessThanOrEqual(10);
    // The training-manual values are read from the plotted resultant (2.7 mils).
    expect(result.w6CmG).toBeGreaterThanOrEqual(1990);
    expect(result.w6CmG).toBeLessThanOrEqual(2020);
    expect(result.sensitivity).toBeCloseTo(308, -1);
  });
});
