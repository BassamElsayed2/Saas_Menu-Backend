import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as adminController from '../controllers/admin.controller';
import { validate } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/users - Get all users
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('planType').optional().isIn(['free', 'monthly', 'yearly']),
    query('search').optional().isString(),
  ],
  adminController.getAllUsers
);

// GET /api/admin/users/:userId - Get user details
router.get(
  '/users/:userId',
  [param('userId').isInt()],
  adminController.getUserDetails
);

// PUT /api/admin/users/:userId/plan - Update user plan
router.put(
  '/users/:userId/plan',
  validate([
    param('userId').isInt(),
    body('planType').isIn(['free', 'monthly', 'yearly']),
    body('menusLimit').isInt({ min: 1 }),
  ]),
  adminController.updateUserPlan
);

// GET /api/admin/menus - Get all menus
router.get(
  '/menus',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isBoolean(),
  ],
  adminController.getAllMenus
);

// GET /api/admin/menus/:menuId/ads - Get menu advertisements
router.get(
  '/menus/:menuId/ads',
  [param('menuId').isInt()],
  adminController.getMenuAds
);

// POST /api/admin/menus/:menuId/ads - Create advertisement
router.post(
  '/menus/:menuId/ads',
  validate([
    param('menuId').isInt(),
    body('title').notEmpty().trim().isLength({ max: 255 }),
    body('content').optional().isString().trim().isLength({ max: 2000 }),
    body('imageUrl').optional().isString().isLength({ max: 500 }),
    body('link').optional().isURL(),
    body('position').isIn(['top', 'bottom', 'sidebar', 'popup']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  adminController.createAd
);

// PUT /api/admin/ads/:adId - Update advertisement
router.put(
  '/ads/:adId',
  validate([
    param('adId').isInt(),
    body('title').optional().notEmpty().trim().isLength({ max: 255 }),
    body('content').optional().isString().trim().isLength({ max: 2000 }),
    body('imageUrl').optional().isString().isLength({ max: 500 }),
    body('link').optional().isURL(),
    body('position').optional().isIn(['top', 'bottom', 'sidebar', 'popup']),
    body('isActive').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  adminController.updateAd
);

// DELETE /api/admin/ads/:adId - Delete advertisement
router.delete(
  '/ads/:adId',
  [param('adId').isInt()],
  adminController.deleteAd
);

// GET /api/admin/statistics - Get system statistics
router.get('/statistics', adminController.getSystemStatistics);

export default router;


