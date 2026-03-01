export function asyncHandler(fn) {
  return function wrapped(request, response, next) {
    Promise.resolve(fn(request, response, next)).catch(next);
  };
}
