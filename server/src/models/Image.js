import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
{
  url: {
    type: String,
    required: true
  },

  filename: {
    type: String
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },

  caption: {
    type: String
  },

  size: {
    type: Number
  },

  mimetype: {
    type: String
  }
},
{ timestamps: true }
);

export default mongoose.model("Image", ImageSchema);