"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  authConfigured: boolean;
};

export function LoginForm({ authConfigured }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const from = searchParams.get("from");
      const dest =
        from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
      router.push(dest);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!authConfigured) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-6 py-8 text-center text-[#5c5348]">
        <p className="font-medium text-amber-900">
          Password protection is off until you set{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">BOARD_PASSWORD</code>{" "}
          in your environment (e.g. Vercel project settings or{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">.env.local</code>
          ).
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border-[3px] border-dashed border-[#c4b8a8] bg-[#fffef8] p-8 shadow-[6px_6px_0_0_rgba(200,180,160,0.45)]"
    >
      <h1 className="font-[family-name:var(--font-caveat)] text-3xl font-semibold text-[#4a3f8f]">
        Shhh — Chan&apos;s board is invite-only
      </h1>
      <p className="mt-2 text-sm text-[#6b6258]">
        Enter the shared password to see the Love Connection Portal.
      </p>

      <label className="mt-6 block">
        <span className="mb-1 block text-sm font-medium text-[#4a4238]">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="mt-1 w-full rounded-md border-2 border-[#d4c4b0] bg-white px-3 py-2 text-[#3d3428] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
        />
      </label>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !password}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-rose-400 bg-gradient-to-r from-rose-300/90 to-pink-300/90 px-6 py-3 text-base font-semibold text-[#4a1d2e] shadow-[4px_4px_0_0_rgba(190,100,130,0.5)] transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#4a1d2e] border-t-transparent" />
            Checking…
          </>
        ) : (
          "Unlock the board"
        )}
      </button>
    </form>
  );
}
