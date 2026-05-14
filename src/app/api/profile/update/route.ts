import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    await connectDB();
    
    // কুকি থেকে টোকেন বের করে ইউজার ভেরিফাই করা
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const myId = decoded.id;

    // ফর্ম ডেটা (ছবি এবং টেক্সট) রিসিভ করা
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const file = formData.get("avatar") as File | null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await User.findById(myId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.name = name;
    if (bio) user.bio = bio;

    // যদি ইউজার নতুন ছবি আপলোড করে
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // ছবির নাম ইউনিক করার জন্য সময় যুক্ত করা হলো
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `avatar-${myId}-${uniqueSuffix}${path.extname(file.name)}`;
      
      // ফোল্ডারের লোকেশন (public/uploads/avatars)
      const uploadDir = path.join(process.cwd(), "public/uploads/avatars");
      
      // ফোল্ডার না থাকলে তৈরি করে নেবে
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {}

      // ছবি সেভ করা
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      // ডাটাবেসে শুধু ছবির লিংক সেভ করে রাখা
      user.avatar = `/uploads/avatars/${filename}`;
    }

    await user.save();

    return NextResponse.json({ 
      message: "Profile updated successfully", 
      user: { name: user.name, bio: user.bio, avatar: user.avatar } 
    }, { status: 200 });

  } catch (error) {
    console.log("Profile Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}