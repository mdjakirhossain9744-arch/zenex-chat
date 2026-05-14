"use client";

import { useState } from "react";
import { Loader2, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // Step 1: Phone, Step 2: Answer & New Password
  
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: ফোন নম্বর দিয়ে প্রশ্ন আনা
  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_question", phone }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      
      setQuestion(data.question);
      setStep(2); // প্রশ্ন পেলে Step 2 তে চলে যাবে
    } catch (err: any) {
      setError(err.message || "Failed to find account");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: উত্তর দিয়ে পাসওয়ার্ড চেঞ্জ করা
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", phone, securityAnswer, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      
      setSuccess(data.message);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden p-4 font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#0a0a0a] border border-white/[0.08] rounded-[24px] shadow-[0_0_80px_-20px_rgba(249,115,22,0.15)] z-10 relative">
        
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-14 h-14 bg-[#111] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5 shadow-inner">
            <KeyRound className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Recover Access</h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium tracking-wide uppercase">Identity Verification</p>
        </div>

        {error && <div className="mb-6 p-4 text-sm font-medium text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-center">{error}</div>}
        {success && <div className="mb-6 p-4 text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">{success}</div>}

        {step === 1 ? (
          <form onSubmit={handleGetQuestion} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Registered Phone</label>
              <input type="tel" required className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-orange-500/50 text-white" placeholder="01700000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="group w-full py-3.5 px-4 mt-2 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Identity <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="p-4 bg-[#111] border border-white/[0.05] rounded-xl mb-2">
              <p className="text-xs text-orange-500 font-bold uppercase mb-1">Security Question</p>
              <p className="text-sm text-white font-medium">{question}</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Your Answer</label>
              <input type="text" required className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-orange-500/50 text-white" placeholder="Secret Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">New Password</label>
              <input type="password" required className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-orange-500/50 text-white" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="group w-full py-3.5 px-4 mt-2 bg-orange-600 text-white hover:bg-orange-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full py-2 text-sm text-neutral-500 hover:text-white flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm text-neutral-500 hover:text-white transition-colors font-medium">Return to Login</Link>
        </div>
      </div>
    </main>
  );
}