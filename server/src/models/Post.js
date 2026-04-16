// server/src/models/Post.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// หมวดหมู่สลัด (คงเดิม)
export const SALAD_CATEGORIES = [
  'กรีนโอ๊ค','เรดโอ๊ค','บัตเตอร์เฮด','คอส/โรมานี',
  'กรีนคอรัล','เรดคอรัล','ฟิลเลย์','บัตเตอร์เฮดเรด',
  'มิกซ์สลัด','ไฮโดรโปนิกส์','อินทรีย์','อื่นๆ'
];

// ✅ เหตุผลการรายงานแบบ "code" ให้ตรงกับฝั่ง routes
export const COMMENT_REASON_CODES = [
  'spam',          // สแปม
  'abuse',         // คำหยาบคาย/ดูหมิ่น
  'inappropriate', // เนื้อหาไม่เหมาะสม
  'ads',           // โฆษณา/เชิญชวน
  'illegal',       // ผิดกฎหมาย
  'other'          // อื่นๆ
];

const CommentReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason:   { type: String, enum: COMMENT_REASON_CODES, required: true }, // <-- เก็บเป็น code
    note:     { type: String, trim: true, maxlength: 500, default: '' },
    createdAt:{ type: Date, default: Date.now },
  },
  { _id: false }
);

const CommentSchema = new Schema(
  {
    author:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body:      { type: String, required: true, trim: true, maxlength: 2000 },
    reports:   { type: [CommentReportSchema], default: [] }, // ✅ รองรับการรายงาน
  },
  { timestamps: true }
);

const PostSchema = new Schema(
  {
    title:     { type: String, required: true, trim: true, maxlength: 120 },
    body:      { type: String, required: true, trim: true, maxlength: 10000 },
    author:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category:  { type: String, enum: SALAD_CATEGORIES, required: true },
    tags:      [{ type: String, trim: true, lowercase: true }],
    images:    [{type: mongoose.Schema.Types.ObjectId, ref: "Image" }],
    likes:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    views:     { type: Number, default: 0 },
    isPinned:  { type: Boolean, default: false },
    comments:  { type: [CommentSchema], default: [] },
  },
  { timestamps: true, collection: 'Posts' }
);

// indexes
PostSchema.index({ title: 'text', body: 'text' });
PostSchema.index({ tags: 1 });
PostSchema.index({ category: 1 });

export const Post = model('Post', PostSchema);
export default Post;
