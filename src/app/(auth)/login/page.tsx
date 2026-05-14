"use client";

import { useState } from "react";
import { Loader2, Fingerprint, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
      } else {
        router.push("/chat");
      }
    } catch (err) {
      setError("Secure connection failed! Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden p-4 font-sans">
      {/* Background Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#0a0a0a] border border-white/[0.08] rounded-[24px] shadow-[0_0_80px_-20px_rgba(59,130,246,0.15)] z-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-14 h-14 bg-[#111] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-5 shadow-inner">
            <Fingerprint className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Zenex</h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium tracking-wide uppercase">Secure Authentication</p>
        </div>

        {error && (
          <div className="mb-6 p-4 text-sm font-medium text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Phone Number</label>
            <input 
              type="tel" 
              required
              className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-white placeholder:text-neutral-600 transition-all"
              placeholder="01700000000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-white placeholder:text-neutral-600 transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-1 pb-2">
            <Link href="/forgot-password" className="text-xs font-semibold text-neutral-500 hover:text-blue-400 transition-colors">
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="group w-full py-3.5 px-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Authenticate <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500">
            No access clearance? <Link href="/register" className="text-white font-semibold hover:text-blue-400 transition-colors">Request Access</Link>
          </p>
        </div>
      </div>
    </main>
  );
}