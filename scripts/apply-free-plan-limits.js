// Script to apply free plan limits to all expired subscriptions
require('dotenv').config();

const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'SasMenuDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  port: parseInt(process.env.DB_PORT || '1433'),
};

async function applyFreePlanLimits() {
  let pool;
  
  try {
    console.log('🔄 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Get free plan details
    const freePlanResult = await pool.request().query(`
      SELECT id, name, maxMenus, maxProductsPerMenu
      FROM Plans
      WHERE priceMonthly = 0
    `);

    if (freePlanResult.recordset.length === 0) {
      console.error('❌ Free plan not found in database');
      process.exit(1);
    }

    const freePlan = freePlanResult.recordset[0];
    console.log(`\n📋 Free Plan Limits:`);
    console.log(`   Max Menus: ${freePlan.maxMenus}`);
    console.log(`   Max Products per Menu: ${freePlan.maxProductsPerMenu}`);

    // Find users with expired subscriptions (no active paid subscription)
    const usersResult = await pool.request().query(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM Users u
      WHERE u.role = 'user'
        AND u.id NOT IN (
          SELECT userId 
          FROM Subscriptions s
          JOIN Plans p ON s.planId = p.id
          WHERE s.status = 'active'
            AND (s.endDate IS NULL OR s.endDate > GETDATE())
            AND p.priceMonthly > 0
        )
        -- Only users who had a paid subscription before
        AND u.id IN (
          SELECT userId
          FROM Subscriptions s
          JOIN Plans p ON s.planId = p.id
          WHERE p.priceMonthly > 0
            AND s.status = 'expired'
        )
    `);

    const users = usersResult.recordset;
    console.log(`\n👥 Found ${users.length} user(s) to apply free plan limits\n`);

    if (users.length === 0) {
      console.log('✅ No users need free plan limits applied');
      await pool.close();
      process.exit(0);
    }

    let totalMenusDeactivated = 0;
    let totalProductsDeleted = 0;
    let totalAdsDeleted = 0;
    let totalBranchesDeleted = 0;

    for (const user of users) {
      console.log(`\n📝 Processing user: ${user.name} (${user.email})`);

      // Get user's menus
      const menusResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          SELECT id, isActive, createdAt
          FROM Menus
          WHERE userId = @userId
          ORDER BY createdAt ASC
        `);

      const userMenus = menusResult.recordset;
      console.log(`   Current menus: ${userMenus.length} (limit: ${freePlan.maxMenus})`);

      // Deactivate excess menus
      if (userMenus.length > freePlan.maxMenus) {
        const menusToDeactivate = userMenus.slice(freePlan.maxMenus);
        
        for (const menu of menusToDeactivate) {
          await pool.request()
            .input('menuId', sql.Int, menu.id)
            .query(`UPDATE Menus SET isActive = 0 WHERE id = @menuId`);
          
          totalMenusDeactivated++;
        }
        console.log(`   ⚠️  Deactivated ${menusToDeactivate.length} excess menu(s)`);
      }

      // Limit products per menu
      let userProductsDeleted = 0;
      for (const menu of userMenus) {
        const productsResult = await pool.request()
          .input('menuId', sql.Int, menu.id)
          .query(`
            SELECT id, createdAt
            FROM MenuItems
            WHERE menuId = @menuId
            ORDER BY createdAt ASC
          `);

        const products = productsResult.recordset;

        if (products.length > freePlan.maxProductsPerMenu && freePlan.maxProductsPerMenu !== -1) {
          const productsToDelete = products.slice(freePlan.maxProductsPerMenu);

          for (const product of productsToDelete) {
            await pool.request()
              .input('productId', sql.Int, product.id)
              .query(`DELETE FROM MenuItems WHERE id = @productId`);
            
            userProductsDeleted++;
            totalProductsDeleted++;
          }
        }
      }

      if (userProductsDeleted > 0) {
        console.log(`   ⚠️  Deleted ${userProductsDeleted} excess product(s)`);
      }

      // Delete ads
      const adsResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          DELETE FROM Ads
          OUTPUT DELETED.id
          WHERE menuId IN (
            SELECT id FROM Menus WHERE userId = @userId
          )
        `);

      if (adsResult.recordset.length > 0) {
        console.log(`   ⚠️  Deleted ${adsResult.recordset.length} ad(s) (free plan doesn't support ads)`);
        totalAdsDeleted += adsResult.recordset.length;
      }

      // Delete branches
      const branchesResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          DELETE FROM Branches
          OUTPUT DELETED.id
          WHERE menuId IN (
            SELECT id FROM Menus WHERE userId = @userId
          )
        `);

      if (branchesResult.recordset.length > 0) {
        console.log(`   ⚠️  Deleted ${branchesResult.recordset.length} branch(es) (free plan doesn't support branches)`);
        totalBranchesDeleted += branchesResult.recordset.length;
      }

      console.log(`   ✅ User ${user.name} processed successfully`);
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Users processed: ${users.length}`);
    console.log(`   Menus deactivated: ${totalMenusDeactivated}`);
    console.log(`   Products deleted: ${totalProductsDeleted}`);
    console.log(`   Ads deleted: ${totalAdsDeleted}`);
    console.log(`   Branches deleted: ${totalBranchesDeleted}`);
    console.log(`\n✅ Free plan limits applied successfully!`);

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (pool) {
      await pool.close();
    }
    process.exit(1);
  }
}

// Run the script
applyFreePlanLimits();

