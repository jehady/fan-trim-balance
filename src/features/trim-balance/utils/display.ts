export const format = (value: number | undefined, digits = 1) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : "—";
export const sensorName = (sensor: "bearing" | "ffccv") => sensor === "bearing" ? "N°1 Bearing" : "FFCCV";
