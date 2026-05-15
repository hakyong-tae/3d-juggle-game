// ─── Leaderboard Service ──────────────────────────────────────────────────────
// Abstraction layer: localStorage now, V8 server later.
//
// To connect V8:
//   1. Set LB_BASE_URL to your V8 API endpoint
//   2. Set LB_API_KEY if auth is required
//   3. The functions below will automatically try server first,
//      fall back to localStorage on failure, and sync pending scores on reconnect.
//
// Data contract (same shape for local & remote):
//   Score entry: { userId, country, score, char, ts }
//   Mode keys:   'classic' | 'timeattack' | 'challenge' | 'wc'
// ─────────────────────────────────────────────────────────────────────────────

// ── Config (swap these when V8 is ready) ────────────────────────────────────
const LB_BASE_URL = null        // e.g. 'https://api.yourv8game.com/leaderboard'
const LB_API_KEY  = null        // e.g. 'Bearer xxxx'
const LB_GAME_ID  = 'juggle3d' // game identifier for the server

// ── Local storage helpers ────────────────────────────────────────────────────
const LOCAL_KEYS = {
  classic:    'j3d_history',
  timeattack: 'j3d_ta_history',
  challenge:  'j3d_ch_history',
  wc:         'j3d_wc_cscores',
}
const PENDING_KEY = 'j3d_lb_pending'   // scores queued for server sync

function localGet(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}
function localSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Server helpers ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  if (!LB_BASE_URL) throw new Error('No server configured')
  const headers = { 'Content-Type': 'application/json' }
  if (LB_API_KEY) headers['Authorization'] = LB_API_KEY
  const res = await fetch(`${LB_BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ── Pending queue: store failed submissions, retry on reconnect ──────────────
function enqueuePending(entry) {
  const q = localGet(PENDING_KEY, [])
  q.push({ ...entry, queuedAt: Date.now() })
  localSet(PENDING_KEY, q.slice(-50))   // keep at most 50 pending
}

export async function flushPending() {
  if (!LB_BASE_URL) return
  const q = localGet(PENDING_KEY, [])
  if (!q.length) return
  const failed = []
  for (const entry of q) {
    try {
      await apiFetch('/scores', { method: 'POST', body: JSON.stringify(entry) })
    } catch {
      failed.push(entry)
    }
  }
  localSet(PENDING_KEY, failed)
}

// ─────────────────────────────────────────────────────────────────────────────
// submitScore — called after every game
// entry: { mode, score, userId, country, char }
// ─────────────────────────────────────────────────────────────────────────────
export async function submitScore({ mode, score, userId, country = null, char = null }) {
  const entry = {
    gameId:  LB_GAME_ID,
    mode,
    score,
    userId:  userId || 'Player',
    name:    userId || 'Player',   // legacy compat — refreshLeaderboard reads e.name on old entries
    country: country || 'xx',
    char:    char || 'son',
    ts:      Date.now(),
  }

  // ── Always save locally first ──
  const key = LOCAL_KEYS[mode]
  if (key && mode !== 'wc') {
    const history = localGet(key, [])
    history.unshift(entry)
    localSet(key, history.slice(0, 20))
  }

  // ── Try server; queue on failure ──
  if (LB_BASE_URL) {
    try {
      await apiFetch('/scores', { method: 'POST', body: JSON.stringify(entry) })
    } catch {
      enqueuePending(entry)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchLeaderboard — get top scores for a mode
// Returns array of { userId, country, score, char, ts }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchLeaderboard(mode, limit = 10) {
  // ── Try server first ──
  if (LB_BASE_URL) {
    try {
      const data = await apiFetch(`/scores?game=${LB_GAME_ID}&mode=${mode}&limit=${limit}`)
      // Server response shape: { entries: [...] }
      return (data.entries || data).slice(0, limit)
    } catch {
      // Fall through to local
    }
  }

  // ── Local fallback ──
  const key = LOCAL_KEYS[mode]
  if (!key) return []
  return localGet(key, [])
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchWCLeaderboard — WC country scores
// Returns array of { country, userId, score, rounds }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchWCLeaderboard(limit = 10) {
  if (LB_BASE_URL) {
    try {
      const data = await apiFetch(`/scores/wc?game=${LB_GAME_ID}&limit=${limit}`)
      return (data.entries || data).slice(0, limit)
    } catch {
      // Fall through to local
    }
  }

  // Local: flatten j3d_wc_cscores map → array
  const cScores = localGet('j3d_wc_cscores', {})
  return Object.entries(cScores)
    .map(([code, v]) => ({ country: code, userId: v.userId, score: v.best, rounds: v.rounds }))
    .sort((a, b) => b.score - a.score || b.rounds - a.rounds)
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// isServerConnected — lightweight ping
// ─────────────────────────────────────────────────────────────────────────────
export async function isServerConnected() {
  if (!LB_BASE_URL) return false
  try {
    await apiFetch('/ping')
    return true
  } catch {
    return false
  }
}
