import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { IdorProtection } from '../middlewares/idorProtection.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { AuthValidator } from '../validators/auth.validator.js';

export function createAuthRoutes(authController) {
  const router = Router();

  // Customer registration (can register before checkout/payment so orders are linked to userId)
  router.post(
    '/register',
    routeTryCatch(ValidatorMiddleware.body(AuthValidator.validateRegister)),
    routeTryCatch(authController.register)
  );

  // Customer or Staff/Owner login
  router.post(
    '/login',
    routeTryCatch(ValidatorMiddleware.body(AuthValidator.validateLogin)),
    routeTryCatch(authController.login)
  );

  // Dedicated Admin Studio login (strictly requires Owner or Staff role)
  router.post(
    '/admin/login',
    routeTryCatch(ValidatorMiddleware.body(AuthValidator.validateAdminLogin)),
    routeTryCatch(authController.adminLogin)
  );

  router.post('/logout', routeTryCatch(authController.logout));

  router.get(
    '/me',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(authController.getMe)
  );

  router.patch(
    '/me',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(authController.updateMe)
  );

  router.get(
    '/users/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(IdorProtection.verifySelfOrOwner('id')),
    routeTryCatch(authController.getUserById)
  );

  return router;
}
