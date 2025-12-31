import { Request, Response } from "express";
import { getPool, sql } from "../config/database";
import { logger } from "../utils/logger";
import bcrypt from "bcryptjs";

// Get Admin Dashboard Statistics
export async function getAdminStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const pool = await getPool();

    // Total Users
    const totalUsersResult = await pool.request().query(`
      SELECT COUNT(*) as totalUsers FROM Users WHERE role = 'user'
    `);
    const totalUsers = totalUsersResult.recordset[0].totalUsers;

    // Active Accounts (users with active menus)
    const activeAccountsResult = await pool.request().query(`
      SELECT COUNT(DISTINCT userId) as activeAccounts 
      FROM Menus 
      WHERE isActive = 1
    `);
    const activeAccounts = activeAccountsResult.recordset[0].activeAccounts;

    // Paid Plans (active paid subscriptions)
    const paidPlansResult = await pool.request().query(`
      SELECT COUNT(*) as paidPlans 
      FROM Subscriptions s
      INNER JOIN Plans p ON s.planId = p.id
      WHERE s.status = 'active' AND p.priceMonthly > 0
    `);
    const paidPlans = paidPlansResult.recordset[0].paidPlans;

    // Trial Users (free plan users)
    const trialUsersResult = await pool.request().query(`
      SELECT COUNT(*) as trialUsers 
      FROM Subscriptions s
      INNER JOIN Plans p ON s.planId = p.id
      WHERE s.status = 'active' AND p.priceMonthly = 0
    `);
    const trialUsers = trialUsersResult.recordset[0].trialUsers;

    // Monthly Revenue (current month)
    const revenueResult = await pool.request().query(`
      SELECT ISNULL(SUM(amount), 0) as monthlyRevenue 
      FROM Subscriptions
      WHERE paymentStatus = 'completed' 
      AND MONTH(paidAt) = MONTH(GETDATE())
      AND YEAR(paidAt) = YEAR(GETDATE())
    `);
    const monthlyRevenue = revenueResult.recordset[0].monthlyRevenue;

    // Suspended Accounts
    const suspendedResult = await pool.request().query(`
      SELECT COUNT(*) as suspendedAccounts 
      FROM Users 
      WHERE isSuspended = 1
    `);
    const suspendedAccounts = suspendedResult.recordset[0].suspendedAccounts;

    // Additional stats for charts
    // Users growth over last 6 months
    const usersGrowthResult = await pool.request().query(`
      SELECT 
        FORMAT(createdAt, 'yyyy-MM') as month,
        COUNT(*) as count
      FROM Users
      WHERE createdAt >= DATEADD(month, -6, GETDATE())
      GROUP BY FORMAT(createdAt, 'yyyy-MM')
      ORDER BY month
    `);

    // Revenue over last 6 months
    const revenueGrowthResult = await pool.request().query(`
      SELECT 
        FORMAT(paidAt, 'yyyy-MM') as month,
        SUM(amount) as revenue
      FROM Subscriptions
      WHERE paidAt >= DATEADD(month, -6, GETDATE())
      AND paymentStatus = 'completed'
      GROUP BY FORMAT(paidAt, 'yyyy-MM')
      ORDER BY month
    `);

    // Plans distribution
    const plansDistributionResult = await pool.request().query(`
      SELECT 
        p.name,
        COUNT(*) as count
      FROM Subscriptions s
      INNER JOIN Plans p ON s.planId = p.id
      WHERE s.status = 'active'
      GROUP BY p.name
    `);

    res.json({
      stats: {
        totalUsers,
        activeAccounts,
        paidPlans,
        trialUsers,
        monthlyRevenue,
        suspendedAccounts,
      },
      charts: {
        usersGrowth: usersGrowthResult.recordset,
        revenueGrowth: revenueGrowthResult.recordset,
        plansDistribution: plansDistributionResult.recordset,
      },
    });
  } catch (error) {
    logger.error("Get admin stats error:", error);
    res.status(500).json({ error: "Failed to get admin statistics" });
  }
}

// Get All Users with filters and pagination
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all", // all, active, suspended
      plan = "all", // all, free, monthly, yearly
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pool = await getPool();
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = ["u.role = 'user'"];
    const inputs: any = {
      limit: Number(limit),
      offset: offset,
    };

    if (search) {
      whereConditions.push(
        "(u.name LIKE '%' + @search + '%' OR u.email LIKE '%' + @search + '%')"
      );
      inputs.search = String(search);
    }

    if (status === "suspended") {
      whereConditions.push("u.isSuspended = 1");
    } else if (status === "active") {
      whereConditions.push("u.isSuspended = 0");
    }

    let joinPlanFilter = "";
    if (plan !== "all") {
      joinPlanFilter = `AND p.name = @planName`;
      inputs.planName = plan;
    }

    const whereClause = whereConditions.join(" AND ");

    const query = `
      SELECT 
        u.id, u.name, u.email, u.phoneNumber, u.country, 
        u.profileImage, u.createdAt, u.lastLoginAt,
        u.isSuspended, u.suspendedAt, u.suspendedReason,
        p.name as planName, s.status as subscriptionStatus,
        s.startDate, s.endDate, s.billingCycle,
        (SELECT COUNT(*) FROM Menus WHERE userId = u.id) as menusCount
      FROM Users u
      LEFT JOIN Subscriptions s ON u.id = s.userId AND s.status = 'active'
      LEFT JOIN Plans p ON s.planId = p.id ${joinPlanFilter}
      WHERE ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Users u
      LEFT JOIN Subscriptions s ON u.id = s.userId AND s.status = 'active'
      LEFT JOIN Plans p ON s.planId = p.id ${joinPlanFilter}
      WHERE ${whereClause}
    `;

    const request = pool.request();
    Object.keys(inputs).forEach((key) => {
      request.input(key, inputs[key]);
    });

    const [usersResult, countResult] = await Promise.all([
      request.query(query),
      request.query(countQuery),
    ]);

    res.json({
      users: usersResult.recordset,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(countResult.recordset[0].total / Number(limit)),
        totalItems: countResult.recordset[0].total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    logger.error("Get all users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
}

// Get Single User Details
export async function getUserDetails(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const userResult = await pool.request().input("userId", sql.Int, id).query(`
        SELECT 
          u.id, u.name, u.email, u.phoneNumber, u.country, u.dateOfBirth,
          u.gender, u.address, u.profileImage, u.createdAt, u.lastLoginAt,
          u.isSuspended, u.suspendedAt, u.suspendedReason,
          p.name as planName, s.status as subscriptionStatus,
          s.startDate, s.endDate, s.billingCycle, s.amount
        FROM Users u
        LEFT JOIN Subscriptions s ON u.id = s.userId AND s.status = 'active'
        LEFT JOIN Plans p ON s.planId = p.id
        WHERE u.id = @userId AND u.role = 'user'
      `);

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get user's menus
    const menusResult = await pool.request().input("userId", sql.Int, id)
      .query(`
        SELECT 
          m.id, m.slug, m.isActive, m.createdAt,
          mt.name, mt.description,
          (SELECT COUNT(*) FROM MenuItems WHERE menuId = m.id) as itemsCount
        FROM Menus m
        LEFT JOIN MenuTranslations mt ON m.id = mt.menuId AND mt.locale = 'ar'
        WHERE m.userId = @userId
      `);

    // Get user's subscription history
    const subscriptionsResult = await pool.request().input("userId", sql.Int, id)
      .query(`
        SELECT 
          s.id, s.billingCycle, s.startDate, s.endDate, s.status,
          s.amount, s.paymentStatus, s.paidAt,
          p.name as planName
        FROM Subscriptions s
        INNER JOIN Plans p ON s.planId = p.id
        WHERE s.userId = @userId
        ORDER BY s.createdAt DESC
      `);

    res.json({
      user: userResult.recordset[0],
      menus: menusResult.recordset,
      subscriptions: subscriptionsResult.recordset,
    });
  } catch (error) {
    logger.error("Get user details error:", error);
    res.status(500).json({ error: "Failed to get user details" });
  }
}

// Suspend/Unsuspend User
export async function toggleUserSuspension(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const pool = await getPool();

    // Get current suspension status
    const userResult = await pool.request().input("userId", sql.Int, id).query(`
        SELECT isSuspended FROM Users WHERE id = @userId AND role = 'user'
      `);

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isSuspended = userResult.recordset[0].isSuspended;
    const newStatus = !isSuspended;

    // Update suspension status
    await pool
      .request()
      .input("userId", sql.Int, id)
      .input("isSuspended", sql.Bit, newStatus)
      .input("suspendedAt", sql.DateTime2, newStatus ? new Date() : null)
      .input("suspendedReason", sql.NVarChar, newStatus ? reason : null).query(`
        UPDATE Users
        SET isSuspended = @isSuspended,
            suspendedAt = @suspendedAt,
            suspendedReason = @suspendedReason
        WHERE id = @userId
      `);

    res.json({
      message: newStatus ? "User suspended successfully" : "User unsuspended successfully",
      isSuspended: newStatus,
    });
  } catch (error) {
    logger.error("Toggle user suspension error:", error);
    res.status(500).json({ error: "Failed to update user suspension status" });
  }
}

// Delete User
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // Check if user exists and is not an admin
    const userResult = await pool.request().input("userId", sql.Int, id).query(`
        SELECT id, role FROM Users WHERE id = @userId
      `);

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (userResult.recordset[0].role === "admin") {
      res.status(403).json({ error: "Cannot delete admin users" });
      return;
    }

    // Delete user (cascade will handle related records)
    await pool.request().input("userId", sql.Int, id).query(`
        DELETE FROM Users WHERE id = @userId
      `);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}

// ========== PLANS MANAGEMENT ==========

// Get All Plans
export async function getAllPlans(req: Request, res: Response): Promise<void> {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM Subscriptions WHERE planId = p.id AND status = 'active') as activeSubscriptions
      FROM Plans p
      ORDER BY p.priceMonthly ASC
    `);

    res.json({ plans: result.recordset });
  } catch (error) {
    logger.error("Get all plans error:", error);
    res.status(500).json({ error: "Failed to get plans" });
  }
}

// Update Plan
export async function updatePlan(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      maxMenus,
      maxProductsPerMenu,
      allowCustomDomain,
      hasAds,
      features,
      isActive,
    } = req.body;

    const pool = await getPool();

    // Check if plan exists
    const planResult = await pool.request().input("planId", sql.Int, id).query(`
        SELECT id FROM Plans WHERE id = @planId
      `);

    if (planResult.recordset.length === 0) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const inputs: any = { planId: id };

    if (name !== undefined) {
      updates.push("name = @name");
      inputs.name = name;
    }
    if (description !== undefined) {
      updates.push("description = @description");
      inputs.description = description;
    }
    if (priceMonthly !== undefined) {
      updates.push("priceMonthly = @priceMonthly");
      inputs.priceMonthly = priceMonthly;
    }
    if (priceYearly !== undefined) {
      updates.push("priceYearly = @priceYearly");
      inputs.priceYearly = priceYearly;
    }
    if (maxMenus !== undefined) {
      updates.push("maxMenus = @maxMenus");
      inputs.maxMenus = maxMenus;
    }
    if (maxProductsPerMenu !== undefined) {
      updates.push("maxProductsPerMenu = @maxProductsPerMenu");
      inputs.maxProductsPerMenu = maxProductsPerMenu;
    }
    if (allowCustomDomain !== undefined) {
      updates.push("allowCustomDomain = @allowCustomDomain");
      inputs.allowCustomDomain = allowCustomDomain;
    }
    if (hasAds !== undefined) {
      updates.push("hasAds = @hasAds");
      inputs.hasAds = hasAds;
    }
    if (features !== undefined) {
      updates.push("features = @features");
      inputs.features = JSON.stringify(features);
    }
    if (isActive !== undefined) {
      updates.push("isActive = @isActive");
      inputs.isActive = isActive;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const query = `
      UPDATE Plans
      SET ${updates.join(", ")}
      WHERE id = @planId
    `;

    const request = pool.request();
    Object.keys(inputs).forEach((key) => {
      request.input(key, inputs[key]);
    });

    await request.query(query);

    res.json({ message: "Plan updated successfully" });
  } catch (error) {
    logger.error("Update plan error:", error);
    res.status(500).json({ error: "Failed to update plan" });
  }
}

// Create New Plan
export async function createPlan(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      maxMenus,
      maxProductsPerMenu,
      allowCustomDomain = false,
      hasAds = true,
      features = [],
      isActive = true,
    } = req.body;

    if (!name || priceMonthly === undefined || priceYearly === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("description", sql.NVarChar, description)
      .input("priceMonthly", sql.Decimal(10, 2), priceMonthly)
      .input("priceYearly", sql.Decimal(10, 2), priceYearly)
      .input("maxMenus", sql.Int, maxMenus)
      .input("maxProductsPerMenu", sql.Int, maxProductsPerMenu)
      .input("allowCustomDomain", sql.Bit, allowCustomDomain)
      .input("hasAds", sql.Bit, hasAds)
      .input("features", sql.NVarChar, JSON.stringify(features))
      .input("isActive", sql.Bit, isActive).query(`
        INSERT INTO Plans (
          name, description, priceMonthly, priceYearly, maxMenus, 
          maxProductsPerMenu, allowCustomDomain, hasAds, features, isActive
        )
        OUTPUT INSERTED.id
        VALUES (
          @name, @description, @priceMonthly, @priceYearly, @maxMenus,
          @maxProductsPerMenu, @allowCustomDomain, @hasAds, @features, @isActive
        )
      `);

    res.status(201).json({
      message: "Plan created successfully",
      planId: result.recordset[0].id,
    });
  } catch (error) {
    logger.error("Create plan error:", error);
    res.status(500).json({ error: "Failed to create plan" });
  }
}

// ========== ADS MANAGEMENT ==========

// Get All Global Ads
export async function getGlobalAds(req: Request, res: Response): Promise<void> {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        id, title, titleAr, content, contentAr, imageUrl, linkUrl,
        isActive, displayOrder, position, startDate, endDate,
        clickCount, impressionCount, createdAt
      FROM Ads
      WHERE adType = 'global'
      ORDER BY displayOrder ASC, createdAt DESC
    `);

    res.json({ ads: result.recordset });
  } catch (error) {
    logger.error("Get global ads error:", error);
    res.status(500).json({ error: "Failed to get ads" });
  }
}

// Create Global Ad
export async function createGlobalAd(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { 
      title, 
      titleAr, 
      content, 
      contentAr, 
      imageUrl, 
      linkUrl, 
      position = 'banner',
      isActive = true, 
      displayOrder = 0,
      startDate,
      endDate
    } = req.body;

    if (!title && !titleAr) {
      res.status(400).json({ error: "Title (English or Arabic) is required" });
      return;
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("title", sql.NVarChar, title || '')
      .input("titleAr", sql.NVarChar, titleAr || '')
      .input("content", sql.NVarChar, content || '')
      .input("contentAr", sql.NVarChar, contentAr || '')
      .input("imageUrl", sql.NVarChar, imageUrl || '')
      .input("linkUrl", sql.NVarChar, linkUrl || null)
      .input("position", sql.NVarChar, position)
      .input("isActive", sql.Bit, isActive)
      .input("displayOrder", sql.Int, displayOrder)
      .input("startDate", sql.DateTime2, startDate || null)
      .input("endDate", sql.DateTime2, endDate || null)
      .input("adType", sql.NVarChar, "global").query(`
        INSERT INTO Ads (
          title, titleAr, content, contentAr, imageUrl, linkUrl, 
          position, isActive, displayOrder, startDate, endDate, 
          adType, menuId, clickCount, impressionCount
        )
        OUTPUT INSERTED.id
        VALUES (
          @title, @titleAr, @content, @contentAr, @imageUrl, @linkUrl,
          @position, @isActive, @displayOrder, @startDate, @endDate,
          @adType, NULL, 0, 0
        )
      `);

    res.status(201).json({
      message: "Ad created successfully",
      adId: result.recordset[0].id,
    });
  } catch (error) {
    logger.error("Create global ad error:", error);
    res.status(500).json({ error: "Failed to create ad" });
  }
}

// Update Global Ad
export async function updateGlobalAd(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { 
      title, 
      titleAr, 
      content, 
      contentAr, 
      imageUrl, 
      linkUrl, 
      position, 
      isActive, 
      displayOrder,
      startDate,
      endDate
    } = req.body;

    const pool = await getPool();

    // Check if ad exists and is global
    const adResult = await pool.request().input("adId", sql.Int, id).query(`
        SELECT id FROM Ads WHERE id = @adId AND adType = 'global'
      `);

    if (adResult.recordset.length === 0) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }

    // Build update query
    const updates: string[] = [];
    const inputs: any = { adId: id };

    if (title !== undefined) {
      updates.push("title = @title");
      inputs.title = title;
    }
    if (titleAr !== undefined) {
      updates.push("titleAr = @titleAr");
      inputs.titleAr = titleAr;
    }
    if (content !== undefined) {
      updates.push("content = @content");
      inputs.content = content;
    }
    if (contentAr !== undefined) {
      updates.push("contentAr = @contentAr");
      inputs.contentAr = contentAr;
    }
    if (imageUrl !== undefined) {
      updates.push("imageUrl = @imageUrl");
      inputs.imageUrl = imageUrl;
    }
    if (linkUrl !== undefined) {
      updates.push("linkUrl = @linkUrl");
      inputs.linkUrl = linkUrl;
    }
    if (position !== undefined) {
      updates.push("position = @position");
      inputs.position = position;
    }
    if (isActive !== undefined) {
      updates.push("isActive = @isActive");
      inputs.isActive = isActive;
    }
    if (displayOrder !== undefined) {
      updates.push("displayOrder = @displayOrder");
      inputs.displayOrder = displayOrder;
    }
    if (startDate !== undefined) {
      updates.push("startDate = @startDate");
      inputs.startDate = startDate;
    }
    if (endDate !== undefined) {
      updates.push("endDate = @endDate");
      inputs.endDate = endDate;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const query = `UPDATE Ads SET ${updates.join(", ")} WHERE id = @adId`;

    const request = pool.request();
    Object.keys(inputs).forEach((key) => {
      request.input(key, inputs[key]);
    });

    await request.query(query);

    res.json({ message: "Ad updated successfully" });
  } catch (error) {
    logger.error("Update global ad error:", error);
    res.status(500).json({ error: "Failed to update ad" });
  }
}

// Delete Global Ad
export async function deleteGlobalAd(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request().input("adId", sql.Int, id).query(`
        DELETE FROM Ads WHERE id = @adId AND adType = 'global'
      `);

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }

    res.json({ message: "Ad deleted successfully" });
  } catch (error) {
    logger.error("Delete global ad error:", error);
    res.status(500).json({ error: "Failed to delete ad" });
  }
}

// ========== ADMIN MANAGEMENT ==========

// Create New Admin
export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    const pool = await getPool();

    // Check if email already exists
    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email).query(`
        SELECT id FROM Users WHERE email = @email
      `);

    if (existingUser.recordset.length > 0) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("name", sql.NVarChar, name)
      .input("role", sql.NVarChar, "admin").query(`
        INSERT INTO Users (email, password, name, role, isEmailVerified)
        OUTPUT INSERTED.id
        VALUES (@email, @password, @name, @role, 1)
      `);

    res.status(201).json({
      message: "Admin created successfully",
      adminId: result.recordset[0].id,
    });
  } catch (error) {
    logger.error("Create admin error:", error);
    res.status(500).json({ error: "Failed to create admin" });
  }
}

// Get All Admins
export async function getAllAdmins(req: Request, res: Response): Promise<void> {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        id, name, email, createdAt, lastLoginAt, profileImage
      FROM Users
      WHERE role = 'admin'
      ORDER BY createdAt DESC
    `);

    res.json({ admins: result.recordset });
  } catch (error) {
    logger.error("Get all admins error:", error);
    res.status(500).json({ error: "Failed to get admins" });
  }
}

// Get Ad Analytics
export async function getAdAnalytics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request().input("adId", sql.Int, id).query(`
      SELECT 
        id, title, clickCount, impressionCount,
        CASE 
          WHEN impressionCount > 0 THEN CAST(clickCount AS FLOAT) / impressionCount * 100
          ELSE 0
        END as ctr,
        createdAt
      FROM Ads
      WHERE id = @adId AND adType = 'global'
    `);

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }

    res.json({ analytics: result.recordset[0] });
  } catch (error) {
    logger.error("Get ad analytics error:", error);
    res.status(500).json({ error: "Failed to get ad analytics" });
  }
}
