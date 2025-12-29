-- Fix Image URLs - Convert relative to absolute URLs
-- Run this in SQL Server Management Studio or Azure Data Studio

-- Update MenuItems images
UPDATE MenuItems 
SET image = 'http://localhost:5000' + image 
WHERE image LIKE '/uploads/%' 
  AND image NOT LIKE 'http%';

-- Update Categories images
UPDATE Categories 
SET image = 'http://localhost:5000' + image 
WHERE image LIKE '/uploads/%' 
  AND image NOT LIKE 'http%';

-- Update Menus logos
UPDATE Menus 
SET logo = 'http://localhost:5000' + logo 
WHERE logo LIKE '/uploads/%' 
  AND logo NOT LIKE 'http%';

-- Verify the updates
SELECT 
  'MenuItems' as TableName,
  COUNT(*) as UpdatedCount
FROM MenuItems 
WHERE image LIKE 'http://localhost:5000/uploads/%'

UNION ALL

SELECT 
  'Categories' as TableName,
  COUNT(*) as UpdatedCount
FROM Categories 
WHERE image LIKE 'http://localhost:5000/uploads/%'

UNION ALL

SELECT 
  'Menus' as TableName,
  COUNT(*) as UpdatedCount
FROM Menus 
WHERE logo LIKE 'http://localhost:5000/uploads/%';

-- Done! All image URLs are now absolute

