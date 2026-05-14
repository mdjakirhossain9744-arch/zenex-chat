import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import Message from "../../../models/Message";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const myId = decoded.id;

    const { searchParams } = new URL(req.url);
    const receiverId = searchParams.get("userId");
    if (!receiverId) return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 });

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: receiverId },
        { sender: receiverId, receiver: myId },
      ],
    }).sort({ createdAt: 1 });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) { 
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); 
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const senderId = decoded.id;

    const { receiver, text, imageUrl, replyTo, createdAt } = await req.json();

    if (!receiver || (!text && !imageUrl)) {
      return NextResponse.json({ error: "Message data is incomplete" }, { status: 400 });
    }

    // Default status: 'sent' and isRead: false for accurate DB state
    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiver,
      text: text || "",
      imageUrl: imageUrl || "",
      replyTo: replyTo || null,
      isRead: false,
      status: "sent",
      createdAt: createdAt || new Date(),
    });

    return NextResponse.json({ message: "Message sent", data: newMessage }, { status: 201 });
  } catch (error) { 
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); 
  }
}