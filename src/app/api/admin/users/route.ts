import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import crypto from "crypto"; // সিকিউর টোকেন বানানোর জন্য

// 1. GET: সব ইউজারকে আনা
export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// 2. PATCH: স্ট্যাটাস (Approve/Ban) আপডেট করা
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { userId, status } = await req.json();
    const updatedUser = await User.findByIdAndUpdate(userId, { status }, { new: true }).select("-password");
    return NextResponse.json({ message: `User ${status}!`, user: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// 3. POST: Reset Link জেনারেট করা
export async function POST(req: Request) {
  try {
    await connectDB();
    const { userId } = await req.json();
    
    // একটি সিকিউর ওয়ান-টাইম টোকেন তৈরি করা হচ্ছে
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // ২৪ ঘন্টা মেয়াদ
    
    await User.findByIdAndUpdate(userId, { resetToken: token, resetTokenExpiry: expiry });

    // লিংক তৈরি (পরে VPS এ গেলে localhost এর জায়গায় আপনার ডোমেইন বসবে)
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    
    return NextResponse.json({ link: resetLink }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }
}

// 4. DELETE: ডেমো ইউজার ডিলিট করা
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}