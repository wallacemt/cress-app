import { DomainError } from "../domain/errors";
import { t } from "./i18n";

export function friendlyErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof DomainError) {
    const translated = t(`errors.${cause.code}`);
    if (translated !== `errors.${cause.code}`) return translated;
  }
  return fallback;
}
