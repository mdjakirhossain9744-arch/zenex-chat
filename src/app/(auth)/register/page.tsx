"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "", 
    password: "",
    securityQuestion: "What is your childhood nickname?", // Default question
    securityAnswer: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // কিছু সিকিউরিটি প্রশ্ন
  const questions = [
    "What is your childhood nickname?",
    "What is the name of your favorite teacher?",
    "In what city were you born?",
    "What is your favorite movie?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setSuccess(data.message);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch (err) {
      setError("Connection error! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden p-4 font-sans py-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[450px] p-8 sm:p-10 bg-[#0a0a0a] border border-white/[0.08] rounded-[24px] shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)] z-10">
        
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-14 h-14 bg-[#111] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Join Zenex</h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium tracking-wide uppercase">Create Secure Identity</p>
        </div>

        {error && <div className="mb-6 p-4 text-sm font-medium text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-center">{error}</div>}
        {success && <div className="mb-6 p-4 text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Full Name</label>
            <input type="text" required className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-emerald-500/50 text-white"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Phone Number</label>
            <input type="tel" required className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-emerald-500/50 text-white"
              value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Secure Password</label>
            <input type="password" required className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-emerald-500/50 text-white"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>

          {/* Security Question Section */}
          <div className="p-4 mt-2 bg-[#111] border border-white/[0.05] rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-500 uppercase tracking-wider ml-1">Security Question (For Recovery)</label>
              <select 
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/[0.05] rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm appearance-none"
                value={formData.securityQuestion}
                onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
              >
                {questions.map((q, i) => <option key={i} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <input type="text" required className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/[0.05] rounded-xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-neutral-600"
                placeholder="Secret Answer" value={formData.securityAnswer} onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="group w-full py-3.5 px-4 mt-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Request <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">Already registered? <Link href="/login" className="text-white font-semibold hover:text-emerald-400">Log In</Link></p>
        </div>
      </div>
    </main>
  );
}