import { PTIT_EMAIL_DOMAINS } from '../constants/auth.constants';

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isPtitEmail(input: string): boolean {
  const email = normalizeEmail(input);
  return PTIT_EMAIL_DOMAINS.some((domain) => email.endsWith(domain));
}
