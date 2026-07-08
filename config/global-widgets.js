(function () {
  const ONLINE_INTERVAL_MS = 20000;
  const LEADERBOARD_LIMIT = 5;

  function getDb() {
    return window.SUSENKA?.supabase || null;
  }

  function getCfg() {
    return window.SUSENKA?.config || {};
  }

  function escapeHTML(text) {
    if (window.SUSENKA?.escapeHTML) {
      return window.SUSENKA.escapeHTML(text);
    }

    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  function formatNumber(num) {
    num = Number(num) || 0;

    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1) + "T";
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";

    return Math.floor(num).toString();
  }

  function getSessionId() {
    const key = "susenkaOnlineSessionId";
    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
      if (crypto.randomUUID) {
        sessionId = crypto.randomUUID();
      } else {
        sessionId = "session-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      }

      localStorage.setItem(key, sessionId);
    }

    return sessionId;
  }

  async function getOnlineUsername() {
    try {
      const user = await window.SUSENKA?.getCurrentUser?.();

      if (!user) {
        return "guest";
      }

      const profile = await window.SUSENKA?.getCurrentProfile?.();

      return profile?.username || user.email?.split("@")[0] || "user";
    } catch {
      return "guest";
    }
  }

  async function touchOnline() {
    const db = getDb();

    if (!db) return;

    const sessionId = getSessionId();
    const username = await getOnlineUsername();

    const { error } = await db.rpc("touch_online_player", {
      p_session_id: sessionId,
      p_username: username,
      p_page: window.location.pathname
    });

    if (error) {
      console.warn("Online sync error:", error);
    }
  }

  function injectLeaderboardCSS() {
    if (document.getElementById("sw-global-leaderboard-css")) return;

    const style = document.createElement("style");
    style.id = "sw-global-leaderboard-css";
    style.textContent = `
      .sw-global-leaderboard {
        margin-top: 18px;
      }

      .sw-leaderboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .sw-leaderboard-box {
        background: rgba(0,0,0,.18);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        padding: 14px;
      }

      .sw-leaderboard-box h3 {
        margin-top: 0;
      }

      .sw-leader-table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
      }

      .sw-leader-table th,
      .sw-leader-table td {
        padding: 8px 6px;
        border-bottom: 1px solid rgba(255,255,255,.08);
        text-align: left;
      }

      .sw-leader-table th {
        color: var(--muted);
        font-size: 13px;
      }

      .sw-leader-score {
        font-weight: 900;
        color: #baffc9;
        white-space: nowrap;
      }

      .sw-leader-actions {
        display: flex;
        justify-content: center;
        margin-top: 12px;
      }

      @media (max-width: 850px) {
        .sw-leaderboard-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getLeaderboardHref() {
    const inPagesFolder = window.location.pathname.includes("/pages/");
    return inPagesFolder ? "leaderboard.html" : "pages/leaderboard.html";
  }

  function createLeaderboardSection() {
    if (document.getElementById("globalLeaderboardWidget")) return null;

    const section = document.createElement("section");
    section.id = "globalLeaderboardWidget";
    section.className = "card sw-global-leaderboard";
    section.innerHTML = `
      <h2>Mini leaderboard 🏆</h2>

      <div class="sw-leaderboard-grid">
        <div class="sw-leaderboard-box">
          <h3>🍪 Cookies</h3>
          <div id="globalCookieLeaderboard">
            <p class="status">Načítám...</p>
          </div>
        </div>

        <div class="sw-leaderboard-box">
          <h3>⚔️ SBP Maze</h3>
          <div id="globalMazeLeaderboard">
            <p class="status">Načítám...</p>
          </div>
        </div>
      </div>

      <div class="sw-leader-actions">
        <a class="btn" href="${getLeaderboardHref()}">Celý leaderboard</a>
      </div>
    `;

    return section;
  }

  function injectLeaderboardWidget() {
    if (document.getElementById("cookieLeaderboard") || document.getElementById("mazeLeaderboard")) {
      return;
    }

    injectLeaderboardCSS();

    const section = createLeaderboardSection();
    if (!section) return;

    const main = document.querySelector("main");
    const footer = document.querySelector("footer");

    if (main) {
      main.appendChild(section);
    } else if (footer) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }
  }

  function renderMiniTable(element, rows, type) {
    if (!element) return;

    if (!rows || rows.length === 0) {
      element.innerHTML = `<p class="status">Zatím žádná data.</p>`;
      return;
    }

    element.innerHTML = `
      <table class="sw-leader-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Hráč</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => {
            const score = type === "cookies"
              ? `${formatNumber(row.cookie_best)} 🍪`
              : `${Number(row.maze_wins) || 0} winů`;

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(row.username || "user")}</td>
                <td class="sw-leader-score">${score}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  async function loadGlobalLeaderboard() {
    const db = getDb();
    const cfg = getCfg();

    if (!db || !cfg.scoresTable) return;

    const cookieEl = document.getElementById("globalCookieLeaderboard");
    const mazeEl = document.getElementById("globalMazeLeaderboard");

    if (!cookieEl || !mazeEl) return;

    const { data: cookies, error: cookieError } = await db
      .from(cfg.scoresTable)
      .select("username, cookie_best, maze_wins")
      .order("cookie_best", { ascending: false })
      .limit(LEADERBOARD_LIMIT);

    const { data: maze, error: mazeError } = await db
      .from(cfg.scoresTable)
      .select("username, cookie_best, maze_wins")
      .order("maze_wins", { ascending: false })
      .limit(LEADERBOARD_LIMIT);

    if (cookieError) {
      console.warn("Mini cookie leaderboard error:", cookieError);
      cookieEl.innerHTML = `<p class="status">Cookies nejdou načíst.</p>`;
    } else {
      renderMiniTable(cookieEl, cookies, "cookies");
    }

    if (mazeError) {
      console.warn("Mini maze leaderboard error:", mazeError);
      mazeEl.innerHTML = `<p class="status">Maze nejde načíst.</p>`;
    } else {
      renderMiniTable(mazeEl, maze, "maze");
    }
  }

  async function initGlobalWidgets() {
    injectLeaderboardWidget();
    await loadGlobalLeaderboard();

    await touchOnline();
    setInterval(touchOnline, ONLINE_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalWidgets);
  } else {
    initGlobalWidgets();
  }
})();
