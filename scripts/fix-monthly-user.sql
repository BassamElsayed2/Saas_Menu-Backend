-- Fix Monthly User Password
-- This script will delete the old user and create a new one with correct password hash
-- Email: monthly@test.com
-- Password: Test1234

DECLARE @Email NVARCHAR(255) = 'monthly@test.com'
DECLARE @Password NVARCHAR(255) = '$2a$10$/ITng6SFMHKHxRLFc9ovD.Xb5SY0ZPp73Zmm/sSOX4xhorCrOTKp.' -- Test1234 (correct hash)
DECLARE @Name NVARCHAR(255) = 'Monthly Subscriber'
DECLARE @PhoneNumber NVARCHAR(50) = '+966501234567'
DECLARE @UserId INT
DECLARE @PlanId INT = 2 -- Monthly plan

BEGIN TRANSACTION;

BEGIN TRY
    -- Delete old user if exists
    IF EXISTS (SELECT 1 FROM Users WHERE email = @Email)
    BEGIN
        SELECT @UserId = id FROM Users WHERE email = @Email
        
        PRINT '🗑️  Deleting old user...'
        
        -- Delete subscriptions first (foreign key)
        DELETE FROM Subscriptions WHERE userId = @UserId
        PRINT '   - Subscriptions deleted'
        
        -- Delete user
        DELETE FROM Users WHERE id = @UserId
        PRINT '   - User deleted'
        PRINT '✅ Old user deleted successfully!'
        PRINT ''
    END
    
    -- Create new user with correct password hash
    PRINT '👤 Creating new monthly user...'
    INSERT INTO Users (email, password, name, phoneNumber, role, isEmailVerified, createdAt)
    VALUES (@Email, @Password, @Name, @PhoneNumber, 'user', 1, GETDATE())
    
    SELECT @UserId = id FROM Users WHERE email = @Email
    
    PRINT '✅ User created successfully!'
    PRINT '   User ID: ' + CAST(@UserId AS NVARCHAR(10))
    PRINT '   Email: ' + @Email
    PRINT '   Name: ' + @Name
    PRINT ''
    
    -- Create monthly subscription
    PRINT '💳 Creating monthly subscription...'
    INSERT INTO Subscriptions (userId, planId, billingCycle, status, startDate, createdAt)
    VALUES (@UserId, @PlanId, 'monthly', 'active', GETDATE(), GETDATE())
    
    PRINT '✅ Monthly subscription created!'
    PRINT ''
    
    COMMIT TRANSACTION;
    
    PRINT '🎉 Done! Monthly user is ready!'
    PRINT ''
    PRINT '📧 Login credentials:'
    PRINT '   Email: monthly@test.com'
    PRINT '   Password: Test1234'
    PRINT '   Plan: Monthly (Pro)'
    PRINT ''
    PRINT '🔗 Login at: http://localhost:3000/authentication/sign-in'
    PRINT ''
    PRINT '✨ Features:'
    PRINT '   ✅ Up to 3 menus'
    PRINT '   ✅ Up to 100 products per menu'
    PRINT '   ✅ No ads'
    PRINT '   ✅ Custom logo upload'
    PRINT '   ✅ Pro badge on profile'
    
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    PRINT ''
    PRINT '❌ Error occurred:'
    PRINT ERROR_MESSAGE()
END CATCH

GO

-- Verify the user was created
SELECT 
    u.id as UserId,
    u.email,
    u.name,
    u.phoneNumber,
    u.role,
    s.billingCycle as Plan,
    s.status as SubscriptionStatus,
    p.name as PlanName,
    p.maxMenus,
    p.maxProductsPerMenu,
    p.hasAds
FROM Users u
LEFT JOIN Subscriptions s ON u.id = s.userId
LEFT JOIN Plans p ON s.planId = p.id
WHERE u.email = 'monthly@test.com'

