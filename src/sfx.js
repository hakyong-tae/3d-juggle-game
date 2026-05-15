// ─── SFX System ───────────────────────────────────────────────────────────────
import urlKick        from './audio/sfx/kick.mp3'
import urlKickSoft    from './audio/sfx/kick-soft.mp3'
import urlKickMiddle  from './audio/sfx/kick-middle.mp3'
import urlKickStrong  from './audio/sfx/kick-strong.mp3'
import urlBounce      from './audio/sfx/wall-bounce.mp3'
import urlFloor       from './audio/sfx/floor-drop.mp3'
import urlCoin        from './audio/sfx/coin-collect.mp3'
import urlGameOver    from './audio/sfx/game-over.mp3'
import urlNewRecord   from './audio/sfx/new-record.mp3'
import urlMilestone   from './audio/sfx/milestone.mp3'
import urlGameStart   from './audio/sfx/game-start.mp3'
import urlBtnTap      from './audio/sfx/btn-tap.mp3'
import urlShopBuy     from './audio/sfx/shop-buy.mp3'

const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
}

// ─── Pool: reuse Audio instances to allow rapid re-triggering ────────────────
const POOL_SIZE = 3
const pools = {}

function getPool(url) {
  if (!pools[url]) {
    pools[url] = Array.from({ length: POOL_SIZE }, () => {
      const a = new Audio(url)
      a.preload = 'auto'
      return a
    })
    pools[url]._idx = 0
  }
  return pools[url]
}

function _play(url, volume = 1.0) {
  const s = store.get('j3d_settings', { sound: true, sfxVol: 80 })
  if (!s.sound) return
  const sfxMult = (s.sfxVol ?? 80) / 100
  const pool = getPool(url)
  const a = pool[pool._idx % POOL_SIZE]
  pool._idx++
  a.volume = Math.min(1, volume * sfxMult)
  a.currentTime = 0
  a.play().catch(() => {})
}

// ─── Kick: pick variant by power (6–22 range) ────────────────────────────────
// soft   < 10   kick-soft.mp3
// middle 10–16  kick-middle.mp3
// strong > 16   kick-strong.mp3
function _kick(power) {
  // Normalise volume within each tier so it scales smoothly
  if (power < 10) {
    const vol = 0.40 + (power - 6) / 4 * 0.25   // 0.40 → 0.65
    _play(urlKickSoft, vol)
  } else if (power < 16) {
    const vol = 0.55 + (power - 10) / 6 * 0.25  // 0.55 → 0.80
    _play(urlKickMiddle, vol)
  } else {
    const vol = 0.72 + (power - 16) / 6 * 0.23  // 0.72 → 0.95
    _play(urlKickStrong, vol)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const sfx = {
  kick:       (power = 10) => _kick(power),
  bounce:     (vol = 0.4) => _play(urlBounce,    vol),
  floorDrop:  (vol = 0.5) => _play(urlFloor,     vol),
  coin:       (vol = 0.7) => _play(urlCoin,       vol),
  gameOver:   (vol = 0.7) => _play(urlGameOver,  vol),
  newRecord:  (vol = 0.8) => _play(urlNewRecord, vol),
  milestone:  (vol = 0.6) => _play(urlMilestone, vol),
  gameStart:  (vol = 0.6) => _play(urlGameStart, vol),
  btnTap:     (vol = 0.4) => _play(urlBtnTap,    vol),
  shopBuy:    (vol = 0.7) => _play(urlShopBuy,   vol),
}
