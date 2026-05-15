// ─── Verse8 Ads — full SDK integration ────────────────────────────────────────
//
// 로컬 dev   → mock 오버레이 (showMockAd) fallback
// Verse8 배포 → @verse8/ads SDK 자동 사용
//
// Placement IDs
export const PLACEMENTS = {
  UNLOCK_ROBBEN: 'unlock-robben',   // 캐릭터 해금 (1회)
  UNLOCK_MODRIC: 'unlock-modric',   // 캐릭터 해금 (2회)
  REVIVE:        'revive-player',   // 부활 (검증 O)
  DOUBLE_COINS:  'double-coins',    // 코인 3배 (검증 O)
  GAME_START:    'game-start',      // 게임 시작 전 인터스티셜 (보상 없음)
}

// ── SDK lazy-load (Function 생성자 → Vite 정적 분석 우회) ─────────────────────
const _dynImport = new Function('p', 'return import(p)')
let _sdk         = null
let _sdkLoaded   = false
let _unsupported = false
let _busy        = false

async function _loadSDK() {
  if (_sdkLoaded) return _sdk
  _sdkLoaded = true
  try {
    const m = await _dynImport('@verse8/ads')
    // 공식 export: { Verse8Ads }
    _sdk = m.Verse8Ads ?? m.default?.Verse8Ads ?? m.default ?? null
  } catch {
    _sdk = null   // 로컬 dev — 패키지 없음
  }
  return _sdk
}

// ── 클라이언트 사이드 광고 검증 (ads-verifier.verse8.io) ──────────────────────
// 서버 미보유 게임용 — 보상 지급 전 requestId 검증
async function _verifyAd(requestId, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `https://ads-verifier.verse8.io/ads/status?requestId=${encodeURIComponent(requestId)}`
      )
      if (!res.ok && res.status !== 202) return false
      const body = await res.json()
      if (body.status === 'verified') return true
      if (body.status === 'pending') {
        await new Promise(r => setTimeout(r, 1500))
        continue
      }
      return false  // dismissed | failed
    } catch {
      return false
    }
  }
  return false
}

// ── 공개 상태 조회 ─────────────────────────────────────────────────────────────
export function isBusy()           { return _busy        }
export function isUnsupportedEnv() { return _unsupported }

// ── showRewarded ───────────────────────────────────────────────────────────────
// @param placementId  PLACEMENTS.* 상수
// @param mockFn       (onRewarded: ()=>void) => void  ← showMockAd 시그니처
// @param verify       true = ads-verifier.verse8.io 검증 후 보상 (REVIVE, DOUBLE_COINS)
// @returns Promise<'rewarded' | 'dismissed' | 'failed' | 'busy' | 'unsupported'>
export async function showRewarded(placementId, mockFn, { verify = false } = {}) {
  if (_busy) return 'busy'
  _busy = true

  try {
    const sdk = await _loadSDK()

    if (sdk && !_unsupported) {
      let result
      try {
        result = await sdk.showRewarded({ placementId })
      } catch (e) {
        result = { status: 'failed', error: { code: 'platform_error', message: e?.message }, requestId: '' }
      }

      switch (result.status) {
        case 'rewarded': {
          if (verify && result.requestId) {
            const ok = await _verifyAd(result.requestId)
            if (!ok) return 'failed'
          }
          return 'rewarded'
        }
        case 'dismissed':
          return 'dismissed'
        case 'failed': {
          const code = result.error?.code
          if (code === 'busy')            return 'busy'
          if (code === 'unsupported_env') {
            _unsupported = true
            // unsupported_env → 광고 UI 숨기도록 이벤트 발행
            window.dispatchEvent(new CustomEvent('adUnsupported'))
            return 'unsupported'
          }
          return 'failed'
        }
      }
    }

    // ── Mock fallback (로컬 dev / 비-Verse8 환경) ──────────────────────────────
    return new Promise(resolve => {
      mockFn(() => resolve('rewarded'))
    })

  } finally {
    _busy = false
  }
}

// ── showInterstitial ───────────────────────────────────────────────────────────
// 보상 없음 — 결과를 분기하지 않음. 실패해도 무시.
export async function showInterstitial(placementId) {
  if (_unsupported) return
  const sdk = await _loadSDK()
  if (!sdk) return   // 로컬 dev — 인터스티셜 생략
  try {
    await sdk.showInterstitial({ placementId })
  } catch {
    // 인터스티셜 실패는 항상 무시
  }
}
