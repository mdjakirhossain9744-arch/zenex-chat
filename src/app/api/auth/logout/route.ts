import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });
    
    // ব্যাকএন্ড থেকে কুকি সম্পূর্ণ ক্লিয়ার করে দেওয়া হচ্ছে
    response.cookies.set("zenex_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0), // ডেট 0 করে দিলে কুকি ডিলিট হয়ে যায়
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}