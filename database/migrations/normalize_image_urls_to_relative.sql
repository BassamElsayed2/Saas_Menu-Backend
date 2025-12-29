-- Normalize Image URLs to Relative Paths (Best Practice)
-- This allows the application to dynamically generate absolute URLs
-- based on the environment (development, staging, production)

-- Convert MenuItems images to relative paths
UPDATE MenuItems 
SET image = CASE 
  WHEN image LIKE 'http://%' THEN SUBSTRING(image, CHARINDEX('/uploads/', image), LEN(image))
  WHEN image LIKE 'https://%' THEN SUBSTRING(image, CHARINDEX('/uploads/', image), LEN(image))
  ELSE image
END
WHERE image IS NOT NULL;

-- Convert Categories images to relative paths
UPDATE Categories 
SET image = CASE 
  WHEN image LIKE 'http://%' THEN SUBSTRING(image, CHARINDEX('/uploads/', image), LEN(image))
  WHEN image LIKE 'https://%' THEN SUBSTRING(image, CHARINDEX('/uploads/', image), LEN(image))
  ELSE image
END
WHERE image IS NOT NULL;

-- Convert Menus logos to relative paths
UPDATE Menus 
SET logo = CASE 
  WHEN logo LIKE 'http://%' THEN SUBSTRING(logo, CHARINDEX('/uploads/', logo), LEN(logo))
  WHEN logo LIKE 'https://%' THEN SUBSTRING(logo, CHARINDEX('/uploads/', logo), LEN(logo))
  ELSE logo
END
WHERE logo IS NOT NULL;

-- Verify the updates
SELECT 
  'MenuItems' as TableName,
  COUNT(*) as RelativePathCount,
  'Should show relative paths like /uploads/...' as Note
FROM MenuItems 
WHERE image LIKE '/uploads/%'

UNION ALL

SELECT 
  'Categories' as TableName,
  COUNT(*) as RelativePathCount,
  'Should show relative paths like /uploads/...' as Note
FROM Categories 
WHERE image LIKE '/uploads/%'

UNION ALL

SELECT 
  'Menus' as TableName,
  COUNT(*) as RelativePathCount,
  'Should show relative paths like /uploads/...' as Note
FROM Menus 
WHERE logo LIKE '/uploads/%';

-- Sample data check
SELECT TOP 3 
  id,
  image as 'Image Path (should be relative)',
  'MenuItems' as TableName
FROM MenuItems 
WHERE image IS NOT NULL
ORDER BY id DESC;

SELECT TOP 3 
  id,
  image as 'Image Path (should be relative)',
  'Categories' as TableName
FROM Categories 
WHERE image IS NOT NULL
ORDER BY id DESC;

-- Done! All images are now stored as relative paths
-- The application will dynamically convert them to absolute URLs based on environment

