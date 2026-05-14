import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { senderId, receiverId } = await req.json();

    // যে মেসেজগুলো receiverId পাঠিয়েছে এবং আমি (senderId) ওপেন করেছি, সেগুলো Seen হবে
    await Message.updateMany(
      { sender: senderId, receiver: receiverId, isRead: false },
      { $set: { isRead: true, status: "seen" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}