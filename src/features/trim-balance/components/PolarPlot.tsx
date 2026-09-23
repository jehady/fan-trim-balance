import type { Circle, Point } from "../calculations/geometry";

interface PolarPlotProps {
  initialCircle: Circle;
  runCircles: { circle: Circle; label: string; color: string }[];
  resultant: Point;
  resultantAngleDeg: number;
}

export function PolarPlot({ initialCircle, runCircles, resultant, resultantAngleDeg }: PolarPlotProps) {
  const max = Math.max(initialCircle.radius, ...runCircles.map(({ circle }) => Math.hypot(circle.center.x, circle.center.y) + circle.radius), Math.hypot(resultant.x, resultant.y)) * 1.15;
  const size = 440; const center = size / 2; const scale = (size / 2 - 28) / max;
  const x = (point: Point) => center + point.x * scale; const y = (point: Point) => center - point.y * scale;
  return <svg className="polar-plot" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Polar plot resultant angle ${resultantAngleDeg.toFixed(1)} degrees`}>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => { const r = (angle * Math.PI) / 180; return <line key={angle} x1={center} y1={center} x2={center + Math.sin(r) * (size / 2 - 18)} y2={center - Math.cos(r) * (size / 2 - 18)} className="polar-ray" />; })}
    {[0.25, 0.5, 0.75, 1].map((part) => <circle key={part} cx={center} cy={center} r={(size / 2 - 28) * part} className="polar-grid" />)}
    <circle cx={center} cy={center} r={initialCircle.radius * scale} className="initial-circle" />
    {runCircles.map(({ circle, label, color }) => <g key={label}><line x1={center} y1={center} x2={x(circle.center)} y2={y(circle.center)} stroke={color} className="test-ray" /><circle cx={x(circle.center)} cy={y(circle.center)} r={circle.radius * scale} fill="none" stroke={color} className="run-circle" /><text x={x(circle.center)} y={y(circle.center) - 7} fill={color}>{label}</text></g>)}
    <line x1={center} y1={center} x2={x(resultant)} y2={y(resultant)} className="resultant-line" /><circle cx={x(resultant)} cy={y(resultant)} r="5" className="resultant-dot" /><circle cx={center} cy={center} r="3" className="origin-dot" />
    <text x={center + 6} y="20" className="axis-label">0° reference</text><text x={x(resultant) + 8} y={y(resultant) - 8} className="resultant-label">R {resultantAngleDeg.toFixed(1)}°</text>
  </svg>;
}
