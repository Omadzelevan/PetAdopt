import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(_request, _response, next) {
  next(new HttpError(404, 'Route not found'));
}

export function errorHandler(error, _request, response, _next) {
  const status = error instanceof HttpError ? error.status : 500;

  if (status >= 500) {
    console.error(error);
  }

  response.status(status).json({
    error: error.message || 'Unexpected server error',
    details: error.details || undefined,
  });
}
