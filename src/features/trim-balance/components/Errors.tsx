export function Errors({ errors }: { errors: string[] }) {
  return <div className="validation"><strong>Analysis unavailable</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>;
}
