import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

export async function requireAuth(request, _response, next) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return next(unauthorized('Missing access token'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw unauthorized('Invalid session');
    }

    request.user = user;
    return next();
  } catch (error) {
    return next(unauthorized('Invalid or expired access token'));
  }
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
