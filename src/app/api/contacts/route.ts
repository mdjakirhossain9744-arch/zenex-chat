import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Message from "@/models/Message";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const myId = decoded.id;

    // ১. কারেন্ট ইউজারকে তার সেভ করা কন্টাক্টসহ খুঁজে বের করা
    const currentUser = await User.findById(myId);
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ২. যাদের সাথে মেসেজ হয়েছে তাদের সবার লেটেস্ট মেসেজ বের করা (Advanced MongoDB Query)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(myId) },
            { receiver: new mongoose.Types.ObjectId(myId) }
          ],
          deletedBy: { $ne: myId } // আমি ডিলিট করেছি এমন মেসেজ বাদ
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", new mongoose.Types.ObjectId(myId)] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" }
        }
      }
    ]);

    // মেসেজ ডাটা ম্যাপে রাখা (সহজে খোঁজার জন্য)
    const lastMessageMap = new Map();
    conversations.forEach(conv => {
      lastMessageMap.set(conv._id.toString(), conv.lastMessage);
    });

    const chattedUserIds = conversations.map(c => c._id.toString());
    const savedContactIds = currentUser.contacts.map(id => id.toString());
    
    // ৩. সেভ করা কন্টাক্ট এবং মেসেজ করা ইউজারদের একসাথে করা (Unique ID List)
    const allRelevantUserIds = Array.from(new Set([...chattedUserIds, ...savedContactIds]));

    // ৪. ডাটাবেস থেকে সব ইউজারদের ইনফো একসাথে আনা
    const users = await User.find({ _id: { $in: allRelevantUserIds } });

    // ৫. প্রাইভেসি লজিক এবং ডাটা ফরম্যাট করা
    const formattedContacts = users.map(user => {
      const uIdStr = user._id.toString();
      
      const isContact = savedContactIds.includes(uIdStr); // আমি তাকে সেভ করেছি কিনা
      const hasMeAsContact = user.contacts.map((c: any) => c.toString()).includes(myId); // সে আমাকে সেভ করেছে কিনা
      
      // Mutual Privacy Logic (দুইজনেই সেভ করলে তবেই true হবে)
      const isMutual = isContact && hasMeAsContact;

      const nickname = currentUser.nicknames?.get(uIdStr) || "";
      const chatTheme = currentUser.chatThemes?.get(uIdStr) || "theme-default";
      const lastMsg = lastMessageMap.get(uIdStr) || null;

      return {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        // Mutual হলে আসল Bio, না হলে ডিফল্ট
        bio: isMutual ? user.bio : "Available on Zenex", 
        // Mutual হলে আসল Note, না হলে ফাঁকা
        note: isMutual ? user.note : "", 
        displayName: nickname || user.name,
        nickname: nickname,
        chatTheme: chatTheme,
        isContact: isContact, 
        lastMessage: lastMsg
      };
    });

    // ৬. শর্টিং লজিক (লেটেস্ট মেসেজ উপরে থাকবে)
    formattedContacts.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ contacts: formattedContacts });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}