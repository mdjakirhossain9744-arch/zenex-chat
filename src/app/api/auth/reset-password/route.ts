import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    const currentTime = new Date();

    // টোকেন চেক করা হচ্ছে
    const user = await User.findOne({ 
      resetToken: token, 
      resetTokenExpiry: { $gt: currentTime } 
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link!" }, { status: 400 });
    }

    // নতুন পাসওয়ার্ড এনক্রিপ্ট করা হচ্ছে
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // user.save() এর বদলে সরাসরি updateOne ব্যবহার করছি (যাতে পুরনো একাউন্টের ক্ষেত্রে এরর না আসে)
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          resetToken: null, // কাজ শেষ, তাই টোকেন মুছে দিচ্ছি
          resetTokenExpiry: null 
        } 
      }
    );

    return NextResponse.json({ message: "Password updated successfully!" }, { status: 200 });

  } catch (error) {
    console.log("Reset Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}