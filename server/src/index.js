// server/src/index.js  (ESM)
import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import http from 'http'; // ⭐ เพิ่ม
import { Server } from 'socket.io'; // ⭐ เพิ่ม
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { connectDB } from './db.js';

// routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import postsRoutes from './routes/posts.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';
import notificationsRoutes from './routes/notifications.js';

// middleware
import { auth, isAdmin } from './middleware/auth.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⭐ สร้าง http server
const server = http.createServer(app);

// ⭐ สร้าง socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  },
});

// ⭐ ให้ route ใช้ io ได้
app.set('io', io);

// ⭐ socket logic
io.on('connection', (socket) => {
  console.log('🔌 user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log('👤 join room:', userId);
  });

  socket.on('disconnect', () => {
    console.log('❌ user disconnected');
  });
});

// ===== เตรียมโฟลเดอร์อัปโหลด =====
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const avatarsDir = path.join(uploadsRoot, 'avatars');
const imagesDir = path.join(uploadsRoot, 'images');
fs.mkdirSync(uploadsRoot, { recursive: true });
fs.mkdirSync(avatarsDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

app.disable('x-powered-by');

// ===== CORS =====
const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: false,
  })
);

// ===== Parsers =====
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Static uploads =====
app.use(
  '/uploads',
  express.static(uploadsRoot, {
    etag: true,
    lastModified: true,
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
    },
  })
);

// ===== Logger =====
app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

// ===== Health =====
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health/db', (_req, res) => {
  res.json({ ok: mongoose.connection.readyState === 1, state: mongoose.connection.readyState });
});

// ===== Guard DB =====
function requireDbReady(_req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ message: 'Database not ready' });
}

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);

// ⭐ notification
app.use('/api/notifications', auth, notificationsRoutes);

app.use('/api/uploads', requireDbReady, uploadRoutes);

// ===== Admin =====
const adminGuard = (req, res, next) => {
  if (req.path === '/login') return next();
  return auth(req, res, (err) => {
    if (err) return next(err);
    return isAdmin(req, res, next);
  });
};

app.use('/api/admin', adminGuard, adminRoutes);

// ===== 404 =====
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ===== Error handler =====
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ message: err.message });
  }
  console.error('Express Error:', err);
  return res.status(500).json({ message: 'Internal Server Error' });
});

// ===== Process errors =====
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

// ===== Start =====
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});