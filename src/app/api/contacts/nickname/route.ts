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
    const { contactId, nickname } = await req.json();

    const me = await User.findById(decoded.id);
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Nickname সেট করা হচ্ছে
    if (!me.nicknames) me.nicknames = new Map();
    me.nicknames.set(contactId, nickname);
    await me.save();

    return NextResponse.json({ message: "Nickname updated" }, { status: 200 });
  } catch (error) { return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); }
}