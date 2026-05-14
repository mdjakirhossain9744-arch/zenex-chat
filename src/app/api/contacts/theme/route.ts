import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = (await cookieStore).get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const { contactId, theme } = await req.json();

    // Update Theme for Current User (Using Map)
    const myThemeKey = `chatThemes.${contactId}`;
    await User.updateOne({ _id: decoded.id }, { $set: { [myThemeKey]: theme } });

    // Update Theme for the Other User (Using Map)
    const contactThemeKey = `chatThemes.${decoded.id}`;
    await User.updateOne({ _id: contactId }, { $set: { [contactThemeKey]: theme } });

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update theme" }, { status: 500 });
  }
}