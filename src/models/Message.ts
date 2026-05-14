import mongoose, { Schema, Document } from "mongoose";

export interface IReaction {
  userId: string;
  emoji: string;
}

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  text: string;
  imageUrl: string; 
  isRead: boolean;  
  status: "sending" | "sent" | "seen" | "failed"; 
  reactions: IReaction[]; 
  isDeleted: boolean; 
  deletedBy: string[]; 
  replyTo?: { messageId: string; text: string; senderName: string }; 
  isPinned: boolean; // For Pinning
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ["sending", "sent", "seen", "failed"], default: "sent" },
    reactions: { type: [{ userId: String, emoji: String }], default: [] },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: [String], default: [] },
    replyTo: { type: Object, default: null },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Optimized for Next.js Hot Reloading
const Message = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
export default Message;