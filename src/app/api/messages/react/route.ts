import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { messageId, userId, emoji, isRemoved } = await req.json();
    if (isRemoved) {
      await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId } } });
    } else {
      await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId } } }); // Remove old if exists
      await Message.findByIdAndUpdate(messageId, { $push: { reactions: { userId, emoji } } }); // Add new
    }
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}