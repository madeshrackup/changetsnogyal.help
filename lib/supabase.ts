import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Uses your project URL/key when set. Falls back to inert placeholders during
 * `next build` / prerender when env vars are absent so the bundle still loads.
 */
export const supabase = createClient(
  url ?? "https://placeholder.local",
  key ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjAsImV4cCI6MTk4MjQxMjI4MH0.placeholder",
);
