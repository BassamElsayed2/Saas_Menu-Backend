-- Test Notification System
-- This script helps you test the notification system manually

-- ========================================
-- 1. Test Subscription Expiring Soon (2 days)
-- ========================================
-- Find an active subscription and set it to expire in 2 days
PRINT '========================================';
PRINT '1. Testing Subscription Expiring Soon';
PRINT '========================================';

-- Show current active subscriptions
SELECT 
    s.id as SubscriptionId,
    u.id as UserId,
    u.name as UserName,
    u.email,
    p.name as PlanName,
    s.endDate,
    s.expiryNotificationSent,
    DATEDIFF(day, GETDATE(), s.endDate) as DaysUntilExpiry
FROM Subscriptions s
JOIN Users u ON s.userId = u.id
JOIN Plans p ON s.planId = p.id
WHERE s.status = 'active' 
  AND p.name != 'Free'
  AND s.endDate IS NOT NULL;

-- Uncomment and modify the subscription ID to test
/*
UPDATE Subscriptions 
SET endDate = DATEADD(day, 2, GETDATE()),
    expiryNotificationSent = 0
WHERE id = 1; -- Change to your subscription ID

PRINT 'Updated subscription to expire in 2 days';
PRINT 'Wait for the scheduler to run (every hour) or restart the backend';
*/

-- ========================================
-- 2. Test Subscription Expired (Grace Period)
-- ========================================
PRINT '';
PRINT '========================================';
PRINT '2. Testing Subscription Expired';
PRINT '========================================';

-- Uncomment and modify the subscription ID to test
/*
UPDATE Subscriptions 
SET endDate = DATEADD(day, -1, GETDATE()),
    gracePeriodStartDate = NULL,
    gracePeriodEndDate = NULL,
    status = 'active'
WHERE id = 1; -- Change to your subscription ID

PRINT 'Updated subscription to be expired (will start grace period)';
PRINT 'Wait for the scheduler to run (every hour) or restart the backend';
*/

-- ========================================
-- 3. Test Grace Period Expired (Downgrade to Free)
-- ========================================
PRINT '';
PRINT '========================================';
PRINT '3. Testing Grace Period Expired';
PRINT '========================================';

-- Uncomment and modify the subscription ID to test
/*
UPDATE Subscriptions 
SET gracePeriodEndDate = DATEADD(day, -1, GETDATE()),
    status = 'expired',
    gracePeriodStartDate = DATEADD(day, -3, GETDATE())
WHERE id = 1; -- Change to your subscription ID

PRINT 'Updated subscription grace period to be expired (will downgrade to free)';
PRINT 'Wait for the scheduler to run (every hour) or restart the backend';
*/

-- ========================================
-- 4. View All Notifications
-- ========================================
PRINT '';
PRINT '========================================';
PRINT '4. Current Notifications';
PRINT '========================================';

SELECT 
    n.id,
    u.name as UserName,
    u.email,
    n.type,
    n.title,
    n.titleAr,
    n.isRead,
    n.createdAt
FROM Notifications n
JOIN Users u ON n.userId = u.id
ORDER BY n.createdAt DESC;

-- ========================================
-- 5. View Subscription Status
-- ========================================
PRINT '';
PRINT '========================================';
PRINT '5. Current Subscription Status';
PRINT '========================================';

SELECT 
    s.id,
    u.name as UserName,
    u.email,
    p.name as PlanName,
    s.status,
    s.startDate,
    s.endDate,
    s.gracePeriodStartDate,
    s.gracePeriodEndDate,
    s.notificationSent,
    s.expiryNotificationSent,
    CASE 
        WHEN s.endDate IS NULL THEN 'No expiry (Free plan)'
        WHEN s.endDate > GETDATE() THEN CONCAT(DATEDIFF(day, GETDATE(), s.endDate), ' days remaining')
        WHEN s.gracePeriodEndDate IS NOT NULL AND s.gracePeriodEndDate > GETDATE() THEN CONCAT('Grace period: ', DATEDIFF(day, GETDATE(), s.gracePeriodEndDate), ' days left')
        ELSE 'Expired'
    END as Status
FROM Subscriptions s
JOIN Users u ON s.userId = u.id
JOIN Plans p ON s.planId = p.id
WHERE s.status = 'active' OR s.status = 'expired'
ORDER BY s.createdAt DESC;

-- ========================================
-- 6. Cleanup Test Data (Optional)
-- ========================================
PRINT '';
PRINT '========================================';
PRINT '6. Cleanup (Uncomment to use)';
PRINT '========================================';

-- Uncomment to delete all test notifications
/*
DELETE FROM Notifications;
PRINT 'All notifications deleted';
*/

-- Uncomment to reset a subscription to normal state
/*
UPDATE Subscriptions 
SET endDate = DATEADD(month, 1, GETDATE()),
    gracePeriodStartDate = NULL,
    gracePeriodEndDate = NULL,
    status = 'active',
    notificationSent = 0,
    expiryNotificationSent = 0
WHERE id = 1; -- Change to your subscription ID

PRINT 'Subscription reset to normal state';
*/

PRINT '';
PRINT '========================================';
PRINT 'Test Script Complete';
PRINT '========================================';
PRINT '';
PRINT 'Instructions:';
PRINT '1. Uncomment the test you want to run';
PRINT '2. Change the subscription ID to match your test user';
PRINT '3. Execute the script';
PRINT '4. Wait for the scheduler (runs every hour) or restart backend';
PRINT '5. Check the notifications in the frontend';
PRINT '';

