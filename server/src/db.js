// server/src/db.js
import mongoose from 'mongoose';

const MONGO_URI =
  process.env.MONGODB_URI // ✅ รองรับชื่อใหม่ที่ใช้กับสคริปต์ setAdmin
  || process.env.MONGO_URI; // ✅ เผื่อโค้ดเก่ายังใช้ชื่อนี้

export async function connectDB() {
  if (!MONGO_URI) {
    // แจ้งให้ครบสองชื่อ เผื่อสลับไปมา
    throw new Error('Missing MONGODB_URI (or MONGO_URI)');
  }
  await mongoose.connect(MONGO_URI);
  console.log('[db] connected');
}
