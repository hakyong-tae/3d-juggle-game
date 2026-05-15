// ─── Verse8 Ads — SDK wrapper ─────────────────────────────────────────────────
//
// 로컬 개발  → mock 오버레이 (showMockAd)로 자동 fallback
// Verse8 배포 → @verse8/ads SDK 자동 사용
//
// Verse8 배포 시 package.json에 추가:
//   "dependencies": { "@verse8/ads": "0.2.0" }
//
// Placement ID 목록 — 서버 REWARD_TABLE과 반드시 일치해야 함
// ─────────────────────────────────────────────────────────────────────────────

export const PLACEMENTS = {
  UNLOCK_ROBBEN: 'unlock-robben',   // Robben 캐릭터 광고 해금 (1회)
  UNLOCK_MODRIC: 'unlock-modric',   // Modric 캐릭터 광고 해금 (2회)
  REVIVE:        'revive-player',   // 게임오버 후 부활
  DOUBLE_COINS:  'double-coins',    // 게임 종료 후 코인 3배
}

// ── SDK lazy-load (import 실패 = 로컬 개발 환경) ─────────────────────────────
let _sdk         = null
let _sdkLoaded   = false
let _unsupported = false   // unsupported_env 수신 시 이후 호출도 mock으로
let _busy        = false

async function _loadSDK() {
  if (_sdkLoaded) return _sdk
  _sdkLoaded = true
  try {
    const m = await import('@verse8/ads')
    _sdk = m.Verse8Ads ?? m.default ?? null
  } catch {
    _sdk = null   // 로컬 dev — 패키지 없음
  }
  return _sdk
}

// ── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * isBusy() — 광고 표시 중 여부. 버튼 비활성화에 사용.
 */
export function isBusy() { return _busy }

/**
 * showRewarded(placementId, mockFn)
 *
 * Verse8 SDK 시도 → 실패/미지원 시 mockFn으로 fallback.
 *
 * @param {string}   placementId  PLACEMENTS.* 상수
 * @param {Function} mockFn       (onRewarded: ()=>void) => void
 *                                 ← lobby.js showMockAd 시그니처와 동일
 * @returns {Promise<'rewarded' | 'dismissed' | 'failed'>}
 *
 * Usage:
 *   const status = await showRewarded(PLACEMENTS.REVIVE, showMockAd)
 *   if (status === 'rewarded') grantRevive()
 */
export async function showRewarded(placementId, mockFn) {
  if (_busy) return 'failed'
  _busy = true

  try {
    const sdk = await _loadSDK()

    // ── Real SDK path ──
    if (sdk && !_unsupported) {
      let result
      try {
        result = await sdk.showRewarded({ placementId })
      } catch (e) {
        result = { status: 'failed', error: { code: 'platform_error' }, requestId: '' }
      }

      switch (result.status) {
        case 'rewarded':  return 'rewarded'
        case 'dismissed': return 'dismissed'
        case 'failed':
          if (result.error?.code === 'busy')            return 'failed'
          if (result.error?.code === 'unsupported_env') { _unsupported = true; break }
          if (result.error?.code === 'timeout')         return 'failed'
          return 'failed'
      }
      // unsupported_env → fall through to mock
    }

    // ── Mock fallback (로컬 dev / 비-Verse8 환경) ──
    // mockFn은 (onRewarded) 단일 콜백만 받는 기존 showMockAd 시그니처
    return new Promise(resolve => {
      mockFn(() => resolve('rewarded'))
    })

  } finally {
    _busy = false
  }
}
