export type AuthMethod = 'otp' | 'magic_link';

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}
