-- حذف الإعلانات للمستخدم رقم 8 (أو أي مستخدم آخر)
-- الإعلانات مرتبطة بالقوائم (menuId) وليس بالمستخدم مباشرة

-- عرض الإعلانات الحالية للمستخدم رقم 8
SELECT 
  a.id as AdId,
  a.title,
  a.menuId,
  m.userId,
  u.name as UserName,
  u.email,
  a.createdAt
FROM Ads a
INNER JOIN Menus m ON a.menuId = m.id
INNER JOIN Users u ON m.userId = u.id
WHERE u.id = 8;

-- حذف جميع الإعلانات المرتبطة بقوائم المستخدم رقم 8
DELETE FROM Ads
OUTPUT DELETED.id, DELETED.title, DELETED.menuId
WHERE menuId IN (
  SELECT id FROM Menus WHERE userId = 8
);

-- التحقق من أن الإعلانات تم حذفها
SELECT 
  COUNT(*) as RemainingAds
FROM Ads a
INNER JOIN Menus m ON a.menuId = m.id
WHERE m.userId = 8;

PRINT 'تم حذف جميع الإعلانات للمستخدم رقم 8';

