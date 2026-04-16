// server/scripts/setAdmin.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// โหลด .env ที่โฟลเดอร์ server
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// ช่วยดีบัก: ถ้าไม่มีค่า ให้บอกทางแก้
if (!MONGODB_URI || typeof MONGODB_URI !== 'string') {
  console.error('[setAdmin] ERROR: MONGODB_URI is undefined.');
  console.error('  - ตรวจว่าไฟล์ server/.env มีบรรทัด MONGODB_URI=... แล้วหรือยัง');
  console.error('  - ชื่อแปรต้องเป็น MONGODB_URI ตรงกับโค้ด (ไม่ใช่ MONGO_URI)');
  console.error('  - หลังแก้ .env แล้วให้รันคำสั่งใหม่อีกครั้ง');
  process.exit(1);
}

// parse arguments: --email=... --password=...
const args = process.argv.slice(2);
const getArg = (key) => {
  const pref = `--${key}=`;
  const found = args.find(a => a.startsWith(pref));
  return found ? found.slice(pref.length) : '';
};

const email = getArg('email');
const password = getArg('password');

if (!email || !password) {
  console.error('[setAdmin] ใช้รูปแบบ:');
  console.error('  npm run admin:set -- --email=admin@example.com --password=YourStrongPass');
  process.exit(1);
}

(async () => {
  try {
    console.log('[setAdmin] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // หา user ตามอีเมล
    let user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // ถ้ายังไม่มี -> สร้างใหม่เป็น admin
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Administrator',
        email: email.toLowerCase().trim(),
        password: hashed,
        phone: '0000000000',
        role: 'admin',
      });
      console.log(`[setAdmin] ✔ สร้างผู้ดูแลระบบใหม่: ${user.email}`);
    } else {
      // ถ้ามีอยู่แล้ว -> เปลี่ยน role เป็น admin และอัปเดตรหัสผ่าน
      user.role = 'admin';
      user.password = await bcrypt.hash(password, 10);
      await user.save();
      console.log(`[setAdmin] ✔ อัปเดตผู้ใช้ให้เป็นผู้ดูแลระบบ: ${user.email}`);
    }

    console.log('[setAdmin] เสร็จสิ้น');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[setAdmin] ERROR:', err?.message || err);
    process.exit(1);
  }
})();
