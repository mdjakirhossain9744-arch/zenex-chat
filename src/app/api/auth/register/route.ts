import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const body = await req.json();
    console.log("📩 Received Registration Data:", body); // টার্মিনালে ডেটা প্রিন্ট করবে

    const { name, phone, password, securityQuestion, securityAnswer } = body;

    // কোনো ডেটা মিসিং আছে কি না চেক করা
    if (!name || !phone || !password || !securityQuestion || !securityAnswer) {
      console.log("❌ Error: Missing fields!");
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.log("❌ Error: Phone already exists!");
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const formattedAnswer = securityAnswer.trim().toLowerCase();
    const hashedAnswer = await bcrypt.hash(formattedAnswer, 10);

    // নতুন ইউজার তৈরি করা (বাকি ফিল্ডগুলো অটোমেটিক Default নিয়ে নেবে)
    const newUser = await User.create({ 
      name, 
      phone, 
      password: hashedPassword,
      securityQuestion,
      securityAnswer: hashedAnswer 
    });

    console.log("✅ User Registered Successfully:", newUser.phone);

    return NextResponse.json({ 
      message: "Registration successful! Please wait for Admin approval.", 
    }, { status: 201 });

  } catch (error: any) {
    // আসল এররটি টার্মিনালে লাল কালিতে দেখাবে
    console.log("🚨 Registration CRASH Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}