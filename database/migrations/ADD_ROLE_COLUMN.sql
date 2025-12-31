-- Add role column to Users table if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') AND name = 'role'
)
BEGIN
    PRINT '✅ Adding role column to Users table...';
    ALTER TABLE Users ADD role NVARCHAR(50) NOT NULL DEFAULT 'user';
    CREATE INDEX idx_users_role ON Users(role);
    PRINT '✅ Role column added successfully!';
END
ELSE
BEGIN
    PRINT '✅ Role column already exists';
END
GO

-- Update the admin user to have admin role
UPDATE Users 
SET role = 'admin'
WHERE email = 'ens@admin.com';

PRINT '✅ Admin user updated!';
GO

-- Verify the update
SELECT id, email, name, role, createdAt 
FROM Users 
WHERE email = 'ens@admin.com';
GO

