"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import axios from "axios";

const activityRows = [
  { label: "Orders", value: "42", tone: "bg-emerald-500" },
  { label: "Prep avg", value: "18m", tone: "bg-sky-500" },
  { label: "Live menu", value: "96%", tone: "bg-amber-500" },
];

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const greeting = useMemo(() => getGreeting(), []);

  const redirectTo = searchParams?.get("redirect") || "/admin/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/admin/login", { email, password, remember });

      if (response.status !== 200) {
        setError(response.data?.message || "Could not sign in. Check your credentials.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Could not sign in. Check your credentials.");
      } else {
        setError("Could not sign in. Check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f3ec] text-[#171412]">
      <div className="admin-login-grid absolute inset-0" />
      <div className="admin-login-sweep absolute inset-0" />

      <section className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="hidden min-h-screen items-center justify-center px-10 py-10 lg:flex">
          <div className="relative w-full max-w-155 animate-login-rise">
            <div className="absolute -left-6 top-10 h-32 w-2 rounded-full bg-[#d9462b]" />
            <div className="rounded-xl border border-[#241c171a] bg-[#fffaf2]/82 p-5 shadow-[0_30px_90px_rgba(39,25,12,0.16)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[#241c1714] pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#171412] text-white shadow-lg">
                    <Utensils className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#171412]">FoodBot Control</p>
                    <p className="text-xs text-[#6d6257]">Kitchen operations console</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                  Online
                </div>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-3">
                {activityRows.map((row, index) => (
                  <div
                    key={row.label}
                    className="animate-login-card rounded-xl border border-[#241c1714] bg-white/78 p-4 shadow-sm"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className={`mb-4 h-1.5 w-9 rounded-full ${row.tone}`} />
                    <p className="text-xs font-medium text-[#75685d]">{row.label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-normal text-[#171412]">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#241c1714] bg-[#171412] p-5 text-white">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/86">Service pulse</p>
                  <Sparkles className="size-4 text-[#f6bd55]" />
                </div>
                <div className="space-y-3">
                  {[78, 54, 88, 64].map((width, index) => (
                    <div key={width} className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="admin-login-meter h-full rounded-full bg-[#f6bd55]"
                        style={{ width: `${width}%`, animationDelay: `${index * 160}ms` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-110 animate-login-rise">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#171412] text-white shadow-lg lg:hidden">
                  <Utensils className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171412]">FoodBot</p>
                  <p className="text-xs text-[#6d6257]">{greeting}</p>
                </div>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border border-[#241c171a] bg-white/70">
                <ShieldCheck className="size-5 text-[#d9462b]" />
              </div>
            </div>

            <div className="rounded-xl border border-[#241c171a] bg-white/86 p-5 shadow-[0_22px_70px_rgba(39,25,12,0.14)] backdrop-blur-xl sm:p-7">
              <div className="mb-7">
                <h1 className="text-3xl font-semibold tracking-normal text-[#171412] sm:text-4xl">
                  Admin sign in
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#6d6257]">
                  Access orders, inventory, settings, and restaurant operations.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#342b25]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7c6e]" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@restaurant.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 rounded-xl border-[#d8cec1] bg-[#fffaf2] pl-10 text-[#171412] placeholder:text-[#a2968a] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#342b25]">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7c6e]" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 rounded-xl border-[#d8cec1] bg-[#fffaf2] pl-10 pr-11 text-[#171412] placeholder:text-[#a2968a] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7d7064] transition hover:bg-[#efe5d8] hover:text-[#171412] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#d9462b]/20"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-sm text-[#6d6257] sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="size-4 rounded border-[#cfc3b4] accent-[#d9462b]"
                    />
                    Keep me signed in
                  </label>
                  <a className="font-medium text-[#b93a24] transition hover:text-[#8f2b1b]" href="mailto:support@foodbot.local">
                    Need access?
                  </a>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
