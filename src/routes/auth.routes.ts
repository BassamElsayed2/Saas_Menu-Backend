import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { 
  authLimiter, 
  passwordResetLimiter, 
  emailVerificationLimiter 
} from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/signup
router.post(
  '/signup',
  authLimiter,
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().trim().isLength({ max: 255 }),
    body('locale').optional().isIn(['ar', 'en']),
  ]),
  authController.signup
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  authController.login
);

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  emailVerificationLimiter,
  validate([
    body('email').isEmail().normalizeEmail(),
    body('locale').optional().isIn(['ar', 'en']),
  ]),
  authController.resendVerification
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate([
    body('email').isEmail().normalizeEmail(),
    body('locale').optional().isIn(['ar', 'en']),
  ]),
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
    body('locale').optional().isIn(['ar', 'en']),
  ]),
  authController.resetPassword
);

// GET /api/auth/me - Protected route
router.get('/me', requireAuth, authController.getMe);

export default router;


