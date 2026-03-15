// ─── Cloud API client ───
// Talks to Netlify Functions backed by Neon Postgres.
// Falls back to localStorage when the API is unreachable (local dev, offline).

const API_TIMEOUT = 8000;

async function apiFetch(path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(path, { ...opts, signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Leaderboard ───

export async function fetchLeaderboard() {
  try {
    const rows = await apiFetch('/api/leaderboard');
    return rows.map((r) => ({
      name: r.name,
      score: r.score,
      round: r.round,
      date: new Date(r.created_at).toLocaleDateString(),
    }));
  } catch {
    // Fallback: read from localStorage
    try {
      return JSON.parse(localStorage.getItem('galaxy-sync-leaderboard') || '[]');
    } catch { return []; }
  }
}

export async function addLeaderboardEntry(name, score, round) {
  try {
    await apiFetch('/api/leaderboard/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, round }),
    });
    return true;
  } catch {
    // Fallback: save locally
    return false;
  }
}

export async function clearLeaderboard(pin) {
  return apiFetch('/api/leaderboard/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

// ─── Grand Prize ───

export async function fetchGrandPrizeToday() {
  try {
    return await apiFetch('/api/grandprize');
  } catch {
    // Fallback: localStorage
    try {
      const data = JSON.parse(localStorage.getItem('galaxy-sync-grand-prize-winners') || '{}');
      const today = new Date().toISOString().slice(0, 10);
      return data[today] || [];
    } catch { return []; }
  }
}

export async function addGrandPrizeWinnerRemote(name) {
  try {
    await apiFetch('/api/grandprize/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function resetGrandPrizeTodayRemote(pin) {
  return apiFetch('/api/grandprize/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

// ─── DB Init (run once on first deploy) ───

export async function initDatabase(pin) {
  return apiFetch('/api/db-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}
