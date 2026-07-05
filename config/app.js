// config/app.js
// Config pro celý Sušenka Web.
// Firebase nepoužíváme. Auth zatím nepoužíváme. Používáme Supabase.

const SUPABASE_URL = "https://vvgxxgtuzxcyxsmoqoik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3h4Z3R1enhjeXhzbW9xb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDc1NDQsImV4cCI6MjA5ODgyMzU0NH0.FBnnv61ECcE5mlX7vA0T3cO54MMSuCF-rJhJ6iT0c7w";

const GAME_CHAT_CONFIG = {
  tableName: "game_chat_messages",
  maxMessages: 50,
  maxNameLength: 18,
  maxMessageLength: 160
};

let supabaseClient = null;

try {
  const cleanUrl = SUPABASE_URL.trim();
  const cleanKey = SUPABASE_ANON_KEY.trim();

  const hasConfig =
    cleanUrl.startsWith("https://") &&
    cleanKey.length > 20 &&
    !cleanUrl.includes("SEM_DEJ") &&
    !cleanKey.includes("SEM_DEJ");

  if (window.supabase && hasConfig) {
    supabaseClient = window.supabase.createClient(cleanUrl, cleanKey);
    console.log("Supabase config načten.");
  } else {
    console.warn("Supabase není správně nastavený v config/app.js.");
  }
} catch (error) {
  console.error("Chyba při startu Supabase:", error);
}

window.SUSENKA_CONFIG = {
  supabase: supabaseClient,
  gameChat: GAME_CHAT_CONFIG,

  isSupabaseReady() {
    return !!supabaseClient;
  }
};
