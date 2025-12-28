# Migration: تغيير Menu ID من INT إلى NVARCHAR

## ⚠️ تحذير مهم
هذا Migration يغير نوع عمود `id` في جدول `Menus` من `INT IDENTITY` إلى `NVARCHAR(20)`. هذا تغيير كبير (Breaking Change) يتطلب:

1. **نسخ احتياطي كامل لقاعدة البيانات** قبل التنفيذ
2. تحديث جميع الجداول المرتبطة (MenuTranslations, MenuItems, Branches, Categories)
3. تحديث جميع الـ Foreign Keys
4. إعادة تشغيل Backend بعد التنفيذ

## الخطوات

### 1. نسخ احتياطي
```sql
-- في SQL Server Management Studio
BACKUP DATABASE [YourDatabaseName] 
TO DISK = 'C:\Backup\YourDatabaseName_BeforeMenuIdMigration.bak'
WITH FORMAT, COMPRESSION;
```

### 2. تنفيذ Migration
```sql
-- في SQL Server Management Studio
-- تنفيذ الملف التالي:
D:\wepDev\work\saas-menu\back-end\database\migrations\change_menu_id_to_string.sql
```

### 3. التحقق من النتائج
```sql
-- التحقق من نوع العمود
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Menus' AND COLUMN_NAME = 'id';

-- يجب أن يكون الناتج:
-- COLUMN_NAME: id
-- DATA_TYPE: nvarchar
-- CHARACTER_MAXIMUM_LENGTH: 20

-- التحقق من بعض الـ IDs
SELECT TOP 10 id, slug FROM Menus;
-- يجب أن تكون الـ IDs عبارة عن أرقام وحروف (مثل: abc1234)
```

### 4. إعادة تشغيل Backend
```bash
cd back-end
npm run dev
```

## ما الذي يفعله Migration؟

1. **ينشئ دالة SQL** لتوليد ID عشوائي (7+ أحرف)
2. **يضيف عمود مؤقت** `id_new` في جدول `Menus`
3. **يولد IDs جديدة** لجميع السجلات الموجودة
4. **يحدث جميع الجداول المرتبطة** (MenuTranslations, MenuItems, Branches, Categories)
5. **يحذف الـ Foreign Keys القديمة** ويضيف جديدة
6. **يحذف العمود القديم** `id` ويستبدله بـ `id_new`
7. **يضيف Primary Key constraint** جديد

## ملاحظات

- الـ IDs الجديدة ستكون **7 أحرف على الأقل** (أرقام وحروف عشوائية)
- جميع الـ IDs القديمة (INT) سيتم استبدالها بـ IDs جديدة (NVARCHAR)
- الـ IDs الجديدة ستكون فريدة ومولدة عشوائياً
- الكود يدعم كلا النوعين (INT و NVARCHAR) حتى بعد Migration

## Rollback

إذا أردت التراجع عن التغييرات، يجب:
1. استعادة النسخة الاحتياطية
2. أو تنفيذ rollback script (غير متوفر حالياً - يجب إنشاؤه يدوياً)

## بعد Migration

بعد تنفيذ Migration بنجاح:
- جميع الـ Menu IDs الجديدة ستكون NVARCHAR(20)
- الـ IDs ستكون 7+ أحرف عشوائية
- الكود سيتعامل تلقائياً مع النوع الجديد

