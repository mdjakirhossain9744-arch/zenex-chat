import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // ইউজারের ব্রাউজার থেকে টোকেন (Cookie) বের করা হচ্ছে
  const token = request.cookies.get('zenex_token')?.value || '';

  // যে পেজগুলোতে লগইন ছাড়া ঢোকা যাবে
  const isPublicPath = path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password';

  // টোকেন না থাকলে পাবলিক পেজ বাদে অন্য কোথাও ঢুকতে দেবে না
  if (!token && !isPublicPath && path !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // যদি টোকেন থাকে (ইউজার লগইন করা থাকে)
  if (token) {
    try {
      // টোকেনটিকে ডিকোড (Decode) করে ইউজারের Role বের করা হচ্ছে
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload); // এখানে ইউজারের id এবং role আছে

      // লগইন করা ইউজার যদি আবার লগইন/রেজিস্টার পেজে যেতে চায়, তাকে চ্যাটে পাঠিয়ে দেবে
      if (isPublicPath || path === '/') {
         return NextResponse.redirect(new URL('/chat', request.url));
      }

      // 🚨 সবচেয়ে জরুরি: অ্যাডমিন পেজের সিকিউরিটি 🚨
      // যদি কেউ /admin এ ঢুকতে চায়, কিন্তু তার role 'admin' না হয়, তবে তাকে চ্যাটে পাঠিয়ে দেবে!
      if (path.startsWith('/admin') && decoded.role !== 'admin') {
         return NextResponse.redirect(new URL('/chat', request.url));
      }

    } catch (error) {
      // টোকেন যদি টেম্পারড বা ভুল হয়, তবে লগইন পেজে পাঠিয়ে দেবে
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
}

// এই দারোয়ান কোন কোন পেজে ডিউটি করবে, তার লিস্ট
export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/chat/:path*',
    '/admin/:path*'
  ]
}