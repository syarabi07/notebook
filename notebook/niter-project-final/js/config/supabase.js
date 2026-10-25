const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  "https://vrkcucdeqavujvfbkqpk.supabase.co";
const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2N1Y2RlcWF2dWp2ZmJrcXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzcyMjEsImV4cCI6MjEwMTUxMzIyMX0.s4IwgF6Kv-x0J6_Qow6RTpsxTmeTep5GaJ4gLzTs4DQ";

export const supabaseClient =
  typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

