import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    await connectDB();
    const { contactPhone } = await req.json();

    if (!contactPhone) {
      return NextResponse.json({ error: "Contact phone number is required" }, { status: 400 });
    }

    // কুকি থেকে লগইন করা ইউজারের (নিজের) টোকেন বের করা
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // টোকেন ডিকোড করে নিজের ID বের করা
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const myId = decoded.id;

    // চেক করা: নিজের নাম্বারই সার্চ করেছে কি না
    const me = await User.findById(myId);
    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    if (me.phone === contactPhone) {
      return NextResponse.json({ error: "You cannot add yourself to contacts" }, { status: 400 });
    }

    // ডাটাবেসে ওই নাম্বারের কোনো ইউজার আছে কি না খোঁজা
    const contactUser = await User.findOne({ phone: contactPhone });
    if (!contactUser) {
      return NextResponse.json({ error: "No user found with this phone number" }, { status: 404 });
    }

    // ইউজার অ্যাপ্রুভড কি না চেক করা
    if (contactUser.status !== "approved") {
      return NextResponse.json({ error: "This user is not active yet" }, { status: 400 });
    }

    // আগেই কন্টাক্ট লিস্টে আছে কি না চেক করা
    if (me.contacts.includes(contactUser._id)) {
      return NextResponse.json({ error: "User is already in your contacts" }, { status: 400 });
    }

    // সব ঠিক থাকলে নিজের কন্টাক্ট লিস্টে ওই ইউজারের ID অ্যাড করা
    me.contacts.push(contactUser._id);
    await me.save();

    return NextResponse.json({ 
      message: "Contact added successfully!", 
      contact: { name: contactUser.name, phone: contactUser.phone, avatar: contactUser.avatar, bio: contactUser.bio } 
    }, { status: 200 });

  } catch (error) {
    console.log("Add Contact Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}