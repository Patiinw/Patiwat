import mongoose from 'mongoose';
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // ผู้รับ
    type:      { type: String, enum: ['post_deleted', 'system', 'warning', 'message'],default: 'system'},
    title:     { type: String, trim: true },        // ชื่อ/หัวข้อสำหรับแสดง
    message:   { type: String, trim: true },        // ข้อความสั้น ๆ
    meta:      { type: Object, default: {} },       // ข้อมูลประกอบ เช่น { postId, postTitle, deletedBy }
    read:      { type: Boolean, default: false },   // อ่านแล้วหรือยัง
  },
  { timestamps: true, collection: 'Notifications' }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
