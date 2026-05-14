import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { action, phone, securityAnswer, newPassword } = body;

    // কাজ ১: ইউজারের সিকিউরিটি প্রশ্ন খুঁজে আনা
    if (action === "get_question") {
      if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });
      
      const user = await User.findOne({ phone });
      if (!user) return NextResponse.json({ error: "No account found with this number" }, { status: 404 });
      
      return NextResponse.json({ question: user.securityQuestion }, { status: 200 });
    }

    // কাজ ২: উত্তর মিলিয়ে নতুন পাসওয়ার্ড সেভ করা
    if (action === "reset_password") {
      if (!phone || !securityAnswer || !newPassword) {
        return NextResponse.json({ error: "All fields are required" }, { status: 400 });
      }

      const user = await User.findOne({ phone });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // ইউজারের দেওয়া উত্তর ছোট হাতের করে ডাটাবেসের এনক্রিপ্ট করা উত্তরের সাথে মেলানো
      const formattedAnswer = securityAnswer.trim().toLowerCase();
      const isAnswerCorrect = await bcrypt.compare(formattedAnswer, user.securityAnswer);
      
      if (!isAnswerCorrect) {
        return NextResponse.json({ error: "Incorrect security answer!" }, { status: 401 });
      }

      // উত্তর সঠিক হলে নতুন পাসওয়ার্ড এনক্রিপ্ট করে সেভ করা
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      return NextResponse.json({ message: "Password reset successful! You can now login." }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.log("Forgot Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}