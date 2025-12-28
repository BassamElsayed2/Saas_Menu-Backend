-- إضافة custom domain للقوائم
ALTER TABLE Menus
ADD customDomain NVARCHAR(255) NULL;

-- إضافة index للبحث السريع
CREATE INDEX idx_menus_customDomain ON Menus(customDomain);

-- مثال على التحديث:
-- UPDATE Menus SET customDomain = 'test.ensmenu.com' WHERE slug = 'test';

