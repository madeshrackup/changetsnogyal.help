"use client";

/**
 * Database: see `supabase-setup.sql` for `love_notes_for_chan` + Realtime.
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LoveNote = {
  id: string;
  created_at: string;
  message_text: string;
  from_name: string | null;
};

const ROTATIONS = [
  "rotate-1",
  "rotate-2",
  "-rotate-1",
  "-rotate-2",
  "rotate-3",
  "-rotate-3",
] as const;

const CARD_BG = [
  "bg-[#fff9e6] border-amber-200/80",
  "bg-[#e8f4fc] border-sky-200/80",
  "bg-[#fce8f0] border-rose-200/80",
  "bg-[#f0fce8] border-lime-200/70",
  "bg-[#f5e8ff] border-violet-200/70",
] as const;

function hashPick<T extends readonly string[]>(id: string, arr: T): T[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec} second${diffSec === 1 ? "" : "s"} ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function sortNewestFirst(a: LoveNote, b: LoveNote): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

type Props = {
  showLogout?: boolean;
};

export function HomeBoard({ showLogout = false }: Props) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [messageText, setMessageText] = useState("");
  const [fromName, setFromName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const markNew = useCallback((id: string) => {
    setNewIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 900);
  }, []);

  const mergeNote = useCallback(
    (row: LoveNote) => {
      if (seenIdsRef.current.has(row.id)) return;
      seenIdsRef.current.add(row.id);
      markNew(row.id);
      setNotes((prev) => [...prev, row].sort(sortNewestFirst));
    },
    [markNew],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      const { data, error } = await supabase
        .from("love_notes_for_chan")
        .select("id, created_at, message_text, from_name")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      const rows = (data as LoveNote[]) ?? [];
      seenIdsRef.current = new Set(rows.map((r) => r.id));
      setNotes(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("love_notes_for_chan_inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "love_notes_for_chan",
        },
        (payload) => {
          mergeNote(payload.new as LoveNote);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mergeNote]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed) return;

    setSubmitError(null);
    setLoading(true);
    const nameTrim = fromName.trim();
    const { data, error } = await supabase
      .from("love_notes_for_chan")
      .insert({
        message_text: trimmed,
        from_name: nameTrim.length ? nameTrim : null,
      })
      .select("id, created_at, message_text, from_name")
      .single();

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    if (data) {
      mergeNote(data as LoveNote);
      setMessageText("");
      setFromName("");
    }
  };

  const relativeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of notes) {
      map.set(n.id, formatRelativeTime(n.created_at));
    }
    return map;
  }, [notes, tick]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#faf6f0] text-[#3d3428]">
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

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-300/80 bg-white/70 px-4 py-2 text-2xl shadow-[3px_3px_0_0_rgba(244,114,182,0.35)] sm:text-3xl">
            <span aria-hidden>❤️</span>
            <span aria-hidden>🧑🏽‍💻</span>
            <span aria-hidden>❤️</span>
            <span aria-hidden>💌</span>
            <span aria-hidden>🧑🏽‍💻</span>
            <span aria-hidden>✨</span>
          </div>
          <h1 className="font-[family-name:var(--font-caveat)] text-4xl font-bold tracking-tight text-[#4a3f8f] sm:text-5xl md:text-6xl">
            Chan&apos;s Love Connection Portal
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5c5348] sm:text-lg">
            A digital noticeboard dedicated to finding Chan the love he deserves
            (or just some nice messages).
          </p>
          <p className="mt-2 text-sm italic text-rose-600/90">
            Operation: Find Chan Love — now accepting heartfelt pixels.
          </p>
        </header>

        <section className="mb-14 flex justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-lg border-[3px] border-dashed border-[#c4b8a8] bg-[#fffef8] p-6 shadow-[6px_6px_0_0_rgba(200,180,160,0.45)] sm:p-8"
            style={{ transform: "rotate(-0.5deg)" }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                📝
              </span>
              <h2 className="font-[family-name:var(--font-caveat)] text-2xl font-semibold text-[#5b4d9e]">
                Post a message for Chan
              </h2>
            </div>
            <p className="mb-4 text-sm text-[#6b6258]">
              Tape your note here — the whole internet corkboard is watching
              (supportively).
            </p>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#4a4238]">
                Your message for Chan <span className="text-rose-600">*</span>
              </span>
              <textarea
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                disabled={loading}
                placeholder="Dear Chan, you deserve the world and also a really good sandwich..."
                className="mt-1 w-full resize-y rounded-md border-2 border-[#d4c4b0] bg-[#fffdf7] px-3 py-2 font-[family-name:var(--font-caveat)] text-xl leading-snug text-[#3d3428] placeholder:text-[#a89888] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-[#4a4238]">
                From (optional)
              </span>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                disabled={loading}
                placeholder="e.g. A secret admirer of your git history"
                className="mt-1 w-full rounded-md border-2 border-[#d4c4b0] bg-white px-3 py-2 text-[#3d3428] placeholder:text-[#a09080] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
              />
              <span className="mt-1 block text-xs text-[#7a7268]">
                Leave blank to remain mysterious.
              </span>
            </label>

            {submitError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !messageText.trim()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-rose-400 bg-gradient-to-r from-rose-300/90 to-pink-300/90 px-6 py-3 text-base font-semibold text-[#4a1d2e] shadow-[4px_4px_0_0_rgba(190,100,130,0.5)] transition hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(190,100,130,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#4a1d2e] border-t-transparent" />
                  Sending love…
                </>
              ) : (
                <>
                  <span aria-hidden>💘</span>
                  Post to Chan&apos;s Board!
                </>
              )}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b-2 border-dotted border-[#c9b8a8] pb-3">
            <h2 className="font-[family-name:var(--font-caveat)] text-3xl font-semibold text-[#4a3f8f]">
              The noticeboard
            </h2>
            <p className="text-sm text-[#6b6258]">
              {notes.length} note{notes.length === 1 ? "" : "s"} & counting
            </p>
          </div>

          {loadError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              Couldn&apos;t load messages: {loadError}
            </p>
          ) : null}

          {!loadError && notes.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-[#d4c4b0] bg-white/60 px-6 py-12 text-center text-[#6b6258]">
              The board is quiet… be the first to wish Chan well (or slide into
              his DMs via this extremely wholesome public square).
            </p>
          ) : null}

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => {
              const rot = hashPick(note.id, ROTATIONS);
              const bg = hashPick(note.id, CARD_BG);
              const isNew = newIds.has(note.id);
              return (
                <li key={note.id} className="list-none">
                  <article
                    className={`flex h-full min-h-[160px] flex-col justify-between rounded-sm border-2 p-4 shadow-[4px_5px_0_0_rgba(0,0,0,0.06)] ${bg} ${rot} ${
                      isNew ? "animate-pop-in" : ""
                    }`}
                  >
                    <p className="font-[family-name:var(--font-caveat)] text-xl leading-snug text-[#2e2820]">
                      {note.message_text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-2 text-sm text-[#5c5348]">
                      <span className="font-medium">
                        — {note.from_name?.trim() || "Anonymous"}
                      </span>
                      <time
                        dateTime={note.created_at}
                        className="text-xs text-[#7a7268]"
                        title={new Date(note.created_at).toLocaleString()}
                      >
                        {relativeLabels.get(note.id)}
                      </time>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        {showLogout ? (
          <div className="mt-12 border-t border-dotted border-[#c9b8a8] pt-6 text-center">
            <form method="post" action="/api/auth/logout">
              <button
                type="submit"
                className="text-sm text-[#7a7268] underline decoration-[#c9b8a8] underline-offset-2 transition hover:text-[#4a3f8f]"
              >
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}
