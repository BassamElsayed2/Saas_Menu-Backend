# 🎯 SaaS Menu Platform - Backend API

Backend API مبني بـ Node.js + TypeScript + Express + SQL Server

## 🚀 Quick Start

### Development

```bash
# Install dependencies
cd back-end
npm install

# Setup environment variables
cp .env.example .env.development
# Edit .env.development with your configuration

# Run in development
npm run dev
```

### Production

```bash
# Install dependencies
npm install --production

# Setup environment variables
cp .env.example .env.production
# Edit .env.production with your production configuration

# Build and start
npm run build
npm start
```

Generate JWT secrets:

```bash
npm run generate:secret
```

## 📁 Project Structure

```
back-end/
├── src/                     # TypeScript source code
│   ├── config/              # Database, Email, Constants
│   ├── controllers/         # Business logic
│   ├── routes/              # API routes
│   ├── middleware/          # Auth, Validation, Rate limiting
│   ├── services/            # Business services
│   ├── utils/               # Helpers, Logger
│   ├── validators/          # Input validation schemas
│   ├── inngest/             # Background jobs
│   └── server.ts            # Main server file
├── dist/                    # Compiled JavaScript (after build)
├── database/
│   ├── schema.sql           # Database schema
│   └── migrations/          # Database migrations
├── scripts/                 # Utility scripts
│   ├── create-admin.js      # Create admin user
│   ├── create-monthly-user.js
│   ├── expire-subscriptions.js
│   └── generate-password-hash.js
├── uploads/                 # Uploaded images (auto-created)
│   ├── logos/
│   ├── menu-items/
│   ├── categories/
│   └── ads/
└── package.json
```

## 🔌 Available APIs

### Authentication (`/api/auth`)

- POST `/signup` - Register new user
- POST `/login` - Login
- GET `/verify-email` - Verify email
- POST `/resend-verification` - Resend verification
- POST `/forgot-password` - Request password reset
- POST `/reset-password` - Reset password
- GET `/me` - Get current user

### Public (`/api/public`)

- GET `/menu/:slug` - Get public menu
- POST `/menu/:slug/rate` - Rate menu
- GET `/plans` - Get subscription plans

### Menus (`/api/menus`) 🔒

- GET `/` - Get user menus
- POST `/` - Create menu
- GET `/:id` - Get menu details
- PUT `/:id` - Update menu
- PATCH `/:id/status` - Toggle menu status
- DELETE `/:id` - Delete menu

### Menu Items (`/api/menus/:menuId/items`) 🔒

- GET `/` - Get menu items
- POST `/` - Create menu item
- PUT `/:itemId` - Update menu item
- DELETE `/:itemId` - Delete menu item
- POST `/reorder` - Reorder items

### Branches (`/api/menus/:menuId/branches`) 🔒

- GET `/` - Get branches
- POST `/` - Create branch
- PUT `/:branchId` - Update branch
- DELETE `/:branchId` - Delete branch

### User (`/api/user`) 🔒

- GET `/profile` - Get profile
- PUT `/profile` - Update profile
- POST `/change-password` - Change password
- GET `/statistics` - Get user statistics
- POST `/upgrade-plan` - Upgrade subscription
- DELETE `/account` - Delete account

### Admin (`/api/admin`) 👮

- GET `/users` - Get all users
- GET `/users/:userId` - Get user details
- PUT `/users/:userId/plan` - Update user plan
- GET `/menus` - Get all menus
- GET `/menus/:menuId/ads` - Get menu ads
- POST `/menus/:menuId/ads` - Create ad
- PUT `/ads/:adId` - Update ad
- DELETE `/ads/:adId` - Delete ad
- GET `/statistics` - System statistics

### Upload (`/api/upload`) 🔒

- POST `/` - Upload image
- DELETE `/:filename` - Delete image
- GET `/:filename/info` - Get image info

🔒 = Requires Authentication
👮 = Requires Admin Role

## 🛠️ Technologies

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQL Server (mssql)
- **Authentication**: JWT (jsonwebtoken)
- **Password**: bcrypt
- **Email**: Nodemailer
- **File Upload**: Multer + Sharp
- **Validation**: express-validator + Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Testing**: Jest + Supertest

## 🔒 Security Features

✅ JWT Authentication with refresh tokens
✅ Password hashing (bcrypt)
✅ Rate limiting (express-rate-limit)
✅ Input validation (Zod + express-validator)
✅ SQL Injection protection (parameterized queries)
✅ XSS protection (helmet)
✅ CORS configured
✅ IDOR protection (ownership checks)
✅ File upload validation (type, size, dimensions)
✅ SQL Server encryption support

### Production Security Checklist

Before deploying to production, ensure:

- [ ] Strong JWT secrets generated (min 64 characters)
- [ ] Database encryption enabled (`DB_ENCRYPT=true`)
- [ ] HTTPS enabled on server/reverse proxy
- [ ] CORS restricted to your frontend domain only
- [ ] Database user has minimal required permissions
- [ ] File upload directory has proper permissions
- [ ] Rate limiting enabled for all endpoints
- [ ] Error messages don't expose sensitive info
- [ ] Database backups configured
- [ ] Monitoring and alerting setup
- [ ] Environment variables secured (not in git)
- [ ] Admin accounts have strong passwords

## 📝 Environment Variables

Create `.env.production` file with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database Configuration (SQL Server)
DB_HOST=your-database-host
DB_PORT=1433
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# JWT Secrets (Generate using: npm run generate:secret)
JWT_ACCESS_SECRET=your-jwt-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-64-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Inngest Configuration
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Security
BCRYPT_ROUNDS=10

# Logging
LOG_LEVEL=info
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📦 Scripts

```json
{
  "dev": "ts-node-dev --respawn src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "jest --coverage",
  "test:watch": "jest --watch"
}
```

## 🗄️ Database Setup

1. Install SQL Server
2. Create database: `saas_menu`
3. Run schema: `database/schema.sql`
4. Update `.env.development` with connection info

## 📸 Image Upload

- **Allowed types**: JPEG, PNG, WebP
- **Max size**: 5MB
- **Output format**: WebP (optimized)
- **Folders**:
  - `/uploads/logos` - Menu logos (200x200)
  - `/uploads/menu-items` - Product images (800x800)
  - `/uploads/ads` - Advertisement images (1200x600)

## 🌐 Multi-language Support

All translatable content (menus, items, branches) supports:

- Arabic (ar)
- English (en)

Use `?locale=ar` or `?locale=en` query parameter.

## 📊 Rate Limits

| Endpoint Type      | Limit   | Window |
| ------------------ | ------- | ------ |
| Auth               | 5 req   | 15 min |
| API                | 100 req | 15 min |
| Public             | 200 req | 15 min |
| Upload             | 50 req  | 1 hour |
| Password Reset     | 3 req   | 1 hour |
| Email Verification | 3 req   | 1 hour |

## 🔍 Logging

Winston logger configuration:

- **Development**: Console output with colors
- **Production**:
  - `logs/error.log` - Error logs only
  - `logs/combined.log` - All logs
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled promise rejections

Log levels: `error`, `warn`, `info`, `debug`

## 🚢 Production Deployment

### Prerequisites

1. ✅ Node.js 18+ installed
2. ✅ SQL Server database setup
3. ✅ Environment variables configured
4. ✅ Domain/subdomain configured

### Deployment Steps

```bash
# 1. Clone repository
git clone <your-repo-url>
cd back-end

# 2. Install dependencies
npm install --production

# 3. Setup environment
cp .env.example .env.production
# Edit .env.production with your production configuration

# 4. Build TypeScript to JavaScript
npm run build

# 5. Run database migrations
# Execute database/schema.sql on your production database

# 6. Create admin user
node scripts/create-admin.js

# 7. Start production server
npm start
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name saas-menu-api

# Enable auto-restart on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs saas-menu-api

# Restart application
pm2 restart saas-menu-api
```

### Using Docker

```bash
# Build image
docker build -t saas-menu-api .

# Run container
docker run -d \
  --name saas-menu-api \
  -p 5000:5000 \
  --env-file .env.production \
  saas-menu-api
```

### Health Check

```bash
# Check if API is running
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

## 📖 API Documentation

See `BACKEND_API_COMPLETE.md` for complete API documentation with examples.

## 🐛 Troubleshooting

### Database connection fails

- Verify SQL Server is running
- Check DB credentials in `.env.development`
- Temporarily disabled? Check `server.ts` line 95

### Email not sending

- Verify Mailtrap credentials
- Check email service in `config/email.ts`

### Upload fails

- Check `uploads/` directory exists and is writable
- Verify file size < 5MB
- Only JPEG, PNG, WebP allowed

## 🤝 Contributing

1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR

## 🔧 Production Optimization

### Performance Tips

1. **Enable compression**: Use gzip compression in production
2. **Optimize images**: Sharp automatically optimizes images to WebP
3. **Connection pooling**: Database connection pool is pre-configured
4. **Caching**: Consider adding Redis for session/cache management
5. **CDN**: Serve static files (uploads) through CDN

### Monitoring

Recommended monitoring tools:

- **Application**: PM2, New Relic, or Datadog
- **Database**: SQL Server Management Studio
- **Logs**: Winston logs + centralized logging (e.g., ELK stack)
- **Uptime**: UptimeRobot or Pingdom

### Backup Strategy

```bash
# Database backup (SQL Server)
sqlcmd -S localhost -U sa -P yourpassword \
  -Q "BACKUP DATABASE [saas_menu] TO DISK = '/backup/saas_menu.bak'"

# Uploads backup
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

## 📞 Support

For issues or questions:

- Check troubleshooting section above
- Review API documentation
- Check logs in `logs/` directory

---

**Status**: ✅ Production Ready

**Version**: 1.0.0

**Last Updated**: January 2025
