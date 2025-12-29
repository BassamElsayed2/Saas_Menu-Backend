-- Rollback Image URLs - Convert absolute back to relative URLs
-- Run this ONLY if you need to rollback the changes

-- Rollback MenuItems images
UPDATE MenuItems 
SET image = REPLACE(image, 'http://localhost:5000', '')
WHERE image LIKE 'http://localhost:5000/uploads/%';

-- Rollback Categories images
UPDATE Categories 
SET image = REPLACE(image, 'http://localhost:5000', '')
WHERE image LIKE 'http://localhost:5000/uploads/%';

-- Rollback Menus logos
UPDATE Menus 
SET logo = REPLACE(logo, 'http://localhost:5000', '')
WHERE logo LIKE 'http://localhost:5000/uploads/%';

-- Verify the rollback
SELECT 
  'MenuItems' as TableName,
  COUNT(*) as RelativeURLCount
FROM MenuItems 
WHERE image LIKE '/uploads/%' AND image NOT LIKE 'http%'

UNION ALL

SELECT 
  'Categories' as TableName,
  COUNT(*) as RelativeURLCount
FROM Categories 
WHERE image LIKE '/uploads/%' AND image NOT LIKE 'http%'

UNION ALL

SELECT 
  'Menus' as TableName,
  COUNT(*) as RelativeURLCount
FROM Menus 
WHERE logo LIKE '/uploads/%' AND logo NOT LIKE 'http%';

-- Rollback complete

