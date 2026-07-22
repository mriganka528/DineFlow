import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Admin Login | FoodBot",
  description: "Secure admin access for FoodBot.",
};

function LoginClientFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f3ec] text-[#171412]">
      <div className="flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-110">
          <div className="rounded-xl border border-[#241c171a] bg-white/86 p-5 shadow-[0_22px_70px_rgba(39,25,12,0.14)] backdrop-blur-xl sm:p-7 animate-pulse">
            <div className="space-y-5">
              <div className="h-8 w-3/4 rounded bg-[#efe5d8] animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-[#efe5d8] animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[#efe5d8] animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[#efe5d8] animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[#efe5d8] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginClientFallback />}>
      <LoginClient />
    </Suspense>
  );
}
