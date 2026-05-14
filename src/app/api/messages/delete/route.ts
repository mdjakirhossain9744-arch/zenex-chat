import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { messageId, type, userId } = await req.json();
    if (type === "everyone") {
      await Message.findByIdAndUpdate(messageId, { isDeleted: true, text: "", imageUrl: "" });
    } else {
      await Message.findByIdAndUpdate(messageId, { $push: { deletedBy: userId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}