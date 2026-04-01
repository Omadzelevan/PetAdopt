import { config } from '../config.js';

function getRequestOrigin(request) {
  const forwardedProto = request?.headers['x-forwarded-proto'];
  const forwardedHost = request?.headers['x-forwarded-host'] || request?.headers.host;

  if (forwardedHost) {
    const protocol =
      typeof forwardedProto === 'string' && forwardedProto.length > 0
        ? forwardedProto.split(',')[0].trim()
        : request?.protocol || 'https';

    return `${protocol}://${forwardedHost}`;
  }

  return config.serverPublicUrl;
}

export function toPublicAssetUrl(url, request) {
  if (!url) {
    return '';
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  return `${getRequestOrigin(request)}${url.startsWith('/') ? url : `/${url}`}`;
}

export function normalizePhotoInput(photos, uploadedFiles = []) {
  const inputList = Array.isArray(photos) ? photos : [];

  const fromInput = inputList
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item.url === 'string') {
        return item.url;
      }

      return null;
    })
    .filter(Boolean);

  const fromUpload = uploadedFiles.map((file) => `/uploads/${file.filename}`);
  return [...fromInput, ...fromUpload];
}
