import { Router } from 'express';
import { body, query } from 'express-validator';
import { 
  getPublicMenu, 
  submitRating, 
  getRecentRatings 
} from '../controllers/public.controller';
import { validate } from '../middleware/validation';
import { publicLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to all public routes
router.use(publicLimiter);

// GET /api/public/menu/:slug - Get menu by slug
router.get(
  '/menu/:slug',
  [
    query('locale').optional().isIn(['ar', 'en']).withMessage('Locale must be ar or en'),
  ],
  getPublicMenu
);

// GET /api/public/menu/:slug/ratings - Get recent ratings
router.get(
  '/menu/:slug/ratings',
  getRecentRatings
);

// POST /api/public/menu/:slug/rate - Add rating
router.post(
  '/menu/:slug/rate',
  validate([
    body('stars').isInt({ min: 1, max: 5 }).withMessage('Stars must be between 1 and 5'),
    body('comment').optional().isString().trim().isLength({ max: 1000 }),
    body('customerName').optional().isString().trim().isLength({ max: 255 }),
  ]),
  submitRating
);

export default router;


