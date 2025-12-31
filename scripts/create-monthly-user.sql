-- Create Monthly Subscriber User
-- Email: monthly@test.com
-- Password: Test1234
-- Run this script in SQL Server Management Studio or Azure Data Studio

DECLARE @Email NVARCHAR(255) = 'monthly@test.com'
DECLARE @Password NVARCHAR(255) = '$2a$10$/ITng6SFMHKHxRLFc9ovD.Xb5SY0ZPp73Zmm/sSOX4xhorCrOTKp.' -- Test1234
DECLARE @Name NVARCHAR(255) = 'Monthly Subscriber'
DECLARE @PhoneNumber NVARCHAR(50) = '+966501234567'
DECLARE @UserId INT
DECLARE @PlanId INT = 2 -- Monthly plan

BEGIN TRANSACTION;

BEGIN TRY
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM Users WHERE email = @Email)
    BEGIN
        SELECT @UserId = id FROM Users WHERE email = @Email
        
        PRINT '⚠️  User already exists!'
        PRINT '   User ID: ' + CAST(@UserId AS NVARCHAR(10))
        PRINT '   Email: ' + @Email
        
        -- Update subscription to monthly
        UPDATE Subscriptions 
        SET planId = @PlanId, 
            billingCycle = 'monthly',
            status = 'active',
            updatedAt = GETDATE()
        WHERE userId = @UserId
        
        PRINT '✅ Subscription updated to monthly!'
    END
    ELSE
    BEGIN
        -- Create new user
        INSERT INTO Users (email, password, name, phoneNumber, role, isEmailVerified, createdAt)
        OUTPUT INSERTED.id INTO @UserId
        VALUES (@Email, @Password, @Name, @PhoneNumber, 'user', 1, GETDATE())
        
        SELECT @UserId = id FROM Users WHERE email = @Email
        
        PRINT '✅ User created successfully!'
        PRINT '   User ID: ' + CAST(@UserId AS NVARCHAR(10))
        PRINT '   Email: ' + @Email
        PRINT '   Name: ' + @Name
        
        -- Create monthly subscription
        INSERT INTO Subscriptions (userId, planId, billingCycle, status, startDate, createdAt)
        VALUES (@UserId, @PlanId, 'monthly', 'active', GETDATE(), GETDATE())
        
        PRINT '✅ Monthly subscription created!'
    END
    
    COMMIT TRANSACTION;
    
    PRINT ''
    PRINT '🎉 Done! Monthly user is ready!'
    PRINT ''
    PRINT '📧 Login credentials:'
    PRINT '   Email: monthly@test.com'
    PRINT '   Password: Test1234'
    PRINT '   Plan: Monthly (Pro)'
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
    
    PRINT '❌ Error occurred:'
    PRINT ERROR_MESSAGE()
END CATCH

GO

-- Verify the user was created/updated
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


