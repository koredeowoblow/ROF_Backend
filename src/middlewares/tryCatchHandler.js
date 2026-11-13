/**
 * Route-Level Try-And-Catch Handler Class (SOLID - SRP & DRY)
 *
 * Centralizes try/catch handling exclusively at the Route level so that
 * Controllers, Services, and Repositories remain clean and free of repetitive try/catch blocks.
 */
export class TryCatchHandler {
  /**
   * Wrap an Express route handler or middleware in a route-level try/catch block
   * @param {Function} handler - Async or sync function (req, res, next)
   */
  static wrap(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('TryCatchHandler.wrap expects a function');
    }

    return async function routeLevelTryCatch(req, res, next) {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Wrap a sequence of route middlewares and controller action in route-level try/catch blocks
   * @param {...Function} handlers
   */
  static chain(...handlers) {
    return handlers.map((fn) => TryCatchHandler.wrap(fn));
  }
}

export const routeTryCatch = TryCatchHandler.wrap;
