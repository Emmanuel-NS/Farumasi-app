"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { Eye, EyeOff, User, Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

type Tab = "login" | "register";
type Role = "patient" | "pharmacist";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("patient@farumasi.com");
  const [password, setPassword] = useState("Patient@12345");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "pharmacist") {
      router.push("http://localhost:3003");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { toast.error("Please enter your full name"); return; }
        await register({ full_name: name, email, password, phone: phone || undefined });
      }
      router.push("/store");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? (tab === "login" ? "Invalid email or password" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-farumasi-600 via-farumasi-700 to-farumasi-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20">
            <FarumasiLogo size={36} onDark />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-wide">FARUMASI</h1>
            <p className="text-white/70 text-sm mt-0.5">Your healthcare companion</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Role selector */}
          <div className="flex gap-3 mb-6">
            {([
              { value: "patient", label: "I'm a Patient", icon: User },
              { value: "pharmacist", label: "I'm a Pharmacist", icon: Briefcase },
            ] as { value: Role; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setRole(value)}
                className={`flex-1 flex items-center gap-2 justify-center py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                  role === value
                    ? "border-farumasi-600 bg-farumasi-50 text-farumasi-700"
                    : "border-slate-200 text-slate-500 hover:border-farumasi-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Amina Uwase"
                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/40 focus:border-farumasi-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 788 000 000"
                    className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/40 focus:border-farumasi-500 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/40 focus:border-farumasi-500 transition-all"
              />
              {tab === "login" && (
                <p className="text-[11px] text-slate-400 mt-1">Demo: patient@farumasi.com / Patient@12345</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/40 focus:border-farumasi-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {tab === "login" && (
                <div className="flex justify-end mt-1.5">
                  <Link href="#" className="text-xs text-farumasi-600 font-medium hover:underline">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold text-sm transition-colors mt-2"
            >
              {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            By continuing you agree to our{" "}
            <Link href="#" className="text-farumasi-600 font-medium hover:underline">Terms of Service</Link>{" "}
            and{" "}
            <Link href="#" className="text-farumasi-600 font-medium hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} Farumasi Ltd. · Kigali, Rwanda
        </p>
      </div>
    </div>
  );
}
