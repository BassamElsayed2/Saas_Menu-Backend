-- تطبيق قيود الخطة المجانية على المستخدم رقم 8
-- يمكن تعديل رقم المستخدم حسب الحاجة

DECLARE @userId INT = 8;
DECLARE @freePlanMaxMenus INT;
DECLARE @freePlanMaxProducts INT;

-- الحصول على حدود الخطة المجانية
SELECT 
  @freePlanMaxMenus = maxMenus,
  @freePlanMaxProducts = maxProductsPerMenu
FROM Plans
WHERE priceMonthly = 0;

PRINT '=== قيود الخطة المجانية ===';
PRINT 'عدد القوائم المسموح: ' + CAST(@freePlanMaxMenus AS NVARCHAR);
PRINT 'عدد المنتجات لكل قائمة: ' + CAST(@freePlanMaxProducts AS NVARCHAR);
PRINT '';

-- ========== 1. عرض الوضع الحالي ==========
PRINT '=== الوضع الحالي للمستخدم رقم ' + CAST(@userId AS NVARCHAR) + ' ===';

SELECT 
  (SELECT COUNT(*) FROM Menus WHERE userId = @userId AND isActive = 1) as ActiveMenus,
  (SELECT COUNT(*) FROM Menus WHERE userId = @userId) as TotalMenus,
  (SELECT COUNT(*) FROM MenuItems mi 
   INNER JOIN Menus m ON mi.menuId = m.id 
   WHERE m.userId = @userId) as TotalProducts,
  (SELECT COUNT(*) FROM Ads a 
   INNER JOIN Menus m ON a.menuId = m.id 
   WHERE m.userId = @userId) as TotalAds,
  (SELECT COUNT(*) FROM Branches b 
   INNER JOIN Menus m ON b.menuId = m.id 
   WHERE m.userId = @userId) as TotalBranches;

PRINT '';

-- ========== 2. تعطيل القوائم الزائدة ==========
PRINT '=== تعطيل القوائم الزائدة ===';

-- تعطيل القوائم الزائدة (نبقي على الأقدم)
UPDATE Menus
SET isActive = 0
OUTPUT DELETED.id, DELETED.slug
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt ASC) as RowNum
    FROM Menus
    WHERE userId = @userId
  ) AS NumberedMenus
  WHERE RowNum > @freePlanMaxMenus
);

PRINT '';

-- ========== 3. حذف المنتجات الزائدة ==========
PRINT '=== حذف المنتجات الزائدة ===';

-- حذف المنتجات الزائدة من كل قائمة
DECLARE @menuId INT;
DECLARE menu_cursor CURSOR FOR 
  SELECT id FROM Menus WHERE userId = @userId;

OPEN menu_cursor;
FETCH NEXT FROM menu_cursor INTO @menuId;

WHILE @@FETCH_STATUS = 0
BEGIN
  -- حذف المنتجات الزائدة (نبقي على الأقدم)
  DELETE FROM MenuItems
  OUTPUT DELETED.id, @menuId as MenuId
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt ASC) as RowNum
      FROM MenuItems
      WHERE menuId = @menuId
    ) AS NumberedItems
    WHERE RowNum > @freePlanMaxProducts
  );
  
  FETCH NEXT FROM menu_cursor INTO @menuId;
END;

CLOSE menu_cursor;
DEALLOCATE menu_cursor;

PRINT '';

-- ========== 4. حذف جميع الإعلانات ==========
PRINT '=== حذف جميع الإعلانات ===';

DELETE FROM Ads
OUTPUT DELETED.id, DELETED.title
WHERE menuId IN (
  SELECT id FROM Menus WHERE userId = @userId
);

PRINT '';

-- ========== 5. حذف جميع الفروع ==========
PRINT '=== حذف جميع الفروع ===';

DELETE FROM Branches
OUTPUT DELETED.id, DELETED.menuId
WHERE menuId IN (
  SELECT id FROM Menus WHERE userId = @userId
);

PRINT '';

-- ========== 6. عرض الوضع بعد التطبيق ==========
PRINT '=== الوضع بعد التطبيق ===';

SELECT 
  (SELECT COUNT(*) FROM Menus WHERE userId = @userId AND isActive = 1) as ActiveMenus,
  (SELECT COUNT(*) FROM Menus WHERE userId = @userId) as TotalMenus,
  (SELECT COUNT(*) FROM MenuItems mi 
   INNER JOIN Menus m ON mi.menuId = m.id 
   WHERE m.userId = @userId) as TotalProducts,
  (SELECT COUNT(*) FROM Ads a 
   INNER JOIN Menus m ON a.menuId = m.id 
   WHERE m.userId = @userId) as TotalAds,
  (SELECT COUNT(*) FROM Branches b 
   INNER JOIN Menus m ON b.menuId = m.id 
   WHERE m.userId = @userId) as TotalBranches;

PRINT '';
PRINT '✅ تم تطبيق قيود الخطة المجانية بنجاح!';

