# 🎯 SaaS Menu Platform - Backend API

Backend API مبني بـ Node.js + TypeScript + Express + SQL Server

## 🚀 Quick Start

```bash
# Install dependencies
cd back-end
npm install

# Setup environment variables
# Copy content from CREATE_ENV_FILES.md to .env.development

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
back-end/
├── src/
│   ├── config/          # Database, Email, Constants
│   ├── controllers/     # Business logic (7 files)
│   ├── routes/          # API routes (7 files)
│   ├── middleware/      # Auth, Validation, Rate limiting
│   ├── services/        # Email service
│   ├── utils/           # Helpers, Logger
│   └── server.ts        # Main server file
├── database/
│   └── schema.sql       # Database schema
├── uploads/             # Uploaded images (auto-created)
├── logs/                # Winston logs (auto-created)
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

✅ JWT Authentication
✅ Password hashing (bcrypt)
✅ Rate limiting (express-rate-limit)
✅ Input validation (express-validator)
✅ SQL Injection protection
✅ XSS protection (helmet)
✅ CORS configured
✅ IDOR protection

## 📝 Environment Variables

Check `CREATE_ENV_FILES.md` for complete list.

Required variables:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DB_SERVER=localhost
DB_DATABASE=saas_menu
DB_USER=sa
DB_PASSWORD=your_password

# JWT
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email (Mailtrap)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_username
EMAIL_PASS=your_password
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

Winston logger saves to:

- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- Console output (development)

## 🚢 Deployment

Recommended: Coolify with Node.js

```bash
# Build
npm run build

# Start production
NODE_ENV=production node dist/server.js
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

---

**Status**: ✅ Backend 100% Complete

**Last Updated**: 22 December 2024
