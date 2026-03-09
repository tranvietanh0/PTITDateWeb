import { PTIT_EMAIL_DOMAIN } from '../constants/auth.constants';

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isPtitEmail(input: string): boolean {
  return normalizeEmail(input).endsWith(PTIT_EMAIL_DOMAIN);
}
