export type DomainErrorCode =
  | "VALIDATION"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "DUPLICATE_SCORE"
  | "NOT_A_PDF"
  | "TOO_LARGE"
  | "SCAN_NOT_FOUND"
  | (string & {});
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
