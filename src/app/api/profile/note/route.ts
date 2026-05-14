import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { note } = await req.json();

    const user = await User.findById(decoded.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Note সেট করা এবং ২৪ ঘন্টার মেয়াদ (Expiry) যুক্ত করা
    user.note = note;
    if (note) {
      user.noteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // বর্তমান সময় + ২৪ ঘণ্টা
    } else {
      user.noteExpiresAt = null; // নোট মুছে দিলে মেয়াদও মুছে যাবে
    }
    
    await user.save();

    return NextResponse.json({ message: "Note updated successfully", note: user.note }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}