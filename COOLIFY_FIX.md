# 🔧 Fix Coolify Deployment - URGENT

## 🚨 المشكلة الأساسية:

**Coolify بيستخدم Nixpacks بدلاً من الـ Dockerfile!**

---

## ✅ الحل (اختر واحد):

### الحل 1️⃣: غيّر Build Pack في Coolify (الأفضل)

**في Coolify Dashboard:**

1. روح على الـ Backend Application
2. اضغط **"Edit"** أو **"Configuration"**
3. دور على **"Build Pack"** أو **"Builder"**
4. غيّره من:

   ```
   Nixpacks (Auto) ❌
   ```

   إلى:

   ```
   Dockerfile ✅
   ```

5. في خانة **"Dockerfile Location"**:

   ```
   Dockerfile
   ```

6. **"Base Directory"**: (خليها فاضية)

7. اضغط **"Save"**

8. اضغط **"Redeploy"**

---

### الحل 2️⃣: لو الـ Nixpacks مُفعّل (backup)

**الملفات دي اتصلحت عشان تشتغل مع Nixpacks:**

✅ `.nixpacks.json` - Configuration للـ Nixpacks
✅ `package.json` - Build script محدث
✅ `tsconfig.json` - TypeScript config محسّن
✅ `Dockerfile` - متوافق مع الاتنين

**جرب Deploy تاني - المفروض يشتغل دلوقتي!**

---

## 📋 بعد Deploy:

### تأكد إن كل حاجة شغالة:

```bash
# Health check
curl https://your-api.com/health

# Expected:
{"status":"ok","timestamp":"...","uptime":...}
```

---

## 🐛 لو لسه فيه مشكلة:

### Error: "Cannot find module 'dist/server.js'"

**الحل:**

```bash
# في Coolify Console
ls -la dist/
# لازم تلاقي server.js موجود
```

---

### Error: "tsc: command not found"

**الحل:**

- تأكد إن `typescript` في `devDependencies` في `package.json`
- أو غيّر Build Pack لـ **Dockerfile**

---

### Error: "Module not found" أثناء Runtime

**الحل:**

```bash
# في Coolify Console
npm install
npm run build
```

---

## 📞 التعديلات اللي تمت:

| File             | Change                               | Why                  |
| ---------------- | ------------------------------------ | -------------------- |
| `package.json`   | `"build": "tsc -p tsconfig.json"`    | صريح أكثر            |
| `tsconfig.json`  | Added `allowSyntheticDefaultImports` | Compatibility        |
| `.nixpacks.json` | Full config with explicit commands   | Nixpacks support     |
| `Dockerfile`     | Complete rebuild with proper steps   | Fixed server.js path |

---

## 🎯 Next Steps:

1. **Commit & Push:**

   ```bash
   git add .
   git commit -m "Fix Coolify build - support both Dockerfile and Nixpacks"
   git push
   ```

2. **في Coolify:** اضغط "Redeploy"

3. **انتظر** 2-3 دقايق

4. **Test:** افتح `https://your-api.com/health`

---

## ✅ Expected Logs بعد النجاح:

```
✅ Environment ready
✅ Upload directories initialized
✅ Database connected successfully
🚀 Server is running on port 4021
✅ Server started successfully!
```

---

**Good Luck! 🚀**
