import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

async function resolveUserFromAccessToken(token) {
  const payload = verifyAccessToken(token);

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
    },
  });
}

export async function requireAuth(request, _response, next) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return next(unauthorized('Missing access token'));
  }

  try {
    const user = await resolveUserFromAccessToken(token);

    if (!user) {
      throw unauthorized('Invalid session');
    }

    request.user = user;
    return next();
  } catch (error) {
    return next(unauthorized('Invalid or expired access token'));
  }
}

export async function optionalAuth(request, _response, next) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return next();
  }

  try {
    const user = await resolveUserFromAccessToken(token);

    if (user) {
      request.user = user;
    }
  } catch {
    // Ignore invalid optional auth tokens for public routes.
  }

  return next();
}

export function requireRole(...roles) {
  return function roleGuard(request, _response, next) {
    if (!request.user) {
      return next(unauthorized('Unauthorized'));
    }

    if (!roles.includes(request.user.role)) {
      return next(forbidden('Insufficient permissions'));
    }

    return next();
  };
}
