import { Request, Response } from 'express';
import { getPool, sql } from '../config/database';

// Get public menu by slug
export const getPublicMenu = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { locale = 'en' } = req.query;

    const pool = await getPool();

    // Get menu details with translations
    const menuResult = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .input('locale', sql.NVarChar, locale)
      .query(`
        SELECT 
          m.id,
          m.slug,
          m.logo,
          m.theme,
          m.isActive,
          mt.name,
          mt.description,
          mt.locale
        FROM Menus m
        LEFT JOIN MenuTranslations mt ON m.id = mt.menuId AND mt.locale = @locale
        WHERE m.slug = @slug
      `);

    if (menuResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const menu = menuResult.recordset[0];

    // إذا كانت القائمة غير نشطة، أرسل بيانات محدودة لصفحة الصيانة فقط
    if (!menu.isActive) {
      return res.json({
        success: true,
        data: {
          menu: {
            id: menu.id,
            name: menu.name,
            description: menu.description,
            logo: menu.logo,
            theme: menu.theme,
            slug: menu.slug,
            isActive: menu.isActive,
            locale: menu.locale
          },
          items: [],
          itemsByCategory: {},
          branches: [],
          rating: {
            average: 0,
            total: 0
          }
        }
      });
    }

    // Check if Categories table exists and if categoryId column exists
    const categoriesTableCheck = await pool.request()
      .query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Categories'
      `);
    
    const hasCategoriesTable = categoriesTableCheck.recordset[0].count > 0;
    
    const columnCheck = await pool.request()
      .query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MenuItems' 
        AND COLUMN_NAME IN ('categoryId', 'originalPrice', 'discountPercent')
      `);
    
    const existingColumns = columnCheck.recordset.map((r: any) => r.COLUMN_NAME);
    const hasCategoryId = existingColumns.includes('categoryId');
    const hasOriginalPrice = existingColumns.includes('originalPrice');
    const hasDiscountPercent = existingColumns.includes('discountPercent');

    // Get categories if Categories table exists
    let categories: any[] = [];
    if (hasCategoriesTable) {
      const categoriesResult = await pool.request()
        .input('menuId', sql.Int, menu.id)
        .input('locale', sql.NVarChar, locale)
        .query(`
          SELECT 
            c.id,
            c.image,
            c.sortOrder,
            c.isActive,
            ct.name
          FROM Categories c
          LEFT JOIN CategoryTranslations ct ON c.id = ct.categoryId AND ct.locale = @locale
          WHERE c.menuId = @menuId AND c.isActive = 1
          ORDER BY c.sortOrder ASC, c.createdAt DESC
        `);
      categories = categoriesResult.recordset;
    }

    // Build SELECT fields for menu items
    const selectFields: string[] = ['mi.id', 'mi.price', 'mi.image', 'mi.available', 'mi.sortOrder'];
    
    if (hasCategoryId) {
      selectFields.push('mi.categoryId');
    }
    selectFields.push('mi.category'); // Keep for backward compatibility
    
    if (hasOriginalPrice) {
      selectFields.push('mi.originalPrice');
    }
    if (hasDiscountPercent) {
      selectFields.push('mi.discountPercent');
    }
    
    selectFields.push('mit.name', 'mit.description', 'mit.locale');
    
    // Add category name if Categories table exists
    if (hasCategoriesTable && hasCategoryId) {
      selectFields.push('ct.name as categoryName');
    }

    // Build JOIN clause
    let joinClause = 'LEFT JOIN MenuItemTranslations mit ON mi.id = mit.menuItemId AND mit.locale = @locale';
    if (hasCategoriesTable && hasCategoryId) {
      joinClause += '\n          LEFT JOIN Categories c ON mi.categoryId = c.id\n          LEFT JOIN CategoryTranslations ct ON c.id = ct.categoryId AND ct.locale = @locale';
    }

    // Get menu items with translations
    const itemsQuery = `
      SELECT 
        ${selectFields.join(',\n        ')}
      FROM MenuItems mi
      ${joinClause}
      WHERE mi.menuId = @menuId AND mi.available = 1
      ORDER BY mi.sortOrder ASC, mi.createdAt DESC
    `;

    const itemsResult = await pool.request()
      .input('menuId', sql.Int, menu.id)
      .input('locale', sql.NVarChar, locale)
      .query(itemsQuery);

    // Get branches with translations
    const branchesResult = await pool.request()
      .input('menuId', sql.Int, menu.id)
      .input('locale', sql.NVarChar, locale)
      .query(`
        SELECT 
          b.id,
          b.phone,
          b.latitude,
          b.longitude,
          bt.name,
          bt.address,
          bt.locale
        FROM Branches b
        LEFT JOIN BranchTranslations bt ON b.id = bt.branchId AND bt.locale = @locale
        WHERE b.menuId = @menuId
      `);

    // Get ratings
    const ratingsResult = await pool.request()
      .input('menuId', sql.Int, menu.id)
      .query(`
        SELECT 
          AVG(CAST(stars AS FLOAT)) as averageRating,
          COUNT(*) as totalRatings
        FROM Ratings
        WHERE menuId = @menuId
      `);

    const rating = ratingsResult.recordset[0];

    // Group items by category
    // If using Categories table, group by categoryId and category name
    // Otherwise, use the old category string field
    const itemsByCategory: Record<string, any[]> = {};
    
    if (hasCategoriesTable && hasCategoryId) {
      // Group by category ID and name
      itemsResult.recordset.forEach((item: any) => {
        const categoryKey = item.categoryId 
          ? `category_${item.categoryId}` 
          : (item.category || 'other');
        
        if (!itemsByCategory[categoryKey]) {
          itemsByCategory[categoryKey] = [];
        }
        itemsByCategory[categoryKey].push(item);
      });
    } else {
      // Fallback to old category string grouping
      itemsResult.recordset.forEach((item: any) => {
        const categoryKey = item.category || 'other';
        if (!itemsByCategory[categoryKey]) {
          itemsByCategory[categoryKey] = [];
        }
        itemsByCategory[categoryKey].push(item);
      });
    }

    res.json({
      success: true,
      data: {
        menu: {
          id: menu.id,
          name: menu.name,
          description: menu.description,
          logo: menu.logo,
          theme: menu.theme,
          slug: menu.slug,
          isActive: menu.isActive,
          locale: menu.locale
        },
        categories: categories, // Add categories array
        items: itemsResult.recordset,
        itemsByCategory,
        branches: branchesResult.recordset,
        rating: {
          average: rating.averageRating ? parseFloat(rating.averageRating.toFixed(1)) : 0,
          total: rating.totalRatings
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching public menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
};

// Submit rating
export const submitRating = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { stars, comment, customerName } = req.body;

    // Validation
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be between 1 and 5'
      });
    }

    const pool = await getPool();

    // Get menu ID from slug
    const menuResult = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(`
        SELECT id FROM Menus 
        WHERE slug = @slug AND isActive = 1
      `);

    if (menuResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const menuId = menuResult.recordset[0].id;
    const ipAddress = req.ip || req.socket.remoteAddress || '';

    // Check if IP already rated in the last 24 hours
    const rateCheckResult = await pool.request()
      .input('menuId', sql.Int, menuId)
      .input('ipAddress', sql.NVarChar, ipAddress)
      .query(`
        SELECT id FROM Ratings 
        WHERE menuId = @menuId 
        AND ipAddress = @ipAddress 
        AND createdAt > DATEADD(hour, -24, GETDATE())
      `);

    if (rateCheckResult.recordset.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'You can only rate once every 24 hours'
      });
    }

    // Insert rating
    await pool.request()
      .input('menuId', sql.Int, menuId)
      .input('stars', sql.Int, stars)
      .input('comment', sql.NVarChar, comment || null)
      .input('customerName', sql.NVarChar, customerName || null)
      .input('ipAddress', sql.NVarChar, ipAddress)
      .query(`
        INSERT INTO Ratings (menuId, stars, comment, customerName, ipAddress)
        VALUES (@menuId, @stars, @comment, @customerName, @ipAddress)
      `);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
      error: error.message
    });
  }
};

// Get recent ratings
export const getRecentRatings = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const pool = await getPool();

    // Get menu ID from slug
    const menuResult = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(`
        SELECT id FROM Menus 
        WHERE slug = @slug AND isActive = 1
      `);

    if (menuResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const menuId = menuResult.recordset[0].id;

    // Get recent ratings
    const ratingsResult = await pool.request()
      .input('menuId', sql.Int, menuId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          stars,
          comment,
          customerName,
          createdAt
        FROM Ratings
        WHERE menuId = @menuId
        ORDER BY createdAt DESC
      `);

    res.json({
      success: true,
      data: {
        ratings: ratingsResult.recordset
      }
    });
  } catch (error: any) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings',
      error: error.message
    });
  }
};
