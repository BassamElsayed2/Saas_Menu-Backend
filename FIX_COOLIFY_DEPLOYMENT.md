# 🔧 Fix Coolify Deployment Error

## ❌ المشكلة:

Coolify بيستخدم **Nixpacks** بدلاً من الـ **Dockerfile**

---

## ✅ الحل (خطوات بالترتيب):

### 1️⃣ Generate JWT Secrets صح:

```bash
cd back-end
npm run generate:secret
```

**انسخ الناتج!** 📝

---

### 2️⃣ في Coolify Dashboard:

#### أ. غيّر Build Pack:

1. روح لـ **Resource → Settings → General**
2. غيّر:
   ```
   Build Pack: Dockerfile
   ```
3. تأكد من:
   ```
   Dockerfile Location: Dockerfile
   Base Directory: (leave empty)
   ```

#### ب. صحح Environment Variables:

**🔴 مهم جداً - JWT_REFRESH_SECRET غلط حالياً!**

```bash
# اتأكد من الـ Variables دي:
NODE_ENV=production
PORT=4021

# Database
DB_HOST=172.96.141.4
DB_PORT=1433
DB_NAME=SaasMenu
DB_USER=sa
DB_PASSWORD=M@m12301230

# JWT Secrets (من Step 1)
JWT_ACCESS_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_secret_here  # ❌ مش eyJzdWIiOiIx...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend
FRONTEND_URL=https://ensmenu.com
```

#### ج. Port Settings:

```
Port: 4021
Exposed Port: 4021
```

---

### 3️⃣ Commit & Push التعديلات:

```bash
git add .
git commit -m "Fix Coolify deployment with proper Dockerfile"
git push
```

---

### 4️⃣ Deploy في Coolify:

اضغط **"Redeploy"**

---

## 🎯 التعديلات اللي اتعملت:

### ✅ Fixed Files:

1. **Dockerfile** - عرض port 4021 و 5000
2. **docker-compose.yml** - Health check على port 4021 الصحيح
3. **.nixpacks.json** - لو Coolify استخدم Nixpacks
4. **.dockerignore** - تحسين الـ build

---

## 🐛 لو لسه في Error:

### Error: "tsc command failed"

**السبب:** Coolify لسه بيستخدم Nixpacks

**الحل:**

1. امسح الـ application من Coolify
2. أنشئ resource جديد
3. اختار **"Dockerfile"** من الأول

---

### Error: "Cannot find module"

**السبب:** الـ `node_modules` مش اتنصب صح

**الحل:**

```bash
# في Coolify terminal (Console)
npm ci
npm run build
```

---

### Error: "Port already in use"

**السبب:** في conflict في الـ ports

**الحل:**

- غيّر `PORT=4021` في Environment Variables لرقم تاني

---

### Error: "Database connection failed"

**الحل:**

1. تأكد من الـ IP: `172.96.141.4` صحيح
2. تأكد إن الـ SQL Server بيسمح بـ connections من Coolify server
3. Check firewall rules

---

## 📋 Checklist قبل Deploy:

- [ ] Build Pack = **Dockerfile** (not Nixpacks)
- [ ] JWT secrets generated صح (64+ chars hex)
- [ ] JWT_REFRESH_SECRET مش `eyJzdWI...` ❌
- [ ] PORT = 4021 في Environment
- [ ] DB credentials صحيحة
- [ ] FRONTEND_URL = https://ensmenu.com
- [ ] Files committed & pushed

---

## ✅ Expected Output بعد Deploy:

```
✅ Loaded environment from: .env.production
   (أو)
ℹ️  No .env.production file found, using system environment variables

✅ Environment ready:
   NODE_ENV: production
   DB_HOST: 172.96.141.4
   DB_PORT: 1433
   DB_NAME: SaasMenu
   DB_USER: sa

✅ Upload directories initialized
✅ Database connected successfully
✅ Email connection tested successfully (or warning if not configured)
🚀 Server is running on port 4021
📊 Environment: production
🌐 Frontend URL: https://ensmenu.com
✅ Server started successfully!
```

---

## 🚀 After Successful Deploy:

### Test Health Check:

```bash
curl https://your-backend-url.com/health
```

**Expected:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-05T...",
  "uptime": 123.456
}
```

### Test API:

```bash
curl https://your-backend-url.com/api/public/menus
```

---

## 📞 Still Having Issues?

1. Check Coolify logs: **Resource → Logs**
2. Check container logs: **Resource → Console** → `docker logs -f container_name`
3. Verify environment variables: **Resource → Environment Variables**

---

**Good luck! 🎉**
