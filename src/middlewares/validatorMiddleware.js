/**
 * Class-Based Request Validation Middleware Adapter (SOLID - SRP & OCP)
 * Connects domain Validator classes to Express routes.
 */
export class ValidatorMiddleware {
  /**
   * Validate req.body using a validator function
   */
  static body(validatorFn) {
    return (req, res, next) => {
      req.body = validatorFn(req.body);
      next();
    };
  }

  /**
   * Validate req.query using a validator function
   */
  static query(validatorFn) {
    return (req, res, next) => {
      validatorFn(req.query);
      next();
    };
  }

  /**
   * Validate req.params using a validator function
   */
  static params(validatorFn) {
    return (req, res, next) => {
      req.params = validatorFn(req.params);
      next();
    };
  }
}
