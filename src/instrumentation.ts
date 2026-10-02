import type { Instrumentation } from 'next';

/** Nothing to set up at boot; the file exists for `onRequestError`. */
export function register() {}

/**
 * Next.js calls this for every server error: page renders, route handlers and
 * server actions. Errors are grouped and stored by the errors module (see
 * /admin/system). Middleware runs on the edge runtime, without database
 * access, so its errors only reach the server log.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Written as a positive check so the edge bundle drops the import entirely.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recordServerError } = await import('@/modules/errors/service');
    await recordServerError(error, {
      path: request.path,
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
    });
  }
};
