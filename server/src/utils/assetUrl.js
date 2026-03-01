import { config } from '../config.js';

export function toPublicAssetUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${config.serverPublicUrl}${url.startsWith('/') ? url : `/${url}`}`;
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
