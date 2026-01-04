-- =============================================
-- Stored Procedure: Expire Subscriptions
-- Description: Updates status of subscriptions whose end date has passed
-- =============================================

-- Create or alter the stored procedure
IF OBJECT_ID('ExpireSubscriptions', 'P') IS NOT NULL
    DROP PROCEDURE ExpireSubscriptions;
GO

CREATE PROCEDURE ExpireSubscriptions
AS
BEGIN
    SET NOCOUNT ON;

    -- Update expired subscriptions
    UPDATE Subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND endDate IS NOT NULL
      AND endDate <= GETDATE();

    -- Return count of expired subscriptions
    SELECT @@ROWCOUNT AS ExpiredCount;
END;
GO

-- Execute the procedure immediately to update current expired subscriptions
EXEC ExpireSubscriptions;
GO

-- =============================================
-- Optional: Create a SQL Server Agent Job to run this daily
-- Note: This requires SQL Server Agent to be enabled
-- =============================================

-- To manually expire subscriptions, run:
-- EXEC ExpireSubscriptions;

PRINT 'Stored procedure ExpireSubscriptions created successfully.';
PRINT 'Run "EXEC ExpireSubscriptions;" to update expired subscriptions.';

