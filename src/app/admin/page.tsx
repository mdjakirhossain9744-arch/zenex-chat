"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle, Ban, Loader2, Users, Phone, Trash2, Link as LinkIcon, Copy } from "lucide-react";

type User = {
  _id: string;
  name: string;
  phone: string;
  status: "pending" | "approved" | "banned";
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: newStatus as any } : u)));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to completely delete this user?")) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateLink = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedLink(data.link);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert("Link Copied to Clipboard!");
      setGeneratedLink(null); // কপি করার পর বক্সটা লুকিয়ে ফেলবে
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-neutral-400 text-sm mt-1">Manage users, delete demos, and generate access links.</p>
          </div>
        </div>

        {/* Link Show Box */}
        {generatedLink && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
            <p className="text-sm font-medium text-blue-400 truncate mr-4">{generatedLink}</p>
            <button onClick={copyToClipboard} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-500">
              <Copy className="w-4 h-4" /> Copy Link
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p className="text-neutral-500 font-medium">Decrypting secure database...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user) => (
              <div key={user._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl gap-4">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#121212] border border-white/[0.08] rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{user.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-400 mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> <span>{user.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                  
                  <div className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${
                    user.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    user.status === "banned" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  }`}>
                    {user.status}
                  </div>

                  <div className="flex gap-2">
                    {/* Approve Button */}
                    {user.status !== "approved" && (
                      <button onClick={() => handleStatusChange(user._id, "approved")} className="w-10 h-10 flex justify-center items-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Approve">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {/* Ban Button */}
                    {user.status !== "banned" && (
                      <button onClick={() => handleStatusChange(user._id, "banned")} className="w-10 h-10 flex justify-center items-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Ban">
                        <Ban className="w-5 h-5" />
                      </button>
                    )}
                    {/* Generate Link Button */}
                    <button onClick={() => handleGenerateLink(user._id)} className="w-10 h-10 flex justify-center items-center bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all" title="Generate Reset Link">
                      <LinkIcon className="w-5 h-5" />
                    </button>
                    {/* Delete Button */}
                    <button onClick={() => handleDelete(user._id)} className="w-10 h-10 flex justify-center items-center bg-neutral-800 text-neutral-400 hover:bg-red-600 hover:text-white rounded-xl transition-all" title="Delete User Completely">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}