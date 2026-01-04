-- Check subscription status for user ID 8
SELECT 
  u.id as UserId,
  u.email,
  u.name,
  s.id as SubscriptionId,
  s.status as CurrentStatus,
  s.startDate,
  s.endDate,
  p.name as PlanName,
  CASE 
    WHEN s.endDate IS NULL THEN 'No End Date'
    WHEN s.endDate > GETDATE() THEN 'Valid'
    ELSE 'EXPIRED'
  END as RealStatus,
  DATEDIFF(day, s.endDate, GETDATE()) as DaysOverdue
FROM Users u
LEFT JOIN Subscriptions s ON u.id = s.userId
LEFT JOIN Plans p ON s.planId = p.id
WHERE u.id = 8
ORDER BY s.createdAt DESC;

-- Update expired subscriptions NOW
UPDATE Subscriptions
SET status = 'expired'
WHERE userId = 8
  AND status = 'active'
  AND endDate IS NOT NULL
  AND endDate <= GETDATE();

-- Check again after update
SELECT 
  u.id as UserId,
  u.email,
  u.name,
  s.id as SubscriptionId,
  s.status as CurrentStatus,
  s.startDate,
  s.endDate,
  p.name as PlanName,
  CASE 
    WHEN s.endDate IS NULL THEN 'No End Date'
    WHEN s.endDate > GETDATE() THEN 'Valid'
    ELSE 'Was Expired, Now Updated'
  END as RealStatus
FROM Users u
LEFT JOIN Subscriptions s ON u.id = s.userId
LEFT JOIN Plans p ON s.planId = p.id
WHERE u.id = 8
ORDER BY s.createdAt DESC;

