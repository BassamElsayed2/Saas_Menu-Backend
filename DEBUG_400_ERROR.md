# 🔍 Debug 400 Error - Step by Step

## 🎯 الخطوات لحل المشكلة:

### 1️⃣ Restart الـ Backend (مهم جداً!)

```bash
cd back-end

# Stop the server (Ctrl+C if running)

# Rebuild
npm run build

# Start server
npm start
```

⚠️ **مهم:** لازم تعمل restart للـ backend عشان التعديلات تشتغل!

---

### 2️⃣ في Frontend - افتح Console

1. افتح الـ page: `http://localhost:3000/dashboard/menus/15/settings`
2. افتح **Developer Tools** (F12)
3. روح على **Console** tab
4. جرب تحفظ التعديلات

---

### 3️⃣ شوف الـ Error في Console

هتشوف حاجة زي كده:

```
📤 Sending update: { theme: "default", nameEn: "", ... }
❌ Update failed: 400 {
  error: "Validation failed: nameEn: Invalid value",
  details: [...]
}
```

---

### 4️⃣ شارك الـ Error معايا

انسخ الـ error اللي ظهر في console وابعته عشان أساعدك.

---

## 🔍 Common Issues:

### Issue 1: Backend مش اتعمل restart
**الحل:** Stop & start الـ backend تاني

### Issue 2: Validation بيرفض empty strings
**الحل:** تم إصلاحه في الكود، بس محتاج restart

### Issue 3: Frontend بيبعت data type غلط
**الحل:** هنشوفه من الـ console logs

---

## 📋 Expected Console Output (Success):

```
📤 Sending update: {
  theme: "default",
  currency: "SAR"
}
✅ Menu updated successfully
```

---

## 🚀 Quick Test:

افتح terminal جديد:

```bash
# Test the endpoint directly
curl -X PUT http://localhost:5000/api/menus/15 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"theme":"default"}'
```

**Expected:** `200 OK`

---

**أعمل الخطوات دي وابعتلي الـ error من console! 🔍**

