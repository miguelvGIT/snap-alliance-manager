export async function api<T>(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
): Promise<T> {
  const response = await fetch('/api' + path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) {
    const message = (await response.json().catch(() => ({ error: 'Service unavailable.' }))) as {
      error?: string;
    };
    throw new Error(message.error ?? 'Could not connect to the service.');
  }
  return response.json() as Promise<T>;
}
