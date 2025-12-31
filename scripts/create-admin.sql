-- Create Admin User: ens@admin.com
-- Password: 12301230Aa
-- Run this script in SQL Server Management Studio or Azure Data Studio

-- First, check if user exists
IF EXISTS (SELECT 1 FROM Users WHERE email = 'ens@admin.com')
BEGIN
    -- User exists, update to admin if not already
    UPDATE Users 
    SET role = 'admin'
    WHERE email = 'ens@admin.com' AND role != 'admin';
    
    IF @@ROWCOUNT > 0
        PRINT '✅ User updated to admin role';
    ELSE
        PRINT '⚠️  User already exists and is already an admin';
END
ELSE
BEGIN
    -- User doesn't exist, create new admin user
    -- Password hash for: 12301230Aa (bcrypt with salt rounds 10)
    INSERT INTO Users (email, password, name, role, isEmailVerified, createdAt)
    VALUES (
        'ens@admin.com',
        '$2a$10$YnNZc7Q8Qn5mGxJNvh0gY.K8Q5xJxKZq5mWh0VqKZqKZqKZqKZqKZ', -- Placeholder - needs bcrypt hash
        'Admin User',
        'admin',
        1,
        GETDATE()
    );
    
    PRINT '✅ Admin user created successfully!';
    PRINT 'Email: ens@admin.com';
    PRINT 'Password: 12301230Aa';
END;

GO

-- Verify the admin was created
SELECT id, email, name, role, isEmailVerified, createdAt 
FROM Users 
WHERE email = 'ens@admin.com';

-- NOTE: This script uses a placeholder password hash
-- For security, please run the Node.js script instead:
-- npm run create-admin
-- or: node scripts/create-admin.js

