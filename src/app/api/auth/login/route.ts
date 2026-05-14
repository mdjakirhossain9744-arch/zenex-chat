import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    // সেফটি চেকার: .env ফাইলে চাবি না থাকলে সার্ভার আগেই বলে দেবে
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.log("Error: JWT_SECRET is missing in your .env file!");
      return NextResponse.json({ error: "Server Configuration Error: Secret key missing" }, { status: 500 });
    }

    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and Password are required" }, { status: 400 });
    }

    // ডাটাবেস থেকে ইউজার খোঁজা
    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "Account not found. Please register first." }, { status: 404 });
    }

    // পাসওয়ার্ড মেলানো
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // স্ট্যাটাস চেক করা
    if (user.status === "pending") {
      return NextResponse.json({ error: "Your account is pending Admin approval." }, { status: 403 });
    }
    if (user.status === "banned") {
      return NextResponse.json({ error: "Your account has been BANNED." }, { status: 403 });
    }

    // টোকেন তৈরি করা
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    // Next.js 15 এর এরর ফিক্স: Mongoose ডকুমেন্টকে Normal Object এ কনভার্ট করা
    const userData = user.toObject();
    delete userData.password; // পাসওয়ার্ড যেন ব্রাউজারে না যায় তাই মুছে দেওয়া হলো

    const response = NextResponse.json({ message: "Login successful", user: userData }, { status: 200 });
    
    // কুকি সেট করা
    response.cookies.set("zenex_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // ৭ দিনের মেয়াদ
      path: "/",
    });

    return response;

  } catch (error) {
    console.log("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}