const rawApiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const API_BASE = rawApiBase;
export const API_ORIGIN = rawApiBase.endsWith('/api')
  ? rawApiBase.slice(0, -4)
  : rawApiBase;

function resolvePath(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}/${path}`;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    headers = {},
    isFormData = false,
  } = options;

  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let payload = body;

  if (body && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(resolvePath(path), {
    method,
    headers: requestHeaders,
    body: payload,
  });

  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data.error || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.details = typeof data === 'string' ? undefined : data.details;
    throw error;
  }

  return data;
}

export function resolveAssetUrl(value) {
  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value}`;
}
