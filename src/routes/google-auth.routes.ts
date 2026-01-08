import { Router } from 'express';
import { body } from 'express-validator';
import * as googleAuthController from '../controllers/google-auth.controller';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/auth/google - Authenticate with Google
router.post(
  '/google',
  authLimiter,
  validate([
    body('token').notEmpty().withMessage('Google token is required'),
    body('locale').optional().isIn(['ar', 'en']),
  ]),
  googleAuthController.googleAuth
);

// GET /api/auth/google/config - Get Google OAuth configuration
router.get('/google/config', googleAuthController.getGoogleConfig);

export default router;

