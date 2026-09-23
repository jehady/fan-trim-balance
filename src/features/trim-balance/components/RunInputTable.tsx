import { N1_SPEEDS, type EngineRun, type N1Speed } from "../types/trimBalance";

interface RunInputTableProps {
  run: EngineRun;
  onChange: (speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => void;
  comparisonRun?: EngineRun;
}

function displayValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function RunInputTable({ run, onChange, comparisonRun }: RunInputTableProps) {
  return <div className="table-wrap"><table className="measurement-table">
    <thead><tr><th>N1 target</th><th>N°1 bearing <small>mils</small></th><th>FFCCV <small>mils</small></th>{comparisonRun && <><th>Δ bearing</th><th>Δ FFCCV</th></>}</tr></thead>
    <tbody>{N1_SPEEDS.map((speed) => {
      const measurement = run.measurements.find((item) => item.n1Speed === speed);
      const comparison = comparisonRun?.measurements.find((item) => item.n1Speed === speed);
      const bearingDifference = comparison && measurement ? measurement.bearingVibration - comparison.bearingVibration : Number.NaN;
      const ffccvDifference = comparison && measurement ? measurement.ffccvVibration - comparison.ffccvVibration : Number.NaN;
      return <tr key={speed}><th scope="row">{speed === "TO" ? "TO" : `${speed}%`}</th>
        <td><input aria-label={`${speed} bearing vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={displayValue(measurement?.bearingVibration ?? Number.NaN)} onChange={(event) => onChange(speed, "bearingVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td>
        <td><input aria-label={`${speed} FFCCV vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={displayValue(measurement?.ffccvVibration ?? Number.NaN)} onChange={(event) => onChange(speed, "ffccvVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td>
        {comparisonRun && <><td className={bearingDifference < 0 ? "improved" : ""}>{Number.isFinite(bearingDifference) ? `${bearingDifference > 0 ? "+" : ""}${bearingDifference.toFixed(1)}` : "—"}</td><td className={ffccvDifference < 0 ? "improved" : ""}>{Number.isFinite(ffccvDifference) ? `${ffccvDifference > 0 ? "+" : ""}${ffccvDifference.toFixed(1)}` : "—"}</td></>}
      </tr>;
    })}</tbody>
  </table></div>;
}
