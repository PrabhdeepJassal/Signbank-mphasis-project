type FacePoint = { x: number; y: number; z?: number };

const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;

function distance(a: FacePoint, b: FacePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function eyeAspectRatio(points: FacePoint[], indexes: readonly number[]): number {
  const [p1, p2, p3, p4, p5, p6] = indexes.map(i => points[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1;

  const vertical = distance(p2, p6) + distance(p3, p5);
  const horizontal = 2 * distance(p1, p4);
  if (horizontal === 0) return 1;

  return vertical / horizontal;
}

/** Returns the MINIMUM (most-closed) eye's EAR — one eye closed = detected */
export function getMinEyeAspectRatio(points: FacePoint[]): number {
  return Math.min(eyeAspectRatio(points, LEFT_EYE), eyeAspectRatio(points, RIGHT_EYE));
}
