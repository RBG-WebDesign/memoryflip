// ─── Cloud API client ───
// Talks to Netlify Functions backed by Neon Postgres.
// Always saves locally AND to cloud. Merges both on load.
// Queues failed cloud writes for retry on next app load.

const API_TIMEOUT = 8000;
const PENDING_KEY = 'galaxy-sync-pending-uploads';

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

// ─── Pending upload queue (for offline resilience) ───

function getPendingUploads() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch { return []; }
}

function addPendingUpload(entry) {
  try {
    const pending = getPendingUploads();
    pending.push(entry);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch { /* ignore */ }
}

function clearPendingUploads() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch { /* ignore */ }
}

// Flush any queued entries to Neon (called on app load when online)
export async function flushPendingUploads() {
  const pending = getPendingUploads();
  if (pending.length === 0) return;

  const stillPending = [];
  for (const entry of pending) {
    try {
      await apiFetch('/api/leaderboard/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: entry.name, score: entry.score, round: entry.round }),
      });
    } catch {
      stillPending.push(entry);
    }
  }

  if (stillPending.length > 0) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(stillPending));
  } else {
    clearPendingUploads();
  }
}

// ─── Leaderboard ───

export async function fetchLeaderboard() {
  // Always read local scores first
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem('galaxy-sync-leaderboard') || '[]');
  } catch { /* empty */ }

  // Try cloud
  let cloud = [];
  try {
    const rows = await apiFetch('/api/leaderboard');
    cloud = rows.map((r) => ({
      name: r.name,
      score: r.score,
      round: r.round,
      date: new Date(r.created_at).toLocaleDateString(),
    }));
  } catch { /* cloud unavailable, local is the fallback */ }

  // Merge: dedupe by name+score+round to avoid duplicates
  const seen = new Set();
  const merged = [];
  for (const entry of [...cloud, ...local]) {
    const key = `${entry.name}|${entry.score}|${entry.round}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  }

  return merged.sort((a, b) => b.score - a.score);
}

export async function addLeaderboardEntry(name, score, round) {
  // Always try cloud first
  try {
    await apiFetch('/api/leaderboard/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, round }),
    });
    return true;
  } catch {
    // Cloud failed — queue for retry on next load
    addPendingUpload({ name, score, round });
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
