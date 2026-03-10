const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RefreshPayload = {
  success: boolean;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

type MePayload = {
  success: boolean;
  user: {
    id: string;
    email: string;
    status: string;
    verifiedAt: string | null;
    createdAt: string;
  };
};

export function clearAuthSession() {
  localStorage.removeItem('ptitdate_email');
  localStorage.removeItem('ptitdate_access_token');
  localStorage.removeItem('ptitdate_refresh_token');
}

export async function authorizedFetch(path: string, init?: RequestInit) {
  const buildRequest = (accessToken: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

  let accessToken = localStorage.getItem('ptitdate_access_token');
  let response = await buildRequest(accessToken);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      accessToken = refreshed.accessToken;
      response = await buildRequest(accessToken);
    }
  }

  return response;
}

export async function refreshSession() {
  const refreshToken = localStorage.getItem('ptitdate_refresh_token');
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const data = (await response.json()) as RefreshPayload;
  localStorage.setItem('ptitdate_access_token', data.accessToken);
  localStorage.setItem('ptitdate_refresh_token', data.refreshToken);
  localStorage.setItem('ptitdate_email', data.email);
  return data;
}

export async function fetchCurrentUser() {
  const response = await authorizedFetch('/auth/me');
  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const data = (await response.json()) as MePayload;
  localStorage.setItem('ptitdate_email', data.user.email);
  return data.user;
}
