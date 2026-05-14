import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone: string;
  name: string;
  password: string;
  avatar: string;
  bio: string;
  note: string;          
  noteExpiresAt: Date | null; 
  contacts: mongoose.Types.ObjectId[];
  nicknames: Map<string, string>; 
  chatThemes: Map<string, string>; // চ্যাট স্পেসিফিক থিমের জন্য
  globalTheme: string; // গ্লোবাল থিমের জন্য
  role: "user" | "admin";
  status: "pending" | "approved" | "banned";
  securityQuestion: string;
  securityAnswer: string;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "Available on Zenex" },
    note: { type: String, default: "" },
    noteExpiresAt: { type: Date, default: null },
    contacts: [{ type: Schema.Types.ObjectId, ref: "User" }],
    nicknames: { type: Map, of: String, default: {} }, 
    chatThemes: { type: Map, of: String, default: {} },
    globalTheme: { type: String, default: "theme-default" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["pending", "approved", "banned"], default: "pending" },
    securityQuestion: { type: String, required: true },
    securityAnswer: { type: String, required: true },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

// Drop index if needed safely
if (mongoose.models.User && mongoose.models.User.collection) {
  mongoose.models.User.collection.dropIndex("email_1").catch(() => {});
}

// Optimized for Next.js Hot Reloading
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;