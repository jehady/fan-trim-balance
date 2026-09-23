export interface Point {
  x: number;
  y: number;
}

export interface Circle {
  center: Point;
  radius: number;
}

export interface ThreeShotGeometryInput {
  initialVibration: number;
  firstRunVibration: number;
  secondRunVibration: number;
  thirdRunVibration: number;

  firstTestScrewPosition: number;
  secondTestScrewPosition: number;
  thirdTestScrewPosition: number;
}

export interface ThreeShotGeometryResult {
  initialCircle: Circle;
  firstCircle: Circle;
  secondCircle: Circle;
  thirdCircle: Circle;

  resultantPoint: Point;
  resultantAmplitude: number;
  resultantAngleDeg: number;
  w6CmG: number;
  sensitivity: number;
}

import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
export { THREE_SHOT_TEST_WEIGHT_MOMENT_CM_G } from "./balanceWeight";

/**
 * Converts a rear-spinner-cone screw position to the polar-plot convention.
 *
 * The training-manual example places positions 35, 23, and 11 120 degrees
 * apart. It also places a 26 degree correction between positions 34 and 35.
 * Therefore the 36 equally-spaced positions map as 1 -> 0°, 36 -> 10°,
 * 35 -> 20°, continuing counter-clockwise when viewed aft looking forward.
 */
export function screwPositionToPlotAngle(position: number): number {
  if (!Number.isInteger(position) || position < 1 || position > 36) {
    throw new RangeError("Screw position must be an integer from 1 through 36.");
  }

  return (370 - position * 10) % 360;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeAngleDegrees(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360;
}

export function polarToCartesian(
  radius: number,
  angleDeg: number
): Point {
  const angle = degreesToRadians(angleDeg);

  return {
    x: radius * Math.sin(angle),
    y: radius * Math.cos(angle),
  };
}

export function distance(
  a: Point,
  b: Point
): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}

export interface CircleIntersectionResult {
  intersections: Point[];
}

/**
 * Finds the intersection points of two circles.
 *
 * Returns:
 * - 0 points if the circles do not intersect
 * - 1 point if they are tangent
 * - 2 points if they intersect at two points
 */
export function intersectCircles(
  c1: Circle,
  c2: Circle
): CircleIntersectionResult {
  const dx = c2.center.x - c1.center.x;
  const dy = c2.center.y - c1.center.y;

  const d = Math.sqrt(dx * dx + dy * dy);

  // No intersection:
  // circles are too far apart or one contains the other.
  if (d > c1.radius + c2.radius) {
    return { intersections: [] };
  }

  if (d < Math.abs(c1.radius - c2.radius)) {
    return { intersections: [] };
  }

  // Coincident circles.
  if (d === 0 && c1.radius === c2.radius) {
    return { intersections: [] };
  }

  // Distance from c1 center to the chord connecting
  // the two intersection points.
  const a =
    (c1.radius ** 2 -
      c2.radius ** 2 +
      d ** 2) /
    (2 * d);

  const hSquared =
    c1.radius ** 2 - a ** 2;

  // Numerical floating-point tolerance.
  const h = Math.sqrt(
    Math.max(0, hSquared)
  );

  const ux = dx / d;
  const uy = dy / d;

  const midpoint: Point = {
    x: c1.center.x + a * ux,
    y: c1.center.y + a * uy,
  };

  // Tangent circles.
  if (h === 0) {
    return {
      intersections: [midpoint],
    };
  }

  const offsetX = -uy * h;
  const offsetY = ux * h;

  return {
    intersections: [
      {
        x: midpoint.x + offsetX,
        y: midpoint.y + offsetY,
      },
      {
        x: midpoint.x - offsetX,
        y: midpoint.y - offsetY,
      },
    ],
  };
}

export function findCommonIntersection(
  circles: Circle[]
): Point | null {
  if (circles.length < 2) {
    return null;
  }

  let candidates = intersectCircles(
    circles[0],
    circles[1]
  ).intersections;

  for (let i = 2; i < circles.length; i++) {
    candidates = candidates.filter((candidate) =>
      isPointOnCircle(
        candidate,
        circles[i],
        0.05
      )
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  // If both possible intersections survive,
  // use the one closest to the origin.
  candidates.sort(
    (a, b) =>
      distanceFromOrigin(a) -
      distanceFromOrigin(b)
  );

  return candidates[0];
}

/**
 * Finds the centre of the common area of circles whose rounded radii do not
 * have one exact shared intersection. This is the numerical equivalent of the
 * manual's instruction to use the centre of that common area.
 */
export function findBestFitCommonIntersection(circles: Circle[]): Point | null {
  if (circles.length < 2) {
    return null;
  }

  const startingPoints: Point[] = [{ x: 0, y: 0 }, ...circles.map((circle) => circle.center)];

  for (let first = 0; first < circles.length; first += 1) {
    for (let second = first + 1; second < circles.length; second += 1) {
      startingPoints.push(
        ...intersectCircles(circles[first], circles[second]).intersections
      );
    }
  }

  const candidates = startingPoints
    .map((startingPoint) => refineCircleIntersection(circles, startingPoint))
    .filter((point): point is Point => point !== null);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) =>
    circleResidualSum(circles, candidate) < circleResidualSum(circles, best)
      ? candidate
      : best
  );
}

function refineCircleIntersection(circles: Circle[], startingPoint: Point): Point | null {
  let point = startingPoint;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    let jxx = 0;
    let jxy = 0;
    let jyy = 0;
    let jtrX = 0;
    let jtrY = 0;

    for (const circle of circles) {
      const dx = point.x - circle.center.x;
      const dy = point.y - circle.center.y;
      const radialDistance = Math.hypot(dx, dy);

      if (radialDistance === 0) {
        continue;
      }

      const residual = radialDistance - circle.radius;
      const jacobianX = dx / radialDistance;
      const jacobianY = dy / radialDistance;

      jxx += jacobianX * jacobianX;
      jxy += jacobianX * jacobianY;
      jyy += jacobianY * jacobianY;
      jtrX += jacobianX * residual;
      jtrY += jacobianY * residual;
    }

    const determinant = jxx * jyy - jxy * jxy;
    if (Math.abs(determinant) < 1e-12) {
      return null;
    }

    const stepX = (jyy * jtrX - jxy * jtrY) / determinant;
    const stepY = (-jxy * jtrX + jxx * jtrY) / determinant;

    point = { x: point.x - stepX, y: point.y - stepY };

    if (Math.hypot(stepX, stepY) < 1e-10) {
      return point;
    }
  }

  return point;
}

function circleResidualSum(circles: Circle[], point: Point): number {
  return circles.reduce((sum, circle) => {
    const residual = distance(point, circle.center) - circle.radius;
    return sum + residual ** 2;
  }, 0);
}

export function calculateThreeShotGeometry(
  input: ThreeShotGeometryInput
): ThreeShotGeometryResult {
  const initialCircle: Circle = {
    center: { x: 0, y: 0 },
    radius: input.initialVibration,
  };

  const buildRunCircle = (vibration: number, position: number): Circle => ({
    center: polarToCartesian(
      input.initialVibration,
      screwPositionToPlotAngle(position)
    ),
    radius: vibration,
  });

  const firstCircle = buildRunCircle(
    input.firstRunVibration,
    input.firstTestScrewPosition
  );
  const secondCircle = buildRunCircle(
    input.secondRunVibration,
    input.secondTestScrewPosition
  );
  const thirdCircle = buildRunCircle(
    input.thirdRunVibration,
    input.thirdTestScrewPosition
  );

  const resultantPoint = findBestFitCommonIntersection([
    firstCircle,
    secondCircle,
    thirdCircle,
  ]);

  if (!resultantPoint) {
    throw new Error("Unable to determine a resultant from the three run circles.");
  }

  const resultantAmplitude = distance(resultantPoint, initialCircle.center);
  if (resultantAmplitude === 0) {
    throw new Error("Resultant amplitude is zero; W6 and sensitivity are undefined.");
  }

  return {
    initialCircle,
    firstCircle,
    secondCircle,
    thirdCircle,
    resultantPoint,
    resultantAmplitude,
    resultantAngleDeg: normalizeAngleDegrees(
      radiansToDegrees(Math.atan2(resultantPoint.x, resultantPoint.y))
    ),
    w6CmG: calculateBalanceWeight(input.initialVibration, resultantAmplitude),
    sensitivity: calculateSensitivity(resultantAmplitude),
  };
}

function isPointOnCircle(
  point: Point,
  circle: Circle,
  tolerance: number
): boolean {
  return (
    Math.abs(
      distance(point, circle.center) -
        circle.radius
    ) <= tolerance
  );
}

function distanceFromOrigin(point: Point): number {
  return Math.sqrt(
    point.x ** 2 +
    point.y ** 2
  );
}
