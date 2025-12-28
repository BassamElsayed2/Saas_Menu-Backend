-- Rollback script: Run this FIRST if migration failed
-- يُنفذ هذا أولاً لحذف أي تغييرات جزئية

-- Remove foreign key constraint if exists
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MenuItems_Categories')
    ALTER TABLE MenuItems DROP CONSTRAINT FK_MenuItems_Categories;

-- Remove CHECK constraint on discountPercent if exists
DECLARE @CheckConstraintName NVARCHAR(200)
SELECT @CheckConstraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('MenuItems') 
  AND COL_NAME(parent_object_id, parent_column_id) = 'discountPercent'

IF @CheckConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE MenuItems DROP CONSTRAINT ' + @CheckConstraintName)
    PRINT 'Dropped CHECK constraint: ' + @CheckConstraintName
END

-- Remove columns if they exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MenuItems') AND name = 'categoryId')
    ALTER TABLE MenuItems DROP COLUMN categoryId;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MenuItems') AND name = 'originalPrice')
    ALTER TABLE MenuItems DROP COLUMN originalPrice;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MenuItems') AND name = 'discountPercent')
    ALTER TABLE MenuItems DROP COLUMN discountPercent;

-- Drop index if exists
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_menu_items_categoryId')
    DROP INDEX idx_menu_items_categoryId ON MenuItems;

-- Drop trigger if exists
IF OBJECT_ID('trg_categories_updatedat', 'TR') IS NOT NULL
    DROP TRIGGER trg_categories_updatedat;

-- Drop tables
IF OBJECT_ID('CategoryTranslations', 'U') IS NOT NULL 
    DROP TABLE CategoryTranslations;

IF OBJECT_ID('Categories', 'U') IS NOT NULL 
    DROP TABLE Categories;

PRINT 'Rollback completed successfully!';

