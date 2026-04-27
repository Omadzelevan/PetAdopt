import fs from 'node:fs/promises';
import path from 'node:path';

const uploadDir = path.join(process.cwd(), 'uploads');

export function uploadedFilesToUrls(uploadedFiles = []) {
  return uploadedFiles.map((file) => `/uploads/${file.filename}`);
}

export function isLocalUploadUrl(url) {
  return typeof url === 'string' && url.startsWith('/uploads/');
}

export function findRemovedLocalPhotoUrls(existingPhotos = [], nextPhotoUrls = []) {
  const nextUrls = new Set(nextPhotoUrls.filter(Boolean));

  return existingPhotos
    .map((photo) => (typeof photo === 'string' ? photo : photo?.url))
    .filter((url) => isLocalUploadUrl(url) && !nextUrls.has(url));
}

export async function deleteUploadedFiles(urls = [], baseDir = uploadDir) {
  const uniqueUrls = [...new Set(urls.filter(isLocalUploadUrl))];

  await Promise.allSettled(
    uniqueUrls.map(async (url) => {
      const fileName = path.basename(url);

      if (!fileName) {
        return;
      }

      try {
        await fs.unlink(path.join(baseDir, fileName));
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          console.error('Failed to delete uploaded pet image', {
            url,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }),
  );
}
