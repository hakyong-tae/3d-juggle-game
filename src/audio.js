// ─── BGM System ───────────────────────────────────────────────────────────────
import srcGirl from './audio/street-girl.mp3'
import srcMan  from './audio/street-man.mp3'

const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
}

// ─── Track definitions ────────────────────────────────────────────────────────
export const TRACKS = [
  { id: 'girl', title: 'Street Girl', src: srcGirl },
  { id: 'man',  title: 'Street Man',  src: srcMan  },
]

// ─── Persisted state ─────────────────────────────────────────────────────────
let enabled      = store.get('j3d_bgm_on',    true)
let order        = store.get('j3d_bgm_order', ['girl', 'man'])   // display + play order
let inPlaylist   = store.get('j3d_bgm_list',  ['girl', 'man'])   // which are active
let bgmVol       = store.get('j3d_bgm_vol',   70)                // 0-100

// ─── Runtime state ───────────────────────────────────────────────────────────
let audio        = null
let currentId    = null
let started      = false   // has user interacted yet?

// ─── Helpers ─────────────────────────────────────────────────────────────────
function activeTracks() {
  return order.map(id => TRACKS.find(t => t.id === id)).filter(t => t && inPlaylist.includes(t.id))
}

function emit() {
  window.dispatchEvent(new CustomEvent('bgmState', { detail: getBGMState() }))
}

export function getBGMState() {
  return { enabled, order, inPlaylist, currentId }
}

// ─── Playback ─────────────────────────────────────────────────────────────────
function playById(id) {
  const track = TRACKS.find(t => t.id === id)
  if (!track) return

  if (audio) { audio.pause(); audio.src = '' }
  audio = new Audio(track.src)
  audio.volume = bgmVol / 100
  audio.addEventListener('ended', playNext)
  audio.play().catch(() => {})
  currentId = id
  emit()
}

function playNext() {
  const list = activeTracks()
  if (!list.length) { currentId = null; emit(); return }
  const idx = list.findIndex(t => t.id === currentId)
  const next = list[(idx + 1) % list.length]
  playById(next.id)
}

export function startBGM() {
  if (!enabled) return
  const list = activeTracks()
  if (!list.length) return
  // resume current or start from beginning
  const resumeId = list.find(t => t.id === currentId) ? currentId : list[0].id
  playById(resumeId)
}

export function stopBGM() {
  if (audio) { audio.pause(); audio.currentTime = 0 }
  currentId = null
  emit()
}

export function pauseBGM() {
  if (audio) audio.pause()
}

export function resumeBGM() {
  if (!enabled) return
  if (audio && currentId) {
    audio.play().catch(() => startBGM())
  } else {
    startBGM()
  }
}

// ─── Public controls ─────────────────────────────────────────────────────────
export function setBGMVolume(vol) {
  bgmVol = Math.max(0, Math.min(100, Math.round(vol)))
  store.set('j3d_bgm_vol', bgmVol)
  if (audio) audio.volume = bgmVol / 100
}

export function getBGMVolume() { return bgmVol }

export function setBGMEnabled(on) {
  enabled = on
  store.set('j3d_bgm_on', on)
  if (on) resumeBGM(); else pauseBGM()
  emit()
}

export function toggleInPlaylist(id) {
  if (inPlaylist.includes(id)) {
    if (inPlaylist.length <= 1) return   // must keep at least one
    inPlaylist = inPlaylist.filter(x => x !== id)
    if (currentId === id) playNext()
  } else {
    inPlaylist = [...inPlaylist, id]
  }
  store.set('j3d_bgm_list', inPlaylist)
  emit()
}

export function moveTrack(id, dir) {   // dir: -1 up / +1 down
  const i = order.indexOf(id)
  const j = i + dir
  if (j < 0 || j >= order.length) return
  const next = [...order]
  ;[next[i], next[j]] = [next[j], next[i]]
  order = next
  store.set('j3d_bgm_order', order)
  emit()
}

export function playTrack(id) {
  if (!enabled) return
  playById(id)
}

// ─── First-interaction unlock ─────────────────────────────────────────────────
function tryStart() {
  if (started) return
  started = true
  if (enabled) startBGM()
  document.removeEventListener('click',     tryStart)
  document.removeEventListener('touchstart', tryStart)
}
document.addEventListener('click',      tryStart, { once: true })
document.addEventListener('touchstart', tryStart, { once: true })
