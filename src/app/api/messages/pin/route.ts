import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { messageId, isPinned, chatId } = await req.json();
    if (isPinned) {
      // Unpin all other messages in this chat first
      await Message.updateMany({ $or: [{ sender: chatId }, { receiver: chatId }] }, { isPinned: false });
    }
    await Message.findByIdAndUpdate(messageId, { isPinned });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}