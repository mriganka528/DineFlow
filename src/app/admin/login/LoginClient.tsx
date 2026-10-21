"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Package,
  Settings2,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import axios from "axios";
import toast from "react-hot-toast";

const featureCards = [
  {
    label: "Orders",
    caption: "Track & update",
    Icon: ClipboardList,
    tone: "bg-emerald-500",
  },
  {
    label: "Inventory",
    caption: "Menu & stock",
    Icon: Package,
    tone: "bg-sky-500",
  },
  {
    label: "Settings",
    caption: "Store controls",
    Icon: Settings2,
    tone: "bg-amber-500",
  },
];

const capabilityTags = [
  "Real-time orders",
  "Menu editor",
  "Inventory",
  "Payments",
  "Analytics",
  "Staff access",
];

type LoginMode = "login" | "login-otp" | "forgot-email" | "forgot-code" | "forgot-reset";

const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const greeting = useMemo(() => getGreeting(), []);

  // Login OTP verification
  const [loginOtpEmail, setLoginOtpEmail] = useState("");
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);

  // Forgot password flow
  const [mode, setMode] = useState<LoginMode>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const redirectTo = searchParams?.get("redirect") || "/admin/dashboard";

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

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

      if (response.data?.requiresOtp) {
        setLoginOtpEmail(response.data.email || email.trim().toLowerCase());
        setOtpCode("");
        setNotice(
          response.data.message ||
            "A verification code has been sent to your registered email address.",
        );
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setMode("login-otp");
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

  async function verifyLoginOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^[0-9]{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingLoginOtp(true);

    try {
      await api.post("/api/admin/login/verify-otp", { code: otpCode.trim() });

      toast.success("Signed in successfully");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message || "Verification failed. Please try again.";

        if (err.response?.status === 401) {
          setMode("login");
          setNotice("");
          setResendCooldown(0);
        }

        setError(message);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  }

  async function resendLoginOtp() {
    setError("");
    setIsSendingCode(true);

    try {
      const response = await api.post("/api/admin/login/resend-otp");

      setNotice(
        response.data?.message ||
          "A new verification code has been sent to your registered email address.",
      );
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message || "Could not resend the code. Please try again.";

        if (err.response?.status === 401) {
          setMode("login");
          setNotice("");
          setResendCooldown(0);
        }

        setError(message);
      } else {
        setError("Could not resend the code. Please try again.");
      }
    } finally {
      setIsSendingCode(false);
    }
  }

  function startForgotPassword() {
    setResetEmail(email.trim());
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    setResendCooldown(0);
    setMode("forgot-email");
  }

  function backToLogin() {
    setMode("login");
    setError("");
    setNotice("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setResendCooldown(0);
  }

  function backToEmailStep() {
    setMode("forgot-email");
    setError("");
    setNotice("");
    setOtpCode("");
    setResendCooldown(0);
  }

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await api.post("/api/admin/forgot-password/send", {
        email: normalizedEmail,
      });

      setResetEmail(normalizedEmail);
      setNotice(
        response.data?.message ||
          "A verification code has been sent to your registered email address.",
      );

      if (mode !== "forgot-code") {
        setMode("forgot-code");
      }

      setOtpCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Could not send the verification code. Please try again.",
        );
      } else {
        setError("Could not send the verification code. Please try again.");
      }
    } finally {
      setIsSendingCode(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^[0-9]{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingCode(true);

    try {
      const response = await api.post("/api/admin/forgot-password/verify", {
        email: resetEmail.trim().toLowerCase(),
        code: otpCode.trim(),
      });

      setNotice(
        response.data?.message ||
          "Code verified. You can reset your password or continue to the dashboard.",
      );
      setMode("forgot-reset");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Verification failed. Please try again.");
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsResettingPassword(true);

    try {
      await api.post("/api/admin/forgot-password/reset", { password: newPassword });

      toast.success("Password reset successfully");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Could not reset your password. Please try again.");
      } else {
        setError("Could not reset your password. Please try again.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  }

  function continueToDashboard() {
    router.push(redirectTo);
    router.refresh();
  }

  const heading =
    mode === "login"
      ? "Admin sign in"
      : mode === "login-otp"
        ? "Verify your sign-in"
        : mode === "forgot-email"
          ? "Forgot password"
          : mode === "forgot-code"
            ? "Enter verification code"
            : "Set a new password";

  const subtitle =
    mode === "login"
      ? "Access orders, inventory, settings, and restaurant operations."
      : mode === "login-otp"
        ? `We sent a 6-digit code to ${loginOtpEmail}. Enter it to finish signing in.`
        : mode === "forgot-email"
          ? "Enter the email registered with your admin account and we'll send you a 6-digit code."
          : mode === "forgot-code"
            ? `We sent a verification code to ${resetEmail}. Enter it below to continue.`
            : "Your code is verified. Set a new password now, or continue to the dashboard.";

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
                {featureCards.map((card, index) => (
                  <div
                    key={card.label}
                    className="animate-login-card rounded-xl border border-[#241c1714] bg-white/78 p-4 shadow-sm"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-[#f4ede1] text-[#171412]">
                      <card.Icon className="size-4.5" />
                    </div>
                    <div className={`mb-2 h-1 w-8 rounded-full ${card.tone}`} />
                    <p className="text-sm font-semibold tracking-normal text-[#171412]">{card.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-[#75685d]">{card.caption}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#241c1714] bg-[#171412] p-5 text-white">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/86">Everything you can manage</p>
                  <Sparkles className="size-4 text-[#f6bd55]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {capabilityTags.map((tag, index) => (
                    <span
                      key={tag}
                      className="animate-login-card rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/85"
                      style={{ animationDelay: `${index * 90}ms` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-white/55">
                  One secure console for your entire restaurant — from the first
                  order to the daily close.
                </p>
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
                {mode !== "login" && (
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#6d6257] transition hover:text-[#b93a24]"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to sign in
                  </button>
                )}
                <h1 className="text-3xl font-semibold tracking-normal text-[#171412] sm:text-4xl">
                  {heading}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#6d6257]">{subtitle}</p>
              </div>

              {mode === "login" && (
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
                    <button
                      type="button"
                      onClick={startForgotPassword}
                      className="text-left font-medium text-[#b93a24] transition hover:text-[#8f2b1b] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                  >
                    {isSubmitting ? "Sending code..." : "Continue"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>

                  <p className="text-center text-xs leading-5 text-[#8a7c6e]">
                    For security, we&apos;ll email a 6-digit verification code to your
                    registered admin email.
                  </p>
                </form>
              )}

              {mode === "login-otp" && (
                <form className="space-y-5" onSubmit={verifyLoginOtp}>
                  {notice && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {notice}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-otp-code" className="text-[#342b25]">
                      Verification code
                    </Label>
                    <Input
                      id="login-otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) => {
                        setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      className="h-14 rounded-xl border-[#d8cec1] bg-[#fffaf2] text-center text-2xl font-semibold tracking-[0.4em] text-[#171412] placeholder:text-[#d8cec1] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                      required
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isVerifyingLoginOtp || otpCode.length !== 6}
                    className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                  >
                    {isVerifyingLoginOtp ? "Verifying..." : "Verify & sign in"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>

                  <div className="flex flex-col items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={resendLoginOtp}
                      disabled={resendCooldown > 0 || isSendingCode}
                      className="font-medium text-[#b93a24] transition hover:text-[#8f2b1b] hover:underline disabled:cursor-not-allowed disabled:text-[#a2968a] disabled:no-underline"
                    >
                      {isSendingCode
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={backToLogin}
                      className="text-xs text-[#8a7c6e] transition hover:text-[#b93a24]"
                    >
                      Use a different account
                    </button>
                  </div>
                </form>
              )}

              {mode === "forgot-email" && (
                <form className="space-y-5" onSubmit={requestCode}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[#342b25]">
                      Registered admin email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7c6e]" />
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="owner@restaurant.com"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        className="h-12 rounded-xl border-[#d8cec1] bg-[#fffaf2] pl-10 text-[#171412] placeholder:text-[#a2968a] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSendingCode}
                    className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                  >
                    {isSendingCode ? "Sending code..." : "Send verification code"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>

                  <p className="text-center text-xs leading-5 text-[#8a7c6e]">
                    The code is sent only to the email registered with an admin account.
                  </p>
                </form>
              )}

              {mode === "forgot-code" && (
                <form className="space-y-5" onSubmit={verifyCode}>
                  {notice && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {notice}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="otp-code" className="text-[#342b25]">
                      Verification code
                    </Label>
                    <Input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) => {
                        setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      className="h-14 rounded-xl border-[#d8cec1] bg-[#fffaf2] text-center text-2xl font-semibold tracking-[0.4em] text-[#171412] placeholder:text-[#d8cec1] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                      required
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isVerifyingCode || otpCode.length !== 6}
                    className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                  >
                    {isVerifyingCode ? "Verifying..." : "Verify code"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>

                  <div className="flex flex-col items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => requestCode()}
                      disabled={resendCooldown > 0 || isSendingCode}
                      className="font-medium text-[#b93a24] transition hover:text-[#8f2b1b] hover:underline disabled:cursor-not-allowed disabled:text-[#a2968a] disabled:no-underline"
                    >
                      {isSendingCode
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={backToEmailStep}
                      className="text-xs text-[#8a7c6e] transition hover:text-[#b93a24]"
                    >
                      Use a different email
                    </button>
                  </div>
                </form>
              )}

              {mode === "forgot-reset" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Code verified successfully. You&apos;re signed in.
                  </div>

                  <form className="space-y-5" onSubmit={resetPassword}>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-[#342b25]">
                        New password
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7c6e]" />
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-12 rounded-xl border-[#d8cec1] bg-[#fffaf2] pl-10 pr-11 text-[#171412] placeholder:text-[#a2968a] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowNewPassword((current) => !current)}
                          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7d7064] transition hover:bg-[#efe5d8] hover:text-[#171412] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#d9462b]/20"
                        >
                          {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-[#342b25]">
                        Confirm new password
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7c6e]" />
                        <Input
                          id="confirm-password"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter your new password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-12 rounded-xl border-[#d8cec1] bg-[#fffaf2] pl-10 text-[#171412] placeholder:text-[#a2968a] focus-visible:border-[#d9462b] focus-visible:ring-[#d9462b]/20"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isResettingPassword}
                      className="h-12 w-full rounded-xl bg-[#171412] text-base text-white shadow-[0_12px_30px_rgba(23,20,18,0.22)] hover:bg-[#302722]"
                    >
                      {isResettingPassword ? "Resetting password..." : "Reset password & continue"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#e5dbcf]" />
                    <span className="text-xs text-[#8a7c6e]">or</span>
                    <div className="h-px flex-1 bg-[#e5dbcf]" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={continueToDashboard}
                    className="h-11 w-full rounded-xl border-[#d8cec1] bg-transparent text-[#342b25] hover:bg-[#f4ede1]"
                  >
                    Continue to dashboard
                  </Button>
                </div>
              )}
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
