"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, MapPin, Phone, User, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import axios from "axios";

interface AuthClientProps {
  restaurantName: string;
  tagline: string;
  phone: string;
  address: string;
}

type AuthMode = "login" | "signup";

export default function AuthClient({
  restaurantName,
  tagline,
  phone,
  address,
}: AuthClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/menu";
  const initialMode = (searchParams.get("mode") as AuthMode) ?? "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const validate = (): string | null => {
    if (!isLogin && name.trim().length < 2) return "Name must be at least 2 characters";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address";
    if (!/^[0-9]{10,15}$/.test(phoneNumber.trim())) return "Enter a valid phone number (10-15 digits)";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorCode("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/send-otp", {
        mode,
        ...(mode === "signup" ? { name: name.trim() } : {}),
        email: email.trim(),
        phone: phoneNumber.trim(),
      });

      const params = new URLSearchParams({
        email: email.trim(),
        mode,
        redirect,
        ...(mode === "signup" ? { name: name.trim(), phone: phoneNumber.trim() } : {}),
      });
      router.push(`/auth/verify?${params.toString()}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Something went wrong");
        setErrorCode(err.response?.data?.code || "");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setErrorCode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-amber-50 via-orange-50/40 to-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.03)_1px,transparent_0)] bg-size-[24px_24px]" />
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-linear-to-br from-amber-200/30 to-orange-200/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-linear-to-br from-emerald-200/20 to-teal-100/10 blur-3xl" />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
              <Utensils className="size-8 " />
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              {restaurantName}
            </h1>

            {tagline && (
              <p className="mt-2 text-base text-zinc-500">{tagline}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
              {phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {phone}
                </span>
              )}
              {address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {address}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm sm:p-8">
            {/* Mode Tabs */}
            <div className="mb-6 flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  isLogin
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  !isLogin
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Sign Up
              </button>
            </div>

            <p className="text-center text-sm font-medium text-zinc-600">
              {isLogin
                ? "Log in with your email to continue"
                : "Create an account to get started"}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="name"
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="10-digit phone number"
                    className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <p>{error}</p>
                  {errorCode === "NO_ACCOUNT" && (
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="mt-1 font-semibold text-amber-600 underline underline-offset-2 hover:text-amber-700"
                    >
                      Sign up instead
                    </button>
                  )}
                  {errorCode === "ACCOUNT_EXISTS" && (
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="mt-1 font-semibold text-amber-600 underline underline-offset-2 hover:text-amber-700"
                    >
                      Log in instead
                    </button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-600/30 active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? "Sending code..."
                  : isLogin
                    ? "Send Login Code"
                    : "Send Verification Code"}
                {!loading && <ArrowRight className="size-4" />}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            We&apos;ll send a one-time code to your email for verification
          </p>
        </div>
      </main>
    </div>
  );
}
