import mongoose from 'mongoose';
const { Schema } = mongoose;

const deletedPostSchema = new Schema(
  {
    postId:   { type: Schema.Types.ObjectId, required: true, index: true },
    title:    { type: String, default: '' },
    deletedBy:{ type: Schema.Types.ObjectId, ref: 'User' }, // แอดมิน
    reason:   { type: String, default: '' },
  },
  { timestamps: true, collection: 'DeletedPosts' }
);

export const DeletedPost = mongoose.model('DeletedPost', deletedPostSchema);
