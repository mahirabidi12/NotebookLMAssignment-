import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    pageNumber: { type: Number, default: 1 },
    chunkIndex: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Chunk", chunkSchema);
