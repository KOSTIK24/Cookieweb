// config/app.js
// Hlavní config pro Sušenka Web.
// Firebase nepoužíváme. Používáme Supabase.

const SUPABASE_URL = "https://vvgxxgtuzxcyxsmoqoik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3h4Z3R1enhjeXhzbW9xb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDc1NDQsImV4cCI6MjA5ODgyMzU0NH0.FBnnv61ECcE5mlX7vA0T3cO54MMSuCF-rJhJ6iT0c7w";

const APP_CONFIG = {
  chatTable: "site_chat_messages",
  gameChatTable: "game_chat_messages",
  postsTable: "site_posts",
  profilesTable: "profiles",
  adminsTable: "admin_users",

  maxChatMessages: 80,
  maxGameChatMessages: 50,
  maxChatLength: 300,
  maxGameChatLength: 160,
  maxUsernameLength: 24,
  maxGameNameLength: 18
};

let supabaseClient = null;

try {
  const cleanUrl = SUPABASE_URL.trim();
  const cleanKey = SUPABASE_ANON_KEY.trim();

  if (window.supabase && cleanUrl.startsWith("https://") && cleanKey.length > 20) {
    supabaseClient = window.supabase.createClient(cleanUrl, cleanKey);
    console.log("Supabase připojeno.");
  } else {
    console.warn("Supabase není správně nastavené v config/app.js.");
  }
} catch (error) {
  console.error("Chyba Supabase configu:", error);
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function formatDateCZ(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

async function getCurrentUser() {
  if (!supabaseClient) return null;

  const { data } = await supabaseClient.auth.getUser();
  return data.user || null;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data } = await supabaseClient
    .from(APP_CONFIG.profilesTable)
    .select("id, username, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return data || {
    id: user.id,
    username: user.email?.split("@")[0] || "user"
  };
}

async function isCurrentUserAdmin() {
  const user = await getCurrentUser();

  if (!user) return false;

  const { data, error } = await supabaseClient
    .from(APP_CONFIG.adminsTable)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Admin check error:", error);
    return false;
  }

  return !!data;
}

async function logoutUser() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Nový hlavní objekt pro login/chat/admin/novinky
window.SUSENKA = {
  supabase: supabaseClient,
  config: APP_CONFIG,
  escapeHTML,
  formatDateCZ,
  getCurrentUser,
  getCurrentProfile,
  isCurrentUserAdmin,
  logoutUser
};

// Kompatibilita pro hra.html, protože tam jsem předtím použil SUSENKA_CONFIG
window.SUSENKA_CONFIG = {
  supabase: supabaseClient,

  gameChat: {
    tableName: APP_CONFIG.gameChatTable,
    maxMessages: APP_CONFIG.maxGameChatMessages,
    maxNameLength: APP_CONFIG.maxGameNameLength,
    maxMessageLength: APP_CONFIG.maxGameChatLength
  },

  isSupabaseReady() {
    return !!supabaseClient;
  }
};
