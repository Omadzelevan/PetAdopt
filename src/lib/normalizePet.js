import { resolveAssetUrl } from './api';

function normalizeHealth(health) {
  if (Array.isArray(health)) {
    return health;
  }

  if (typeof health === 'string') {
    return health
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function inferTemperament(source) {
  if (Array.isArray(source?.temperament) && source.temperament.length > 0) {
    return source.temperament;
  }

  if (typeof source?.description === 'string') {
    const text = source.description.toLowerCase();
    const inferred = [];

    if (text.includes('friendly') || text.includes('social')) {
      inferred.push('Friendly');
    }
    if (text.includes('calm') || text.includes('quiet')) {
      inferred.push('Calm');
    }
    if (text.includes('active') || text.includes('energetic')) {
      inferred.push('Active');
    }

    if (inferred.length > 0) {
      return inferred;
    }
  }

  return ['Resilient', 'Loving'];
}

export function normalizePet(source) {
  const photos = Array.isArray(source.photos) ? source.photos : [];
  const images = photos.length > 0
    ? photos.map((photo) => resolveAssetUrl(photo.url || photo))
    : ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80'];

  return {
    ...source,
    images,
    health: normalizeHealth(source.health),
    temperament: inferTemperament(source),
    listingType: source.listingType || 'ADOPTION',
    status: source.status || 'ACTIVE',
  };
}
