# دليل إضافة ميزة العملة | Currency Feature Migration Guide

## نظرة عامة | Overview

تم إضافة ميزة اختيار العملة للقوائم. يجب تشغيل migration لإضافة حقل `currency` إلى جدول `Menus`.

A currency selection feature has been added to menus. You need to run a migration to add the `currency` field to the `Menus` table.

---

## خطوات التنفيذ | Implementation Steps

### 1. تشغيل Migration | Run Migration

#### استخدام SQL Server Management Studio (SSMS):

1. افتح SSMS واتصل بقاعدة البيانات
   Open SSMS and connect to your database

2. افتح الملف:
   Open the file:
   ```
   back-end/database/migrations/014_add_currency_to_menus.sql
   ```

3. شغّل الـ script بالضغط على F5
   Execute the script by pressing F5

4. تأكد من ظهور الرسالة:
   Confirm the message appears:
   ```
   Currency column added to Menus table successfully
   Migration completed: Currency field added to Menus table
   ```

#### استخدام Command Line:

```bash
sqlcmd -S SERVER_NAME -d DATABASE_NAME -i back-end/database/migrations/014_add_currency_to_menus.sql
```

---

### 2. إعادة تشغيل Backend | Restart Backend

بعد تشغيل الـ migration، أعد تشغيل الـ backend:

After running the migration, restart the backend:

```bash
cd back-end
npm run dev
# أو | or
npm start
```

---

### 3. اختبار الميزة | Test the Feature

1. افتح الـ Frontend
   Open the Frontend

2. اذهب إلى: `Dashboard → My Menus → [اختر قائمة] → Settings`
   Go to: `Dashboard → My Menus → [Select Menu] → Settings`

3. في قسم "إعدادات العملة"، اختر عملة جديدة
   In "Currency Settings" section, select a new currency

4. احفظ التغييرات
   Save changes

5. تأكد من حفظ العملة بنجاح وعدم الرجوع للقيمة السابقة
   Confirm currency is saved successfully and doesn't revert

---

## التحقق من نجاح Migration | Verify Migration Success

### في قاعدة البيانات | In Database:

```sql
-- تحقق من وجود الحقل
-- Check if column exists
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Menus' 
AND COLUMN_NAME = 'currency';

-- تحقق من القيم
-- Check values
SELECT id, slug, currency FROM Menus;
```

النتيجة المتوقعة | Expected Result:
```
COLUMN_NAME  DATA_TYPE   CHARACTER_MAXIMUM_LENGTH
currency     nvarchar    3
```

---

## التعديلات التي تمت | Changes Made

### Backend Files Modified:

1. **`back-end/src/routes/menu.routes.ts`**
   - Added validation for `currency` field
   ```typescript
   body('currency').optional().isString().isLength({ min: 3, max: 3 })
   ```

2. **`back-end/src/controllers/menu.controller.ts`**
   - Added `currency` extraction from request body
   - Added currency update logic in `updateMenu` function

3. **`back-end/database/migrations/014_add_currency_to_menus.sql`**
   - New migration file to add `currency` column

### Frontend Files (Already Updated):

1. **`front-app/src/constants/currencies.ts`**
   - Currency definitions and helper functions

2. **`front-app/src/components/CurrencySelector.tsx`**
   - Currency selector component

3. **`front-app/src/app/[locale]/dashboard/menus/[id]/settings/page.tsx`**
   - Added currency selection in general settings

4. **`front-app/src/app/[locale]/dashboard/menus/[id]/products/page.tsx`**
   - Display currency symbol with prices

---

## القيمة الافتراضية | Default Value

- القيمة الافتراضية للعملة: **SAR** (الريال السعودي)
- Default currency value: **SAR** (Saudi Riyal)
- جميع القوائم الموجودة ستحصل على SAR كعملة افتراضية
- All existing menus will get SAR as default currency

---

## استكشاف الأخطاء | Troubleshooting

### المشكلة: "العملة لا تزال ترجع للقيمة الافتراضية"
**Problem: "Currency still reverts to default value"**

**الحل | Solution:**
1. تأكد من تشغيل الـ migration بنجاح
   Ensure migration ran successfully
2. أعد تشغيل الـ backend
   Restart backend
3. تحقق من وجود أخطاء في console
   Check for errors in console
4. افحص قاعدة البيانات:
   Check database:
   ```sql
   SELECT TOP 10 * FROM Menus;
   ```

### المشكلة: "Column 'currency' is invalid"
**Problem: "Column 'currency' is invalid"**

**الحل | Solution:**
- لم يتم تشغيل الـ migration. شغله من SSMS
- Migration wasn't run. Execute it from SSMS

---

## الدعم | Support

إذا واجهت أي مشاكل:
If you encounter any issues:

1. تأكد من تشغيل الـ migration
   Ensure migration is executed
2. تحقق من logs الـ backend
   Check backend logs
3. افحص console في المتصفح
   Check browser console

---

## ملاحظات هامة | Important Notes

⚠️ **قبل التشغيل في Production:**
⚠️ **Before running in Production:**

1. خذ backup من قاعدة البيانات
   Take a database backup
2. اختبر على staging environment أولاً
   Test on staging environment first
3. تأكد من عمل الـ rollback plan
   Ensure rollback plan works

---

## تاريخ الإصدار | Release Date

- **Version:** 1.1.0
- **Date:** January 4, 2025
- **Feature:** Multi-Currency Support


