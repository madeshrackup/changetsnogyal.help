import { LoginForm } from "./login-form";
import { Suspense } from "react";

export default function LoginPage() {
  const authConfigured = Boolean(process.env.BOARD_PASSWORD?.length);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#faf6f0] text-[#3d3428]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, transparent 39px, rgba(180, 200, 220, 0.25) 39px, rgba(180, 200, 220, 0.25) 40px),
            linear-gradient(#f5ebe0 0.5px, transparent 0.5px)
          `,
          backgroundSize: "40px 100%, 100% 28px",
          backgroundPosition: "0 0, 0 12px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#e8f2ff]/40 via-transparent to-[#ffe8f0]/35" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <p className="mb-6 text-3xl" aria-hidden>
          🔐💕
        </p>
        <Suspense fallback={<div className="h-48 w-full max-w-md animate-pulse rounded-lg bg-white/40" />}>
          <LoginForm authConfigured={authConfigured} />
        </Suspense>
      </div>
    </div>
  );
}
