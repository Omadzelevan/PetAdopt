import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findRemovedLocalPhotoUrls,
  isLocalUploadUrl,
  uploadedFilesToUrls,
} from './petPhotos.js';

test('uploadedFilesToUrls converts multer files into public upload paths', () => {
  const urls = uploadedFilesToUrls([
    { filename: 'cat.png' },
    { filename: 'dog.jpg' },
  ]);

  assert.deepEqual(urls, ['/uploads/cat.png', '/uploads/dog.jpg']);
});

test('isLocalUploadUrl only matches managed upload assets', () => {
  assert.equal(isLocalUploadUrl('/uploads/cat.png'), true);
  assert.equal(isLocalUploadUrl('https://example.com/cat.png'), false);
});

test('findRemovedLocalPhotoUrls ignores remote assets and keeps retained uploads', () => {
  const removed = findRemovedLocalPhotoUrls(
    [
      { url: '/uploads/a.png' },
      { url: '/uploads/b.png' },
      { url: 'https://images.example.com/c.png' },
    ],
    ['/uploads/b.png', 'https://images.example.com/c.png'],
  );

  assert.deepEqual(removed, ['/uploads/a.png']);
});
