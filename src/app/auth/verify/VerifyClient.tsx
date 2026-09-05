"use client";

import Image from "next/image";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import axios from "axios";
import toast from "react-hot-toast";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface VerifyClientProps {
  restaurantName: string;
  logoUrl?: string | null;
}

export default function VerifyClient(_props: VerifyClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const name = params.get("name") ?? "";
  const phone = params.get("phone") ?? "";
  const mode = params.get("mode") ?? "login";
  const redirect = params.get("redirect") ?? "/menu";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Guards against the auto-submit effect re-firing after a successful verify
  // (the component is still mounted while the redirect navigates).
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!email) {
      router.replace("/auth");
    }
  }, [email, router]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const setDigit = useCallback((index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      const char = value.slice(-1);
      if (char && !/^[0-9]$/.test(char)) return;

      setDigit(index, char);
      setError("");

      if (char && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [setDigit],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          setDigit(index, "");
        } else if (index > 0) {
          setDigit(index - 1, "");
          inputRefs.current[index - 1]?.focus();
        }
        e.preventDefault();
      }

      if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, setDigit],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!pasted) return;

      const chars = pasted.split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, i) => {
          next[i] = ch;
        });
        return next;
      });

      const focusIndex = Math.min(chars.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      setError("");
    },
    [],
  );

  const handleVerify = useCallback(async () => {
    if (verifiedRef.current) return;

    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/api/auth/verify-otp", { email, otp, name, phone, mode });
      verifiedRef.current = true;
      toast.success("Verified! Redirecting...");
      router.push(redirect);
      return;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || "Incorrect code. Please try again."
        : "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
      // Clear the entered code so the auto-submit effect doesn't re-fire and
      // let the user try again immediately.
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [digits, email, name, phone, mode, redirect, router]);

  useEffect(() => {
    const otp = digits.join("");
    if (otp.length === OTP_LENGTH && !loading) {
      handleVerify();
    }
  }, [digits, loading, handleVerify]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");

    try {
      await api.post("/api/auth/send-otp", {
        mode,
        email,
        ...(mode === "signup" ? { name, phone } : { phone }),
      });
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to resend code");
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  const maskedEmail = maskEmail(email);

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-amber-50 via-orange-50/40 to-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.03)_1px,transparent_0)] bg-size-[24px_24px]" />
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-linear-to-br from-amber-200/30 to-orange-200/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-linear-to-tr from-emerald-200/20 to-teal-100/10 blur-3xl" />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            {_props.logoUrl ? (
              <Image
                src={_props.logoUrl}
                alt={_props.restaurantName}
                width={80}
                height={80}
                className="mx-auto rounded-full object-cover ring-2 ring-white shadow-lg mb-4"
              />
            ) : (
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <ShieldCheck className="size-8" />
              </div>
            )}
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              Verify Your Email
            </h1>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
              <Mail className="size-4" />
              <span>Code sent to <strong className="text-zinc-700">{maskedEmail}</strong></span>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm sm:p-8">
            <p className="text-center text-sm text-zinc-500">
              Enter the 6-digit code from your email
            </p>

            <div className="mt-6 flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="size-12 rounded-xl border border-zinc-200 bg-zinc-50/50 text-center text-xl font-bold text-zinc-900 transition-all placeholder:text-zinc-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50 sm:size-14 sm:text-2xl"
                />
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={handleVerify}
              disabled={loading || digits.join("").length !== OTP_LENGTH}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-600/30 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>

            <div className="mt-4 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-zinc-400">
                  Resend code in <span className="font-medium text-zinc-600">{countdown}s</span>
                </p>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend verification code"}
                </Button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="link"
            onClick={() => router.push("/auth")}
            className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
          >
            <ArrowLeft className="size-3.5" />
            Back to {mode === "login" ? "Login" : "Sign Up"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}${"*".repeat(Math.min(local.length - 2, 4))}@${domain}`;
}
