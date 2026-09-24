import { Card } from "./Card";
import type { TrimBalanceCalculation } from "../types/trimBalance";

type UpdateCalculation = (change: (item: TrimBalanceCalculation) => TrimBalanceCalculation) => void;

export function Information({ calculation, update }: { calculation: TrimBalanceCalculation; update: UpdateCalculation }) {
  const fields = [["id", "Calculation ID / reference"], ["aircraftRegistration", "Aircraft registration"], ["engineSerialNumber", "Engine serial number"], ["engineModel", "Engine model"], ["date", "Date"], ["technician", "Technician / engineer"]] as const;
  return <Card title="Calculation information" step={0}><p>Reference fields identify this local calculation record. They are not mandatory calculation inputs.</p><div className="form-grid">{fields.map(([key, label]) => <label key={key}>{label}<input type={key === "date" ? "date" : "text"} value={calculation.information[key]} onChange={(event) => update((item) => ({ ...item, information: { ...item.information, [key]: event.target.value } }))} /></label>)}<label className="full-width">Notes<textarea value={calculation.information.notes} onChange={(event) => update((item) => ({ ...item, information: { ...item.information, notes: event.target.value } }))} /></label></div></Card>;
}
