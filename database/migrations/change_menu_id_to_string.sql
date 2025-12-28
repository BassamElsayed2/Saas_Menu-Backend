-- Migration: Change Menu ID from INT to NVARCHAR with random alphanumeric ID
-- Date: 2025-12-25
-- WARNING: This is a breaking change. Backup your database before running this migration!

-- Check if Menus table exists
IF OBJECT_ID('Menus', 'U') IS NULL
BEGIN
    RAISERROR('ERROR: Menus table does not exist. Please run schema.sql first!', 16, 1);
    SET NOEXEC ON;
END

SET NOEXEC OFF;

-- Step 1: Add temporary column for new ID
-- First, check if column exists and drop it if it does (to start fresh)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Menus' AND COLUMN_NAME = 'id_new')
BEGIN
    ALTER TABLE Menus
    DROP COLUMN id_new;
    PRINT 'Dropped existing id_new column';
END

-- Now add the column
ALTER TABLE Menus
ADD id_new NVARCHAR(20) NULL;

PRINT 'Added id_new column';

-- Step 2: Verify id_new column exists before proceeding
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Menus' AND COLUMN_NAME = 'id_new')
BEGIN
    RAISERROR('ERROR: id_new column does not exist. Migration cannot continue.', 16, 1);
    RETURN;
END

-- Step 3: Generate new IDs for existing records
-- Use NEWID() and CHECKSUM() for randomness since RAND() cannot be used in functions
DECLARE @MenuCursor CURSOR;
DECLARE @OldId INT;
DECLARE @NewId NVARCHAR(20);
DECLARE @Counter INT = 0;
DECLARE @chars NVARCHAR(36) = 'abcdefghijklmnopqrstuvwxyz0123456789';
DECLARE @charIndex INT;
DECLARE @i INT;
DECLARE @length INT = 7;

SET @MenuCursor = CURSOR FOR
SELECT id FROM Menus ORDER BY id;

OPEN @MenuCursor;
FETCH NEXT FROM @MenuCursor INTO @OldId;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Generate unique ID (7+ characters)
    SET @NewId = '';
    SET @i = 0;
    
    WHILE @i < @length
    BEGIN
        -- Use CHECKSUM with NEWID() for randomness
        SET @charIndex = ABS(CHECKSUM(NEWID())) % 36 + 1;
        SET @NewId = @NewId + SUBSTRING(@chars, @charIndex, 1);
        SET @i = @i + 1;
    END
    
    -- Check if ID already exists and regenerate if needed
    WHILE EXISTS (SELECT 1 FROM Menus WHERE id_new = @NewId)
    BEGIN
        SET @NewId = '';
        SET @i = 0;
        WHILE @i < @length
        BEGIN
            SET @charIndex = ABS(CHECKSUM(NEWID())) % 36 + 1;
            SET @NewId = @NewId + SUBSTRING(@chars, @charIndex, 1);
            SET @i = @i + 1;
        END
    END
    
    -- Update the record
    UPDATE Menus
    SET id_new = @NewId
    WHERE id = @OldId;
    
    SET @Counter = @Counter + 1;
    FETCH NEXT FROM @MenuCursor INTO @OldId;
END

CLOSE @MenuCursor;
DEALLOCATE @MenuCursor;

PRINT 'Generated ' + CAST(@Counter AS NVARCHAR(10)) + ' new menu IDs';

-- Step 4: Verify all records have new IDs
DECLARE @NullCount INT;
SELECT @NullCount = COUNT(*) FROM Menus WHERE id_new IS NULL;
IF @NullCount > 0
BEGIN
    RAISERROR('ERROR: %d records still have NULL id_new. Migration failed.', 16, 1, @NullCount);
    RETURN;
END

PRINT 'All records have new IDs assigned';

-- Step 5: Update all foreign key tables
-- MenuTranslations
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuTranslations' AND COLUMN_NAME = 'menuId')
BEGIN
    -- Add temporary column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuTranslations' AND COLUMN_NAME = 'menuId_new')
    BEGIN
        ALTER TABLE MenuTranslations
        ADD menuId_new NVARCHAR(20) NULL;
    END
    
    -- Update with new IDs
    UPDATE mt
    SET mt.menuId_new = m.id_new
    FROM MenuTranslations mt
    INNER JOIN Menus m ON mt.menuId = m.id;
    
    PRINT 'Updated MenuTranslations';
END

-- MenuItems
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuItems' AND COLUMN_NAME = 'menuId')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuItems' AND COLUMN_NAME = 'menuId_new')
    BEGIN
        ALTER TABLE MenuItems
        ADD menuId_new NVARCHAR(20) NULL;
    END
    
    UPDATE mi
    SET mi.menuId_new = m.id_new
    FROM MenuItems mi
    INNER JOIN Menus m ON mi.menuId = m.id;
    
    PRINT 'Updated MenuItems';
END

-- Branches
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Branches' AND COLUMN_NAME = 'menuId')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Branches' AND COLUMN_NAME = 'menuId_new')
    BEGIN
        ALTER TABLE Branches
        ADD menuId_new NVARCHAR(20) NULL;
    END
    
    UPDATE b
    SET b.menuId_new = m.id_new
    FROM Branches b
    INNER JOIN Menus m ON b.menuId = m.id;
    
    PRINT 'Updated Branches';
END

-- Categories
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Categories' AND COLUMN_NAME = 'menuId')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Categories' AND COLUMN_NAME = 'menuId_new')
    BEGIN
        ALTER TABLE Categories
        ADD menuId_new NVARCHAR(20) NULL;
    END
    
    UPDATE c
    SET c.menuId_new = m.id_new
    FROM Categories c
    INNER JOIN Menus m ON c.menuId = m.id;
    
    PRINT 'Updated Categories';
END

-- Step 6: Drop foreign key constraints
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'MenuTranslations' AND CONSTRAINT_NAME LIKE 'FK%MenuTranslations%Menus%')
BEGIN
    DECLARE @FKName NVARCHAR(200);
    SELECT @FKName = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'MenuTranslations' AND CONSTRAINT_NAME LIKE 'FK%MenuTranslations%Menus%';
    
    EXEC('ALTER TABLE MenuTranslations DROP CONSTRAINT ' + @FKName);
    PRINT 'Dropped MenuTranslations foreign key';
END

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'MenuItems' AND CONSTRAINT_NAME LIKE 'FK%MenuItems%Menus%')
BEGIN
    SELECT @FKName = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'MenuItems' AND CONSTRAINT_NAME LIKE 'FK%MenuItems%Menus%';
    
    EXEC('ALTER TABLE MenuItems DROP CONSTRAINT ' + @FKName);
    PRINT 'Dropped MenuItems foreign key';
END

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'Branches' AND CONSTRAINT_NAME LIKE 'FK%Branches%Menus%')
BEGIN
    SELECT @FKName = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'Branches' AND CONSTRAINT_NAME LIKE 'FK%Branches%Menus%';
    
    EXEC('ALTER TABLE Branches DROP CONSTRAINT ' + @FKName);
    PRINT 'Dropped Branches foreign key';
END

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'Categories' AND CONSTRAINT_NAME LIKE 'FK%Categories%Menus%')
BEGIN
    SELECT @FKName = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'Categories' AND CONSTRAINT_NAME LIKE 'FK%Categories%Menus%';
    
    EXEC('ALTER TABLE Categories DROP CONSTRAINT ' + @FKName);
    PRINT 'Dropped Categories foreign key';
END

-- Step 7: Drop old ID column and rename new column
-- First, drop primary key constraint
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'Menus' AND CONSTRAINT_TYPE = 'PRIMARY KEY')
BEGIN
    DECLARE @PKName NVARCHAR(200);
    SELECT @PKName = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'Menus' AND CONSTRAINT_TYPE = 'PRIMARY KEY';
    
    EXEC('ALTER TABLE Menus DROP CONSTRAINT ' + @PKName);
    PRINT 'Dropped primary key constraint';
END

-- Drop old ID column
ALTER TABLE Menus
DROP COLUMN id;

-- Rename new column
EXEC sp_rename 'Menus.id_new', 'id', 'COLUMN';

-- Make it NOT NULL and PRIMARY KEY
ALTER TABLE Menus
ALTER COLUMN id NVARCHAR(20) NOT NULL;

ALTER TABLE Menus
ADD CONSTRAINT PK_Menus PRIMARY KEY (id);

PRINT 'Changed Menus.id to NVARCHAR(20)';

-- Step 8: Update foreign key columns in related tables
-- MenuTranslations
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuTranslations' AND COLUMN_NAME = 'menuId_new')
BEGIN
    ALTER TABLE MenuTranslations
    DROP COLUMN menuId;
    
    EXEC sp_rename 'MenuTranslations.menuId_new', 'menuId', 'COLUMN';
    
    ALTER TABLE MenuTranslations
    ALTER COLUMN menuId NVARCHAR(20) NOT NULL;
    
    ALTER TABLE MenuTranslations
    ADD CONSTRAINT FK_MenuTranslations_Menus 
        FOREIGN KEY (menuId) REFERENCES Menus(id) ON DELETE CASCADE;
    
    PRINT 'Updated MenuTranslations.menuId';
END

-- MenuItems
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MenuItems' AND COLUMN_NAME = 'menuId_new')
BEGIN
    ALTER TABLE MenuItems
    DROP COLUMN menuId;
    
    EXEC sp_rename 'MenuItems.menuId_new', 'menuId', 'COLUMN';
    
    ALTER TABLE MenuItems
    ALTER COLUMN menuId NVARCHAR(20) NOT NULL;
    
    ALTER TABLE MenuItems
    ADD CONSTRAINT FK_MenuItems_Menus 
        FOREIGN KEY (menuId) REFERENCES Menus(id) ON DELETE CASCADE;
    
    PRINT 'Updated MenuItems.menuId';
END

-- Branches
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Branches' AND COLUMN_NAME = 'menuId_new')
BEGIN
    ALTER TABLE Branches
    DROP COLUMN menuId;
    
    EXEC sp_rename 'Branches.menuId_new', 'menuId', 'COLUMN';
    
    ALTER TABLE Branches
    ALTER COLUMN menuId NVARCHAR(20) NOT NULL;
    
    ALTER TABLE Branches
    ADD CONSTRAINT FK_Branches_Menus 
        FOREIGN KEY (menuId) REFERENCES Menus(id) ON DELETE CASCADE;
    
    PRINT 'Updated Branches.menuId';
END

-- Categories
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Categories' AND COLUMN_NAME = 'menuId_new')
BEGIN
    ALTER TABLE Categories
    DROP COLUMN menuId;
    
    EXEC sp_rename 'Categories.menuId_new', 'menuId', 'COLUMN';
    
    ALTER TABLE Categories
    ALTER COLUMN menuId NVARCHAR(20) NOT NULL;
    
    ALTER TABLE Categories
    ADD CONSTRAINT FK_Categories_Menus 
        FOREIGN KEY (menuId) REFERENCES Menus(id) ON DELETE CASCADE;
    
    PRINT 'Updated Categories.menuId';
END

-- Step 9: Cleanup - No function to drop (we removed it earlier)

PRINT 'Menu ID migration completed successfully!';
PRINT 'WARNING: You must update your application code to use NVARCHAR(20) for menu IDs!';

