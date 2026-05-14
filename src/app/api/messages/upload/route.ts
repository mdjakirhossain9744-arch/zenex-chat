import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("zenex_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const myId = decoded.id;

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) return NextResponse.json({ error: "No image file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `chat-${myId}-${uniqueSuffix}${path.extname(file.name)}`;
    
    // ছবিগুলো public/uploads/attachments ফোল্ডারে সেভ হবে
    const uploadDir = path.join(process.cwd(), "public/uploads/attachments");
    
    try { await mkdir(uploadDir, { recursive: true }); } catch (err) {}

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/attachments/${filename}`;

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}