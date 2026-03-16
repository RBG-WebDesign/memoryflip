// ─── Cloud API client ───
// Dual-write: local first (fast, reliable), then remote (async, can fail).
// Failed remote writes get queued and retried on startup + every 30s.
// On load: remote is source of truth when reachable, local is fallback.

const API_TIMEOUT = 8000;
const SYNC_QUEUE_KEY = 'galaxy-sync-queue';
const LEADERBOARD_KEY = 'galaxy-sync-leaderboard';

// ─── Core fetch wrapper ───

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

// ─── Sync Queue (offline resilience) ───

function getSyncQueue() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch { return []; }
}

function addToSyncQueue(entry) {
  try {
    const queue = getSyncQueue();
    queue.push({ ...entry, attemptedAt: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

export async function flushSyncQueue() {
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const failed = [];
  for (const item of queue) {
    try {
      await apiFetch('/api/leaderboard/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, score: item.score, round: item.round }),
      });
    } catch {
      failed.push(item);
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failed));
}

// Start periodic flush (every 30s) — call once on app mount
let flushInterval = null;
export function startPeriodicSync() {
  if (flushInterval) return;
  flushSyncQueue().catch(() => {});
  flushInterval = setInterval(() => flushSyncQueue().catch(() => {}), 30000);
}

export function stopPeriodicSync() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

// ─── Leaderboard ───

export async function fetchLeaderboard() {
  // Read local first (always available)
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
  } catch { /* empty */ }

  // Try remote — if reachable, it's the source of truth
  try {
    const rows = await apiFetch('/api/leaderboard');
    const cloud = rows.map((r) => ({
      name: r.name,
      score: r.score,
      round: r.round,
      date: new Date(r.created_at).toLocaleDateString(),
    }));

    // Merge cloud + local, dedupe (cloud entries take priority)
    const seen = new Set();
    const merged = [];
    for (const entry of [...cloud, ...local]) {
      const key = `${entry.name}|${entry.score}|${entry.round}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(entry);
      }
    }
    const sorted = merged.sort((a, b) => b.score - a.score);

    // Update local to match merged result
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
    return sorted;
  } catch {
    // Neon unreachable — fall through to local
    return local.sort((a, b) => b.score - a.score);
  }
}

export async function addLeaderboardEntry(name, score, round) {
  // Local write first (fast, never blocks the user)
  try {
    const local = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    local.push({ name, score, round, date: new Date().toLocaleDateString() });
    local.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(local.slice(0, 500)));
  } catch { /* ignore */ }

  // Remote write second (async, can fail gracefully)
  try {
    await apiFetch('/api/leaderboard/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, round }),
    });
    return true;
  } catch {
    // Cloud failed — queue for retry
    addToSyncQueue({ name, score, round });
    return false;
  }
}

export async function clearLeaderboard(pin) {
  const result = await apiFetch('/api/leaderboard/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  // Also clear local + sync queue
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.removeItem(SYNC_QUEUE_KEY);
  return result;
}

// ─── Grand Prize ───

export async function fetchGrandPrizeToday() {
  try {
    return await apiFetch('/api/grandprize');
  } catch {
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
