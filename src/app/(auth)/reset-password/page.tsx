"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldAlert, CheckCircle, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react"; // Next.js 15 এ searchParams ব্যবহারের জন্য এটি লাগে

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // লিংক থেকে টোকেনটি বের করা

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // লিংকটিতে টোকেন না থাকলে প্রথমেই এরর দেখাবে
  useEffect(() => {
    if (!token) {
      setError("Invalid Security Token! Request a new link from Admin.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true); setError(""); setSuccess("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      
      setSuccess(data.message);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#0a0a0a] border border-white/[0.08] rounded-[24px] shadow-[0_0_80px_-20px_rgba(59,130,246,0.15)] z-10 relative">
      
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-14 h-14 bg-[#111] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5 shadow-inner">
          <Lock className="w-7 h-7 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tighter text-white">New Password</h1>
        <p className="text-neutral-500 mt-2 text-sm font-medium tracking-wide uppercase text-center">Admin Verified Link</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <p className="text-sm font-medium text-red-400">{error}</p>
          <Link href="/login" className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold">Go to Login</Link>
        </div>
      ) : success ? (
        <div className="flex flex-col items-center gap-3 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-400">{success}</p>
          <p className="text-xs text-neutral-500 mt-1">Redirecting...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Enter New Password</label>
            <input 
              type="password" required 
              className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-blue-500/50 text-white" 
              placeholder="••••••••" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
          </div>

          <button type="submit" disabled={loading} className="group w-full py-3.5 px-4 mt-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Update Password <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>
      )}
    </div>
  );
}

// Next.js 15 এ useSearchParams ব্যবহার করলে পুরো কম্পোনেন্টটি Suspense এর ভেতর রাখতে হয়
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden p-4 font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <Suspense fallback={<div className="text-white"><Loader2 className="animate-spin w-8 h-8" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}