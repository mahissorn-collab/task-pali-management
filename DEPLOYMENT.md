# Deploy ระบบติดตามงาน

## ทางเลือกที่แนะนำ

- Database/Login: Firebase Spark plan
- Host: Vercel Hobby plan
- Source control: GitHub

## 1. ตั้งค่า Firebase

1. ไปที่ Firebase Console แล้วสร้าง Project ใหม่
2. เปิด Authentication > Sign-in method > Email/Password
3. สร้างผู้ใช้งานจริง เช่น `admin@yourdomain.com`
4. เปิด Firestore Database
5. นำกฎใน `firestore.rules` ไปใส่ใน Rules ของ Firestore แล้ว Publish
6. ไปที่ Project settings > Your apps > Web app แล้วคัดลอก Firebase config
7. เปิดไฟล์ `firebase-config.js` แล้วใส่ค่า config จริง

## 2. ตั้งค่ารายชื่อผู้ใช้งาน

ในระบบ ผู้ใช้งานจะจับคู่กับอีเมล์จากข้อมูลสมาชิก ถ้ายังไม่ได้กำหนดอีเมล์ ระบบจะใช้ค่าเริ่มต้นชั่วคราว:

- `admin@pali.local`
- `leader@pali.local`
- `register@pali.local`
- `document@pali.local`

เมื่อต้องใช้จริง ให้เพิ่มช่อง `email` ในข้อมูลสมาชิก หรือปรับในระบบหลังเชื่อมฐานข้อมูล

## 3. Deploy ไป Vercel

1. Push โปรเจกต์นี้ขึ้น GitHub
2. เข้า Vercel แล้ว Import Git Repository
3. Framework Preset เลือก Other
4. Build Command เว้นว่าง
5. Output Directory ใช้ค่าเริ่มต้นหรือใส่ `.`
6. Deploy

หลัง Deploy ให้เพิ่ม Domain ของ Vercel ใน Firebase Authentication > Settings > Authorized domains
