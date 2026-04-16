// server/src/models/User.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },   // ไม่เลือกออกมาดีฟอลต์
    phone:    { type: String, required: true, trim: true },

    // โปรไฟล์
    avatarFileId: { type: Schema.Types.ObjectId, default: null }, // ไฟล์ใน GridFS (ถ้าใช้)
    avatarUrl:    { type: String, default: '' },                   // path หรือ URL สำหรับแสดงรูป

    // บทบาท
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  },
  {
    timestamps: true,
    collection: 'Register', // ใช้คอลเลกชันเดิมของโปรเจกต์

    // เวลาส่งออกเป็น JSON/Obj
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password; // กันหลุดหากถูก select มาแบบเฉพาะเจาะจง
        delete ret.__v;

        // ทำให้ avatarUrl เป็น path ที่ขึ้นต้นด้วย "/" ถ้าเป็น internal path
        if (typeof ret.avatarUrl === 'string') {
          const u = ret.avatarUrl.trim();
          if (u && !u.startsWith('http') && !u.startsWith('/')) {
            ret.avatarUrl = `/${u}`;
          }
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ---- Virtuals ----
// ใช้งานฝั่ง client ได้สะดวก (เช่น /api/users/me จะมี isAdmin กลับมา)
userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

// ---- Validations ----
userSchema.path('phone').validate(function (v) {
  return /^0\d{9}$/.test(String(v || '').trim());
}, 'เบอร์โทรศัพท์ไม่ถูกต้อง');

export const User = mongoose.model('User', userSchema);
