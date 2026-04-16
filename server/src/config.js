// server/src/config.js
import 'dotenv/config';

// รองรับทั้ง MONGODB_URI (ใหม่) และ MONGO_URI (เดิม)
export const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || '';

export const PORT         = process.env.PORT || 5000;
export const JWT_SECRET   = process.env.JWT_SECRET || 'change_me';
export const JWT_EXPIRES  = process.env.JWT_EXPIRES || '7d';
export const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || 'http://localhost:5173';
