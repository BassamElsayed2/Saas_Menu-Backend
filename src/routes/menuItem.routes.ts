import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as menuItemController from '../controllers/menuItem.controller';
import { validate } from '../middleware/validation';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true }); // To access menuId from parent router

// All routes require authentication
router.use(requireAuth);

// GET /api/menus/:menuId/items - Get menu items
router.get(
  '/',
  [
    param('menuId').isInt(),
    query('locale').optional().isIn(['ar', 'en']),
    query('category').optional().isString().trim(),
  ],
  menuItemController.getMenuItems
);

// POST /api/menus/:menuId/items - Create menu item
router.post(
  '/',
  validate([
    param('menuId').isInt(),
    body('nameAr').notEmpty().trim().isLength({ max: 255 }),
    body('nameEn').notEmpty().trim().isLength({ max: 255 }),
    body('descriptionAr').optional().isString().trim().isLength({ max: 2000 }),
    body('descriptionEn').optional().isString().trim().isLength({ max: 2000 }),
    body('categoryId').optional().isInt(),
    body('category').optional().trim().isLength({ max: 100 }),
    body().custom((value) => {
      // At least one of categoryId or category must be provided
      if (!value.categoryId && (!value.category || value.category.trim() === '')) {
        throw new Error('Either categoryId or category must be provided');
      }
      return true;
    }),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a valid number and greater than or equal to 0'),
    body('originalPrice').optional().isFloat({ min: 0 }),
    body('discountPercent').optional().isInt({ min: 0, max: 100 }),
    body('image').optional().isString().isLength({ max: 500 }),
    body('isAvailable').optional().isBoolean(),
    body('available').optional().isBoolean(),
    body('sortOrder').optional().isInt(),
  ]),
  menuItemController.createMenuItem
);

// PUT /api/menus/:menuId/items/:itemId - Update menu item
router.put(
  '/:itemId',
  validate([
    param('menuId').isInt(),
    param('itemId').isInt(),
    body('nameAr').optional().notEmpty().trim().isLength({ max: 255 }),
    body('nameEn').optional().notEmpty().trim().isLength({ max: 255 }),
    body('descriptionAr').optional().isString().trim().isLength({ max: 2000 }),
    body('descriptionEn').optional().isString().trim().isLength({ max: 2000 }),
    body('category').optional().notEmpty().trim().isLength({ max: 100 }),
    body('price').optional().isFloat({ min: 0 }),
    body('image').optional().isString().isLength({ max: 500 }),
    body('isAvailable').optional().isBoolean(),
    body('sortOrder').optional().isInt(),
  ]),
  menuItemController.updateMenuItem
);

// DELETE /api/menus/:menuId/items/:itemId - Delete menu item
router.delete(
  '/:itemId',
  [param('menuId').isInt(), param('itemId').isInt()],
  menuItemController.deleteMenuItem
);

// POST /api/menus/:menuId/items/reorder - Update display order
router.post(
  '/reorder',
  validate([
    param('menuId').isInt(),
    body('items').isArray(),
    body('items.*.id').isInt(),
    body('items.*.sortOrder').isInt(),
  ]),
  menuItemController.updateDisplayOrder
);

export default router;


