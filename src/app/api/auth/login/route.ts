import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    await connectDB();
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "Please provide phone and password" }, { status: 400 });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "pending") {
      return NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 });
    }
    if (user.status === "banned") {
      return NextResponse.json({ error: "Your account has been banned." }, { status: 403 });
    }

    // Token তৈরি করা
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    // কুকি সেট করা (FIXED for VPS Production / Reverse Proxy)
    const cookieStore = await cookies();
    cookieStore.set("zenex_token", token, {
      httpOnly: true,
      secure: true, // HTTPS এর জন্য ট্রু করা হলো
      sameSite: "lax", // রিভার্স প্রক্সির জন্য lax সবচেয়ে নিরাপদ
      path: "/", // পুরো ওয়েবসাইটের জন্য 
      maxAge: 7 * 24 * 60 * 60, // 7 Days
    });

    return NextResponse.json({ message: "Login successful", user: { id: user._id, name: user.name, role: user.role } }, { status: 200 });
    
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}