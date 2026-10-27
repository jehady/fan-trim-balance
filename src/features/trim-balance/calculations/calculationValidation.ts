export class CalculationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationValidationError";
  }
}
