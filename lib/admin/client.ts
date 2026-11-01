'use client';

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const url = new URL('/api/admin/' + path, window.location.origin);
  url.pathname = url.pathname.replace(/\/?$/, '/');
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error || 'Something went wrong. Please retry.', response.status);
  return data;
}
