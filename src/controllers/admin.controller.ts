import { Request, Response } from 'express';
import { getPool, sql, executeTransaction } from '../config/database';
import { logger } from '../utils/logger';

// Get all users (admin only)
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, planType, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const pool = await getPool();

    let whereClause = '';
    const request = pool.request()
      .input('limit', sql.Int, Number(limit))
      .input('offset', sql.Int, offset);

    if (planType) {
      whereClause += ' WHERE planType = @planType';
      request.input('planType', sql.NVarChar, planType as string);
    }

    if (search) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' (email LIKE @search OR name LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    // Get users
    const result = await request.query(`
      SELECT 
        id, email, name, phone, planType, menusLimit, currentMenusCount,
        emailVerified, isAdmin, createdAt
      FROM Users
      ${whereClause}
      ORDER BY createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    // Get total count
    const countResult = await pool
      .request()
      .query(`SELECT COUNT(*) as total FROM Users ${whereClause}`);

    res.json({
      users: result.recordset,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult.recordset[0].total,
        totalPages: Math.ceil(countResult.recordset[0].total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}

// Get user details with menus (admin only)
export async function getUserDetails(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const pool = await getPool();

    // Get user
    const userResult = await pool
      .request()
      .input('userId', sql.Int, parseInt(userId))
      .query(`
        SELECT 
          id, email, name, phone, planType, menusLimit, currentMenusCount,
          emailVerified, isAdmin, createdAt
        FROM Users
        WHERE id = @userId
      `);

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get user's menus
    const menusResult = await pool
      .request()
      .input('userId', sql.Int, parseInt(userId))
      .query(`
        SELECT 
          m.id, m.slug, m.isActive, m.createdAt,
          mt.name
        FROM Menus m
        LEFT JOIN MenuTranslations mt ON m.id = mt.menuId AND mt.locale = 'ar'
        WHERE m.userId = @userId
        ORDER BY m.createdAt DESC
      `);

    // Get user's statistics
    const statsResult = await pool
      .request()
      .input('userId', sql.Int, parseInt(userId))
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM MenuItems mi JOIN Menus m ON mi.menuId = m.id WHERE m.userId = @userId) as totalItems,
          (SELECT COUNT(*) FROM Ratings r JOIN Menus m ON r.menuId = m.id WHERE m.userId = @userId) as totalRatings,
          (SELECT AVG(CAST(rating AS FLOAT)) FROM Ratings r JOIN Menus m ON r.menuId = m.id WHERE m.userId = @userId) as averageRating
      `);

    res.json({
      user: userResult.recordset[0],
      menus: menusResult.recordset,
      statistics: statsResult.recordset[0],
    });
  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
}

// Update user plan (admin only)
export async function updateUserPlan(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { planType, menusLimit } = req.body;

    const pool = await getPool();

    await pool
      .request()
      .input('userId', sql.Int, parseInt(userId))
      .input('planType', sql.NVarChar, planType)
      .input('menusLimit', sql.Int, menusLimit)
      .query(`
        UPDATE Users 
        SET planType = @planType, menusLimit = @menusLimit
        WHERE id = @userId
      `);

    res.json({ message: 'User plan updated successfully' });
  } catch (error) {
    logger.error('Update user plan error:', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
}

// Get all menus (admin only)
export async function getAllMenus(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const pool = await getPool();

    let whereClause = '';
    const request = pool.request()
      .input('limit', sql.Int, Number(limit))
      .input('offset', sql.Int, offset);

    if (isActive !== undefined) {
      whereClause = ' WHERE m.isActive = @isActive';
      request.input('isActive', sql.Bit, isActive === 'true');
    }

    const result = await request.query(`
      SELECT 
        m.id, m.slug, m.isActive, m.createdAt,
        u.email as userEmail, u.name as userName, u.planType,
        mt.name
      FROM Menus m
      JOIN Users u ON m.userId = u.id
      LEFT JOIN MenuTranslations mt ON m.id = mt.menuId AND mt.locale = 'ar'
      ${whereClause}
      ORDER BY m.createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const countResult = await pool
      .request()
      .query(`SELECT COUNT(*) as total FROM Menus m ${whereClause}`);

    res.json({
      menus: result.recordset,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult.recordset[0].total,
        totalPages: Math.ceil(countResult.recordset[0].total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all menus error:', error);
    res.status(500).json({ error: 'Failed to get menus' });
  }
}

// Get advertisements for menu (admin only - for future use)
export async function getMenuAds(req: Request, res: Response): Promise<void> {
  try {
    const { menuId } = req.params;

    const pool = await getPool();

    const result = await pool
      .request()
      .input('menuId', sql.Int, parseInt(menuId))
      .query(`
        SELECT id, title, content, imageUrl, link, position, isActive, startDate, endDate
        FROM Advertisements
        WHERE menuId = @menuId
        ORDER BY position, id
      `);

    res.json({ ads: result.recordset });
  } catch (error) {
    logger.error('Get menu ads error:', error);
    res.status(500).json({ error: 'Failed to get advertisements' });
  }
}

// Create advertisement (admin only - for future use)
export async function createAd(req: Request, res: Response): Promise<void> {
  try {
    const { menuId } = req.params;
    const { title, content, imageUrl, link, position, startDate, endDate } = req.body;

    const pool = await getPool();

    // Verify menu exists and is on free plan
    const menuResult = await pool
      .request()
      .input('menuId', sql.Int, parseInt(menuId))
      .query(`
        SELECT m.id 
        FROM Menus m
        JOIN Users u ON m.userId = u.id
        WHERE m.id = @menuId AND u.planType = 'free'
      `);

    if (menuResult.recordset.length === 0) {
      res.status(404).json({ error: 'Menu not found or not on free plan' });
      return;
    }

    const result = await pool
      .request()
      .input('menuId', sql.Int, parseInt(menuId))
      .input('title', sql.NVarChar, title)
      .input('content', sql.NVarChar, content || null)
      .input('imageUrl', sql.NVarChar, imageUrl || null)
      .input('link', sql.NVarChar, link || null)
      .input('position', sql.NVarChar, position)
      .input('startDate', sql.DateTime, startDate || null)
      .input('endDate', sql.DateTime, endDate || null)
      .query(`
        INSERT INTO Advertisements (menuId, title, content, imageUrl, link, position, startDate, endDate)
        OUTPUT INSERTED.id
        VALUES (@menuId, @title, @content, @imageUrl, @link, @position, @startDate, @endDate)
      `);

    res.status(201).json({
      message: 'Advertisement created successfully',
      adId: result.recordset[0].id,
    });
  } catch (error) {
    logger.error('Create ad error:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
}

// Update advertisement (admin only)
export async function updateAd(req: Request, res: Response): Promise<void> {
  try {
    const { adId } = req.params;
    const { title, content, imageUrl, link, position, isActive, startDate, endDate } = req.body;

    const pool = await getPool();

    const updates: string[] = [];
    const request = pool.request().input('adId', sql.Int, parseInt(adId));

    if (title !== undefined) {
      updates.push('title = @title');
      request.input('title', sql.NVarChar, title);
    }
    if (content !== undefined) {
      updates.push('content = @content');
      request.input('content', sql.NVarChar, content);
    }
    if (imageUrl !== undefined) {
      updates.push('imageUrl = @imageUrl');
      request.input('imageUrl', sql.NVarChar, imageUrl);
    }
    if (link !== undefined) {
      updates.push('link = @link');
      request.input('link', sql.NVarChar, link);
    }
    if (position !== undefined) {
      updates.push('position = @position');
      request.input('position', sql.NVarChar, position);
    }
    if (isActive !== undefined) {
      updates.push('isActive = @isActive');
      request.input('isActive', sql.Bit, isActive);
    }
    if (startDate !== undefined) {
      updates.push('startDate = @startDate');
      request.input('startDate', sql.DateTime, startDate);
    }
    if (endDate !== undefined) {
      updates.push('endDate = @endDate');
      request.input('endDate', sql.DateTime, endDate);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await request.query(`
      UPDATE Advertisements 
      SET ${updates.join(', ')}
      WHERE id = @adId
    `);

    res.json({ message: 'Advertisement updated successfully' });
  } catch (error) {
    logger.error('Update ad error:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
}

// Delete advertisement (admin only)
export async function deleteAd(req: Request, res: Response): Promise<void> {
  try {
    const { adId } = req.params;

    const pool = await getPool();

    const result = await pool
      .request()
      .input('adId', sql.Int, parseInt(adId))
      .query('DELETE FROM Advertisements WHERE id = @adId');

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ error: 'Advertisement not found' });
      return;
    }

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    logger.error('Delete ad error:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
}

// Get system statistics (admin only)
export async function getSystemStatistics(req: Request, res: Response): Promise<void> {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Users) as totalUsers,
        (SELECT COUNT(*) FROM Users WHERE emailVerified = 1) as verifiedUsers,
        (SELECT COUNT(*) FROM Users WHERE planType = 'free') as freeUsers,
        (SELECT COUNT(*) FROM Users WHERE planType = 'monthly') as monthlyUsers,
        (SELECT COUNT(*) FROM Users WHERE planType = 'yearly') as yearlyUsers,
        (SELECT COUNT(*) FROM Menus) as totalMenus,
        (SELECT COUNT(*) FROM Menus WHERE isActive = 1) as activeMenus,
        (SELECT COUNT(*) FROM MenuItems) as totalMenuItems,
        (SELECT COUNT(*) FROM Ratings) as totalRatings,
        (SELECT AVG(CAST(rating AS FLOAT)) FROM Ratings) as averageRating
    `);

    res.json({ statistics: result.recordset[0] });
  } catch (error) {
    logger.error('Get system statistics error:', error);
    res.status(500).json({ error: 'Failed to get system statistics' });
  }
}


