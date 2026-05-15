import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import ballGlbUrl          from './assets/ball.glb?url'
import soccerBallGlbUrl    from './assets/soccer_ball.glb?url'
import vintageBallGlbUrl   from './assets/vintage_ball.glb?url'
import volleyballGlbUrl    from './assets/volleyball_ball.glb?url'
import basketballGlbUrl    from './assets/basketball_ball.glb?url'
import baseballGlbUrl      from './assets/baseball_ball.glb?url'
import tennisBallGlbUrl    from './assets/tennis_ball.glb?url'
import triondaBallGlbUrl   from './assets/trionda.glb?url'
import colormapUrl         from './assets/Textures/colormap.png?url'
import { sfx } from './sfx.js'

// ─── Mobile detection ─────────────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
             || window.innerWidth < 768

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAVITY        = -20
const BALL_RADIUS    = 0.22   // soccer ball base radius (scene units)
let   _ballRadius    = BALL_RADIUS   // current radius – updated on ball change
const WALL_X         = 2.4
const FLOOR_Y        = -3.8
const BALL_SPAWN_Y   = 1.5
const FOOT_W         = 0.44
const FOOT_H         = 0.10
const KICK_POWER     = 13.5
const BOUNCE_DAMPING = 0.60
const SPIN_DECAY     = 0.93
const METERS_SCALE   = 0.4
const FOOT_LERP      = 14

// ─── Renderer ─────────────────────────────────────────────────────────────────
const container = document.getElementById('canvas-container')
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2))
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

// ─── CSS2D Renderer (for 3D-anchored HTML labels) ─────────────────────────────
const css2dRenderer = new CSS2DRenderer()
css2dRenderer.setSize(window.innerWidth, window.innerHeight)
css2dRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;'
container.appendChild(css2dRenderer.domElement)

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100)

// Smooth camera lerp state
const _camPos  = new THREE.Vector3()   // current lerped position
const _camLook = new THREE.Vector3()   // current lerped look-at target
let   _charPreviewMode = false

// ─── Drop zoom (ball hits floor) ──────────────────────────────────────────────
let _dropZoomT  = -1   // -1 = inactive; ≥0 = seconds elapsed since drop
let _dropBallX  =  0   // x where ball fell

const DROP_ZOOM_IN   = 0.30   // seconds to reach full zoom
// Note: zoom is cleared explicitly in _proceedAfterDrop() / endGame() / startGame()

// ─── Slow-motion replay (ball hits floor) ─────────────────────────────────────
let _slowMoT    = -1   // -1 = inactive; ≥0 = real seconds elapsed
const SLOW_MO_SCALE = 0.14   // physics time-scale during replay
const SLOW_MO_HOLD  = 2.0    // real seconds before proceeding

function _slowMoEnabled() {
  try { return JSON.parse(localStorage.getItem('j3d_settings'))?.slowMo !== false }
  catch { return true }
}

function _proceedAfterDrop() {
  _slowMoT = -1
  clearDropZoom()
  // WC mode: skip revive if already hit the target (no need to continue)
  const wcAlreadyPassed = gameMode === 'wc2026' && kickCount >= _wcRoundTarget
  if ((gameMode === 'classic' || (gameMode === 'wc2026' && !wcAlreadyPassed)) && !hasUsedRevive) {
    state = 'reviving'
    window.dispatchEvent(new CustomEvent('requestRevive'))
  } else {
    state = 'playing'   // allow endGame() guard to pass
    endGame()
  }
}

function startDropZoom(ballX) {
  _dropZoomT = 0
  _dropBallX = ballX
}
function clearDropZoom() {
  _dropZoomT = -1
}

function lobbyDefaultCamPos() {
  const z = window.innerWidth / window.innerHeight < 1 ? 9.5 : 13
  return new THREE.Vector3(0, 0.5, z)
}
function lobbyDefaultCamLook() { return new THREE.Vector3(0, 1, 0) }

// Character close-up: pull camera back so the full body fits above the 42vh chars panel.
// Look target aimed at floor level so character (y≈-2.5, top≈-1.58, bot≈-3.35)
// spans roughly 9%–48% of canvas height — safely above panel at 58%.
const CAM_PREVIEW_POS  = new THREE.Vector3(0, -0.8, 4.0)
const CAM_PREVIEW_LOOK = new THREE.Vector3(0, -3.8, 0)

function setCamera() {
  const p = lobbyDefaultCamPos()
  camera.position.copy(p)
  _camPos.copy(p)
  _camLook.copy(lobbyDefaultCamLook())
  camera.lookAt(_camLook)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
setCamera()

window.addEventListener('charPreviewToggle', e => {
  _charPreviewMode = !!(e.detail?.active)
  // Hide ball & shadow in preview so only the character is visible
  ball.visible = !_charPreviewMode
  blob.visible = !_charPreviewMode
})

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x7ab2d0)
scene.fog = new THREE.Fog(0x7ab2d0, 20, 40)

// Lights
scene.add(new THREE.AmbientLight(0xffeedd, 2.0))

const sun = new THREE.DirectionalLight(0xfff8e0, 3.0)
sun.position.set(4, 10, 6)
sun.castShadow = !isMobile
sun.shadow.mapSize.width  = 512
sun.shadow.mapSize.height = 512
sun.shadow.camera.left   = -6
sun.shadow.camera.right  =  6
sun.shadow.camera.top    =  8
sun.shadow.camera.bottom = -4
sun.shadow.camera.near   = 0.5
sun.shadow.camera.far    = 30
sun.shadow.camera.updateProjectionMatrix()
scene.add(sun)

const fill = new THREE.DirectionalLight(0xaaddff, 0.8)
fill.position.set(-4, 3, -2)
scene.add(fill)

renderer.shadowMap.enabled = !isMobile
renderer.shadowMap.type = THREE.PCFShadowMap   // PCF (PCFSoft 보다 빠름)

// ─── Ground ───────────────────────────────────────────────────────────────────
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 22),
  new THREE.MeshLambertMaterial({ color: 0x9aaa88 })
)
groundMesh.rotation.x = -Math.PI / 2
groundMesh.position.y = FLOOR_Y
groundMesh.receiveShadow = true
scene.add(groundMesh)

const paveMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(WALL_X * 2, 22),
  new THREE.MeshLambertMaterial({ color: 0xc4b89a })
)
paveMesh.rotation.x = -Math.PI / 2
paveMesh.position.y = FLOOR_Y + 0.01
paveMesh.receiveShadow = true
scene.add(paveMesh)

// ─── Walls ────────────────────────────────────────────────────────────────────
function makeWall(side) {
  const g = new THREE.Group()
  const W = 0.4, H = 14

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 5.5),
    new THREE.MeshLambertMaterial({ color: side > 0 ? 0xc8a882 : 0xa0b8c0 })
  )
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)

  const winMat = new THREE.MeshLambertMaterial({ color: 0x4477aa })
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.52), winMat)
      win.position.set(side * W * 0.4, -H / 2 + 1.5 + row * 1.55, -0.9 + col * 1.8)
      g.add(win)
    }
  }

  g.position.set(side * (WALL_X + W / 2), FLOOR_Y + H / 2, -0.5)
  return g
}
scene.add(makeWall(1))
scene.add(makeWall(-1))

// Far buildings
const buildingData = [[-5.2, 0xb09878, 13], [5.5, 0x889898, 10], [-4, 0xaa9070, 8], [4.8, 0x9a8878, 11]]
buildingData.forEach(([x, col, h]) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, h, 1.2),
    new THREE.MeshLambertMaterial({ color: col })
  )
  m.position.set(x, FLOOR_Y + h / 2, -3)
  m.castShadow = true
  scene.add(m)
})

// ─── 3D Scoreboard Billboards (CSS2DRenderer) ────────────────────────────────
// HTML elements anchored to 3D world positions — always crisp, correct size.
// Server integration: dispatch 'rankUpdate' with { classic, ta, ch } arrays.
;(function initScoreboards() {
  // Build one scoreboard section as HTML string
  function sectionHTML(title, titleColor, entries, unit) {
    const rows = entries.map((e, i) => {
      const medals = ['🥇','🥈','🥉']
      const medal  = i < 3 ? medals[i] : `<span style="color:rgba(255,255,255,.4);font-size:10px">#${i+1}</span>`
      const isTop  = i === 0
      return `<div class="sb-row${isTop?' sb-top':''}">
        <span class="sb-medal">${medal}</span>
        <span class="sb-name">${(e.name||'Player').toUpperCase().slice(0,8)}</span>
        <span class="sb-score" style="color:${titleColor}">${e.score}${unit}</span>
      </div>`
    }).join('')
    return `<div class="sb-section">
      <div class="sb-title" style="color:${titleColor};border-bottom:1px solid ${titleColor}44">${title}</div>
      ${rows}
    </div>`
  }

  // Inject scoreboard CSS once
  if (!document.getElementById('sb-css')) {
    const style = document.createElement('style')
    style.id = 'sb-css'
    style.textContent = `
      .sb-board {
        background: rgba(4,6,18,0.92);
        border-radius: 10px;
        overflow: hidden;
        font-family: 'Arial', sans-serif;
        min-width: 140px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.6);
        pointer-events: none;
        transform: translateX(-50%);
      }
      .sb-board-left  { border: 1px solid rgba(255,200,40,0.35); }
      .sb-board-right { border: 1px solid rgba(80,200,255,0.35); }
      .sb-section { padding: 0; }
      .sb-title {
        font-size: 9px; font-weight: 900; letter-spacing: 2px;
        text-align: center; padding: 5px 8px 4px;
        background: rgba(255,255,255,0.04);
        text-transform: uppercase;
      }
      .sb-row {
        display: flex; align-items: center; gap: 5px;
        padding: 4px 8px; font-size: 11px;
      }
      .sb-row:nth-child(even) { background: rgba(255,255,255,0.03); }
      .sb-top { background: rgba(255,200,40,0.07) !important; }
      .sb-board-right .sb-top { background: rgba(80,200,255,0.07) !important; }
      .sb-medal { font-size: 11px; min-width: 18px; text-align: center; flex-shrink:0; }
      .sb-name  { flex:1; font-weight:700; color:rgba(255,255,255,0.9); font-size:11px; }
      .sb-score { font-weight:900; font-size:11px; flex-shrink:0; }
      .sb-divider { height:1px; background:rgba(255,255,255,0.08); margin:0 8px; }
    `
    document.head.appendChild(style)
  }

  // Create the two board DOM elements
  const divL = document.createElement('div')
  divL.className = 'sb-board sb-board-left'
  const divR = document.createElement('div')
  divR.className = 'sb-board sb-board-right'

  // Wrap in CSS2DObjects and position outside walls
  // x=±3.2: outside WALL_X=2.4 (outer wall edge ≈2.8)
  // z=2.3: floating in front of wall columns
  const objL = new CSS2DObject(divL)
  objL.position.set(-3.9, 0.8, 2.3)
  scene.add(objL)

  const objR = new CSS2DObject(divR)
  objR.position.set(3.9, 0.8, 2.3)
  scene.add(objR)

  function updateScoreboards({ classic = [], ta = [], ch = [] } = {}) {
    if (!classic.length && !ta.length && !ch.length) return

    divL.innerHTML = sectionHTML('⚽ Classic', '#ffc828', classic.slice(0, 8), '')

    const taHTML = sectionHTML('⏱ Time Attack', '#50c8ff', ta.slice(0, 3), '')
    const chHTML = sectionHTML('🎯 Challenge',  '#50ffa0', ch.slice(0, 3), 'm')
    divR.innerHTML = taHTML + '<div class="sb-divider"></div>' + chHTML
  }

  window.addEventListener('rankUpdate', e => updateScoreboards(e.detail))
  window.updateScoreboards = updateScoreboards
})()

// ─── Character body ───────────────────────────────────────────────────────────
// Geometry palette (default / reference colors — updated live by charChanged)
const SKIN_COL  = 0xf4c08a
const SHIRT_COL = 0xcc2222
const SHORT_COL = 0x222266
const HAIR_COL  = 0x332211
const SHOE_COL  = 0x333333

function buildBody() {
  const g = new THREE.Group()

  // Generic mesh factory with role tag
  function part(geo, col, role, px, py, pz) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }))
    m.position.set(px, py, pz)
    m.castShadow = true
    m.userData.role = role
    g.add(m)
    return m
  }
  function box(w, h, d, col, role, px, py, pz) {
    return part(new THREE.BoxGeometry(w, h, d), col, role, px, py, pz)
  }
  function sph(r, ws, hs, col, role, px, py, pz) {
    return part(new THREE.SphereGeometry(r, ws, hs), col, role, px, py, pz)
  }

  // ── Head (sphere, r=0.30, centre y=0.64) ─────────────────────────────────
  sph(0.30, 20, 14, SKIN_COL,  'skin',  0,      0.64,   0)

  // Eyes — small boxes on the front face of the sphere
  box(0.085, 0.072, 0.04, 0x111111, 'eye', -0.105,  0.665,  0.282)
  box(0.085, 0.072, 0.04, 0x111111, 'eye',  0.105,  0.665,  0.282)

  // Eyebrows — thin strips above eyes
  box(0.110, 0.038, 0.03, HAIR_COL, 'brow', -0.105,  0.724,  0.272)
  box(0.110, 0.038, 0.03, HAIR_COL, 'brow',  0.105,  0.724,  0.272)

  // Ear nubs — tiny skin bumps on the sides
  box(0.06, 0.10, 0.06, SKIN_COL, 'skin', -0.30,  0.64,  0)
  box(0.06, 0.10, 0.06, SKIN_COL, 'skin',  0.30,  0.64,  0)

  // ── Neck ─────────────────────────────────────────────────────────────────
  box(0.17, 0.11, 0.15, SKIN_COL, 'skin', 0, 0.345, 0)

  // ── Torso ────────────────────────────────────────────────────────────────
  box(0.58, 0.60, 0.30, SHIRT_COL, 'shirt', 0, 0.04, 0)

  // Arms (shirt coloured)
  box(0.17, 0.48, 0.19, SHIRT_COL, 'shirt', -0.41, -0.02, 0)
  box(0.17, 0.48, 0.19, SHIRT_COL, 'shirt',  0.41, -0.02, 0)

  // Hands (skin)
  box(0.15, 0.15, 0.17, SKIN_COL, 'skin', -0.41, -0.305, 0)
  box(0.15, 0.15, 0.17, SKIN_COL, 'skin',  0.41, -0.305, 0)

  // ── Shorts ───────────────────────────────────────────────────────────────
  box(0.54, 0.30, 0.27, SHORT_COL, 'shorts', 0, -0.44, 0)

  // ── Left leg (shin + shoe) ──────────────────────────────────────────────
  const lShin = box(0.17, 0.36, 0.20, SKIN_COL, 'skin', -0.13, -0.645, 0)
  const lShoe = box(0.22, 0.12, 0.36, SHOE_COL, 'shoe', -0.13, -0.855, 0.055)
  lShin.name = 'lShin'
  lShoe.name = 'lShoe'

  // ── Right leg (shin + shoe) — hidden during play, kickFoot takes over ────
  const rShin = box(0.17, 0.36, 0.20, SKIN_COL, 'skin',  0.13, -0.645, 0)
  const rShoe = box(0.22, 0.12, 0.36, SHOE_COL, 'shoe',  0.13, -0.855, 0.055)
  rShin.name = 'rShin'
  rShoe.name = 'rShoe'

  // ── Hair group (swapped by applyHairStyle) ────────────────────────────────
  const hairGroup = new THREE.Group()
  hairGroup.name = 'hairGroup'
  g.add(hairGroup)
  // default cap (overwritten on first charChanged)
  const dh = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.14, 0.48),
    new THREE.MeshLambertMaterial({ color: HAIR_COL })
  )
  dh.position.set(0, 0.920, 0)
  dh.castShadow = true
  dh.userData.isHair = true
  hairGroup.add(dh)

  return g
}

const charBody = buildBody()
charBody.position.set(0, FLOOR_Y + 1.30, 0.1)
scene.add(charBody)

// ─── Kick foot ────────────────────────────────────────────────────────────────
function buildKickFoot() {
  const g = new THREE.Group()

  const shoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.13, 0.40),
    new THREE.MeshLambertMaterial({ color: SHOE_COL })
  )
  shoe.castShadow = true
  shoe.userData.role = 'shoe'
  g.add(shoe)

  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.04, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  )
  sole.position.y = -0.05
  g.add(sole)

  const shin = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.30, 0.20),
    new THREE.MeshLambertMaterial({ color: SKIN_COL })
  )
  shin.position.y = 0.20
  shin.userData.role = 'skin'
  g.add(shin)

  return g
}

const kickFoot = buildKickFoot()
kickFoot.position.set(0, FLOOR_Y + 0.3, 0.15)
kickFoot.visible = false
scene.add(kickFoot)

// ─── Ball canvas texture – per-sport drawing ────────────────────────────────
let _ballTexture = null

function makeBallTexture(baseHex, patchHex = 0x111111, style = 'soccer') {
  const S = 512
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')

  // helpers ──────────────────────────────────────────────────────────────────
  const ch = (h, a = 1) =>
    `rgba(${(h>>16)&255},${(h>>8)&255},${h&255},${a})`
  const cl = v => Math.max(0, Math.min(255, Math.round(v)))

  // great-circle seam:  v = 0.5 + amp·sin(2π·freq·u + phase)
  const seam = (amp, freq = 1, phase = 0) => {
    ctx.beginPath()
    for (let i = 0; i <= S * 2; i++) {
      const u = i / (S * 2)
      const v = 0.5 + amp * Math.sin(2 * Math.PI * freq * u + phase)
      i === 0 ? ctx.moveTo(u*S, v*S) : ctx.lineTo(u*S, v*S)
    }
    ctx.stroke()
  }

  // soft radial highlight (top-left → dark edge)
  const highlight = (strength = 0.24) => {
    const hl = ctx.createRadialGradient(S*.38, S*.3, 0, S*.5, S*.5, S*.6)
    hl.addColorStop(0,    `rgba(255,255,255,${strength})`)
    hl.addColorStop(0.42, `rgba(255,255,255,${(strength*.08).toFixed(3)})`)
    hl.addColorStop(1,    'rgba(0,0,0,0.16)')
    ctx.fillStyle = hl; ctx.fillRect(0, 0, S, S)
  }

  // ── SOCCER ──────────────────────────────────────────────────────────────────
  if (style === 'soccer') {
    ctx.fillStyle = ch(baseHex); ctx.fillRect(0, 0, S, S)

    // Pentagon patch positions in UV space (upper-5, lower-5, polar-4)
    const pp = [
      [0.0,0.19],[0.2,0.19],[0.4,0.19],[0.6,0.19],[0.8,0.19],
      [0.1,0.81],[0.3,0.81],[0.5,0.81],[0.7,0.81],[0.9,0.81],
      [0.2,0.04],[0.7,0.04],[0.2,0.96],[0.7,0.96],
    ]
    const rots = [0,1.2,0.4,0.9,0.3,0.6,0.2,0.7,1.0,0.5,0.1,0.8,0.3,0.7]
    ctx.fillStyle = ch(patchHex)
    const drawPent = (ux, vy, rot) => {
      const r = S * 0.074
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = i * 2*Math.PI/5 - Math.PI/2 + rot
        const x = ux*S + r*Math.cos(a), y = vy*S + r*Math.sin(a)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill()
    }
    pp.forEach(([u, v], i) => {
      drawPent(u, v, rots[i])
      if (u < 0.15) drawPent(u + 1, v, rots[i])   // wrap left edge
      if (u > 0.85) drawPent(u - 1, v, rots[i])   // wrap right edge
    })
    highlight(0.22)
  }

  // ── BASKETBALL ──────────────────────────────────────────────────────────────
  else if (style === 'basketball') {
    const r=(baseHex>>16)&255, g=(baseHex>>8)&255, b=baseHex&255
    const rg = ctx.createRadialGradient(S*.38, S*.3, 0, S*.5, S*.5, S*.65)
    rg.addColorStop(0,   `rgb(${cl(r+45)},${cl(g+25)},${cl(b+5)})`)
    rg.addColorStop(0.6, `rgb(${r},${g},${b})`)
    rg.addColorStop(1,   `rgb(${cl(r-55)},${cl(g-55)},${cl(b-55)})`)
    ctx.fillStyle = rg; ctx.fillRect(0, 0, S, S)

    ctx.strokeStyle = ch(patchHex, 0.88); ctx.lineWidth = 10; ctx.lineCap = 'round'
    // equator
    ctx.beginPath(); ctx.moveTo(0, S/2); ctx.lineTo(S, S/2); ctx.stroke()
    // four banana seams (freq=2 gives 2 full oscillations = 4 banana segments)
    seam( 0.24, 2); seam(-0.24, 2)
    // faint meridian lines
    ctx.strokeStyle = ch(patchHex, 0.38); ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,S); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(S/2,0); ctx.lineTo(S/2,S); ctx.stroke()
  }

  // ── VOLLEYBALL ──────────────────────────────────────────────────────────────
  else if (style === 'volleyball') {
    ctx.fillStyle = ch(baseHex); ctx.fillRect(0, 0, S, S)

    // 3 colored panel ribbons, each offset by 1/3 in u
    ctx.fillStyle = ch(patchHex, 0.88)
    for (const uOff of [0, 1/3, 2/3]) {
      const phase = 2 * Math.PI * uOff
      ctx.beginPath()
      for (let i = 0; i <= S*2; i++) {          // top boundary
        const u = i/(S*2)
        const v = 0.14 + 0.30 * Math.sin(2*Math.PI*u + phase)
        i === 0 ? ctx.moveTo(u*S, v*S) : ctx.lineTo(u*S, v*S)
      }
      for (let i = S*2; i >= 0; i--) {          // bottom boundary (reverse)
        const u = i/(S*2)
        const v = 0.86 - 0.30 * Math.sin(2*Math.PI*u + phase)
        ctx.lineTo(u*S, v*S)
      }
      ctx.closePath(); ctx.fill()
    }
    // seam lines between panels
    ctx.strokeStyle = 'rgba(140,140,170,0.65)'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    for (const uOff of [0, 1/3, 2/3]) {
      const phase = 2*Math.PI*uOff
      seam( 0.30, 1, phase); seam(-0.30, 1, phase)
    }
    highlight(0.20)
  }

  // ── BASEBALL ────────────────────────────────────────────────────────────────
  else if (style === 'baseball') {
    ctx.fillStyle = ch(baseHex); ctx.fillRect(0, 0, S, S)

    // outer double stitching lines
    ctx.strokeStyle = ch(patchHex, 0.88); ctx.lineWidth = 8; ctx.lineCap = 'round'
    seam( 0.27, 1); seam(-0.27, 1)
    // inner parallel lines (tighter)
    ctx.strokeStyle = ch(patchHex, 0.50); ctx.lineWidth = 3
    seam( 0.20, 1); seam(-0.20, 1)

    // cross-stitch marks perpendicular to the seam
    ctx.strokeStyle = ch(patchHex, 0.72); ctx.lineWidth = 3
    for (let t = 0; t <= 1; t += 0.024) {
      for (const [amp, signA] of [[0.24, 1], [-0.24, -1]]) {
        const u  = t
        const v  = 0.5 + amp * Math.sin(2*Math.PI*u)
        const dv = amp * 2*Math.PI * Math.cos(2*Math.PI*u)
        const len = Math.sqrt(1 + dv*dv)
        const nx = -dv/len * (signA * 0.03 * S)  // perpendicular
        const ny =   1/len * (signA * 0.03 * S)
        ctx.beginPath()
        ctx.moveTo(u*S + nx, v*S + ny)
        ctx.lineTo(u*S - nx, v*S - ny)
        ctx.stroke()
      }
    }
    highlight(0.18)
  }

  // ── PING PONG ────────────────────────────────────────────────────────────────
  else {   // 'pingpong' (and fallback)
    ctx.fillStyle = ch(baseHex); ctx.fillRect(0, 0, S, S)
    // strong specular for glossy plastic
    const hl = ctx.createRadialGradient(S*.30, S*.25, 0, S*.5, S*.5, S*.62)
    hl.addColorStop(0,    'rgba(255,255,255,0.72)')
    hl.addColorStop(0.14, 'rgba(255,255,255,0.28)')
    hl.addColorStop(0.32, 'rgba(255,255,255,0.04)')
    hl.addColorStop(1,    'rgba(0,0,0,0.08)')
    ctx.fillStyle = hl; ctx.fillRect(0, 0, S, S)
  }

  if (_ballTexture) _ballTexture.dispose()
  _ballTexture = new THREE.CanvasTexture(canvas)
  return _ballTexture
}

// ─── Ball material (shared, updated on color change) ──────────────────────────
const _ballMat = new THREE.MeshPhysicalMaterial({
  roughness: 0.45,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.12,
})

let _ballMeshMat = null   // material for the loaded Kenney GLB mesh

// OBJ ball materials — vertex colors baked from the OBJ file
const _ballMatObjSoccer     = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.42, metalness:0.0,  clearcoat:0.50, clearcoatRoughness:0.10 })
const _ballMatObjVintage    = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.75, metalness:0.04, clearcoat:0.12, clearcoatRoughness:0.40 })
const _ballMatObjVolleyball = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.38, metalness:0.0,  clearcoat:0.55, clearcoatRoughness:0.08 })
const _ballMatObjBasketball = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.72, metalness:0.0,  clearcoat:0.06, clearcoatRoughness:0.60 })
const _ballMatObjBaseball   = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.58, metalness:0.0,  clearcoat:0.22, clearcoatRoughness:0.35 })
const _ballMatObjTennis     = new THREE.MeshPhysicalMaterial({ vertexColors:true, roughness:0.88, metalness:0.0,  clearcoat:0.02, clearcoatRoughness:0.90 })

// OBJ-loaded scenes (null until the respective GLB finishes loading)
let _soccerObjScene     = null
let _vintageObjScene    = null
let _volleyballObjScene = null
let _basketballObjScene = null
let _baseballObjScene   = null
let _tennisObjScene     = null
let _triondaObjScene    = null   // FIFA Trionda 2026 — real GLB with embedded textures
let _kenneyScene        = null
let _activeMeshStyle    = 'kenney'

// Map meshStyle → { scene ref getter, material }
// mat=null means "keep embedded GLB materials" (used for Trionda)
const _OBJ_DEFS = [
  { style:'obj_soccer',     getScene:()=>_soccerObjScene,     mat:null                  }, // Trionda GLB — keep embedded PBR
  { style:'obj_vintage',    getScene:()=>_vintageObjScene,    mat:_ballMatObjVintage    },
  { style:'obj_volleyball', getScene:()=>_volleyballObjScene, mat:_ballMatObjVolleyball },
  { style:'obj_basketball', getScene:()=>_basketballObjScene, mat:_ballMatObjBasketball },
  { style:'obj_baseball',   getScene:()=>_baseballObjScene,   mat:_ballMatObjBaseball   },
  { style:'obj_tennis',     getScene:()=>_tennisObjScene,     mat:_ballMatObjTennis     },
  { style:'obj_trionda',    getScene:()=>_triondaObjScene,    mat:null                  },
]

function _setActiveBallScene(meshStyle) {
  _activeMeshStyle = meshStyle ?? 'kenney'
  const isKenney = !_activeMeshStyle.startsWith('obj_')
  if (_kenneyScene) _kenneyScene.visible = isKenney
  for (const d of _OBJ_DEFS) {
    const sc = d.getScene()
    if (sc) sc.visible = (d.style === _activeMeshStyle)
  }
  // placeholder: visible only while the right mesh hasn't loaded yet
  const ph = ball.getObjectByName('placeholder')
  if (ph) {
    const def = _OBJ_DEFS.find(d => d.style === _activeMeshStyle)
    const ready = isKenney ? !!_kenneyScene : (def && !!def.getScene())
    ph.visible = !ready
  }
}

function applyBallColors(baseCol, patchCol = 0x111111, style = 'soccer') {
  const tex = makeBallTexture(baseCol, patchCol, style)

  // Material properties per sport
  const props =
    style === 'pingpong'    ? { roughness:0.12, clearcoat:0.95, clearcoatRoughness:0.04 } :
    style === 'basketball'  ? { roughness:0.68, clearcoat:0.08, clearcoatRoughness:0.50 } :
    style === 'baseball'    ? { roughness:0.55, clearcoat:0.20, clearcoatRoughness:0.30 } :
    /* soccer/volleyball */   { roughness:0.42, clearcoat:0.45, clearcoatRoughness:0.12 }

  for (const mat of [_ballMat, _ballMeshMat]) {
    if (!mat) continue
    mat.map = tex
    Object.assign(mat, props)
    mat.needsUpdate = true
  }
}

// ─── Ball mesh loading ─────────────────────────────────────────────────────────
function buildBall() {
  const g = new THREE.Group()

  // Placeholder sphere shown until the active mesh loads
  const placeholder = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
    _ballMat
  )
  placeholder.castShadow = true
  placeholder.name = 'placeholder'
  g.add(placeholder)

  // ── Kenney ball (canvas-texture, used for all non-OBJ styles) ────────────
  const mgr = new THREE.LoadingManager()
  mgr.setURLModifier(url => {
    if (url.includes('colormap.png')) return colormapUrl
    return url
  })
  new GLTFLoader(mgr).load(ballGlbUrl, gltf => {
    const box3  = new THREE.Box3().setFromObject(gltf.scene)
    const size3 = box3.getSize(new THREE.Vector3())
    const scale = (BALL_RADIUS * 2) / Math.max(size3.x, size3.y, size3.z)
    gltf.scene.scale.setScalar(scale)

    gltf.scene.traverse(child => {
      if (!child.isMesh) return
      // Remap atlas UVs → equirectangular spherical UVs
      const pos = child.geometry.attributes.position
      const uvArr = new Float32Array(pos.count * 2)
      const _n = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) {
        _n.fromBufferAttribute(pos, i).normalize()
        uvArr[i*2]   = 0.5 + Math.atan2(_n.z, _n.x) / (2 * Math.PI)
        uvArr[i*2+1] = 0.5 + Math.asin(Math.max(-1, Math.min(1, _n.y))) / Math.PI
      }
      child.geometry.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
      _ballMeshMat = new THREE.MeshPhysicalMaterial({
        map: _ballTexture, roughness: 0.45, metalness: 0.0,
        clearcoat: 0.45, clearcoatRoughness: 0.12,
      })
      child.material = _ballMeshMat
      child.castShadow = true
    })

    _kenneyScene = gltf.scene
    gltf.scene.visible = (_activeMeshStyle === 'kenney')
    g.add(gltf.scene)
    _setActiveBallScene(_activeMeshStyle)   // re-check placeholder
  }, undefined, err => console.warn('Kenney GLB failed', err))

  return g
}

const ball = buildBall()
scene.add(ball)

// ─── Lazy ball loader ─────────────────────────────────────────────────────────
// OBJ balls are only downloaded when first selected (saves ~10MB on startup)
const _LAZY_BALL_URLS = {
  obj_soccer:     soccerBallGlbUrl,
  obj_vintage:    vintageBallGlbUrl,
  obj_volleyball: volleyballGlbUrl,
  obj_basketball: basketballGlbUrl,
  obj_baseball:   baseballGlbUrl,
  obj_tennis:     tennisBallGlbUrl,
  obj_trionda:    triondaBallGlbUrl,
}
const _loadedBallStyles = new Set(['kenney'])

function _lazyLoadBall(style) {
  if (!style || style === 'kenney') return
  if (_loadedBallStyles.has(style)) return
  _loadedBallStyles.add(style)

  const url = _LAZY_BALL_URLS[style]
  if (!url) return

  const loader = new GLTFLoader()

  if (style === 'obj_trionda') {
    loader.load(url, gltf => {
      const box3 = new THREE.Box3().setFromObject(gltf.scene)
      const size3 = box3.getSize(new THREE.Vector3())
      const scale = (BALL_RADIUS * 2) / Math.max(size3.x, size3.y, size3.z)
      gltf.scene.scale.setScalar(scale)
      gltf.scene.traverse(child => { if (child.isMesh) child.castShadow = !isMobile })
      _triondaObjScene = gltf.scene
      gltf.scene.visible = (_activeMeshStyle === 'obj_trionda')
      ball.add(gltf.scene)
      _setActiveBallScene(_activeMeshStyle)
    }, undefined, err => console.warn('Trionda GLB failed', err))
    return
  }

  const def = _OBJ_DEFS.find(d => d.style === style)
  if (!def) return

  loader.load(url, gltf => {
    // mat=null인 경우(Trionda 등 PBR 내장 GLB) bounding box로 정확한 스케일 계산
    if (def.mat === null) {
      const box3  = new THREE.Box3().setFromObject(gltf.scene)
      const size3 = box3.getSize(new THREE.Vector3())
      const scale = (BALL_RADIUS * 2) / Math.max(size3.x, size3.y, size3.z)
      gltf.scene.scale.setScalar(scale)
    } else {
      gltf.scene.scale.setScalar(BALL_RADIUS)
    }
    gltf.scene.traverse(child => {
      if (!child.isMesh) return
      if (def.mat) child.material = def.mat
      child.castShadow = !isMobile
    })
    gltf.scene.visible = (_activeMeshStyle === style)
    ball.add(gltf.scene)
    // Update the cached scene reference
    switch (style) {
      case 'obj_soccer':     _soccerObjScene     = gltf.scene; break
      case 'obj_vintage':    _vintageObjScene    = gltf.scene; break
      case 'obj_volleyball': _volleyballObjScene = gltf.scene; break
      case 'obj_basketball': _basketballObjScene = gltf.scene; break
      case 'obj_baseball':   _baseballObjScene   = gltf.scene; break
      case 'obj_tennis':     _tennisObjScene     = gltf.scene; break
    }
    _setActiveBallScene(_activeMeshStyle)
  }, undefined, err => console.warn(`${style} GLB failed`, err))
}

const blob = new THREE.Mesh(
  new THREE.CircleGeometry(BALL_RADIUS * 0.9, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
)
blob.rotation.x = -Math.PI / 2
blob.position.y = FLOOR_Y + 0.015
scene.add(blob)

// ─── Particles ────────────────────────────────────────────────────────────────
const PC = 24
const pGeo = new THREE.BufferGeometry()
const pBuf = new Float32Array(PC * 3)
pGeo.setAttribute('position', new THREE.BufferAttribute(pBuf, 3))
const pMat = new THREE.PointsMaterial({
  size: 0.1, color: 0xffffff, transparent: true, opacity: 0, sizeAttenuation: true
})
const pMesh = new THREE.Points(pGeo, pMat)
scene.add(pMesh)
const pVel = Array.from({ length: PC }, () => new THREE.Vector3())
let pLife = 0

function spawnParticles(pos, color) {
  pMat.color.set(color)
  pMat.opacity = 1
  pLife = 1
  for (let i = 0; i < PC; i++) {
    pBuf[i*3]   = pos.x
    pBuf[i*3+1] = pos.y
    pBuf[i*3+2] = pos.z
    const a = Math.random() * Math.PI * 2
    const s = 2.5 + Math.random() * 5
    pVel[i].set(Math.cos(a) * s * 0.8, (0.5 + Math.random()) * s, (Math.random() - 0.5) * s * 0.2)
  }
  pGeo.attributes.position.needsUpdate = true
}

// ─── Ability modifiers ────────────────────────────────────────────────────────
let abilityScoreMult  = 1
let abilityKickBonus  = 0
let abilityWallDamp   = BOUNCE_DAMPING
let abilityFootScale  = 1
let abilityFootSpeed  = 1
let abilityCenterPull = 0

// ─── Equipment modifiers (ball + stadium) ─────────────────────────────────────
let _ballGravMult     = 1   // ball gimmick gravity
let _ballBounceMult   = 1   // ball gimmick wall-bounce multiplier (>1 = bouncier)
let _stadGravMult     = 1   // stadium gimmick gravity
let _wallScale        = 1   // stadium wall width
let _stadiumScoreMult = 1   // stadium score multiplier

// ─── Countdown state ──────────────────────────────────────────────────────────
let _cdT     = 0    // seconds elapsed since countdown started
const CD_READY  = 0.95   // seconds to show "READY?"
const CD_START  = 0.50   // seconds to show "START!"

const _cdOverlay = document.getElementById('countdown-overlay')
const _cdText    = document.getElementById('countdown-text')

function _showCountdownPhase(phase) {   // 'ready' | 'start' | null
  if (!_cdOverlay || !_cdText) return
  if (phase === null) {
    _cdOverlay.classList.add('fade-out')
    setTimeout(() => _cdOverlay.classList.add('hidden'), 260)
    return
  }
  _cdOverlay.classList.remove('hidden', 'fade-out')
  _cdText.classList.remove('phase-ready', 'phase-start', 'phase-hidden')
  // brief hidden flash so transition fires even when switching phases
  _cdText.classList.add('phase-hidden')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      _cdText.textContent = phase === 'ready' ? 'READY?' : 'START!'
      _cdText.classList.remove('phase-hidden')
      _cdText.classList.add(phase === 'ready' ? 'phase-ready' : 'phase-start')
    })
  })
}

// ─── Mode state ───────────────────────────────────────────────────────────────
let gameMode   = 'classic'   // 'classic' | 'timeattack' | 'challenge' | 'wc2026'
let timeLeft   = 30
let kickCount  = 0
let maxHeight  = 0
let tutHintSent  = 0         // 0=none sent, 1=hint0, 2=hint1, 3=hint2
let hasUsedRevive = false    // classic mode: one revive-ad per game
let _wcRoundTarget = 999     // WC mode: kick target for current round

// ─── Game state ───────────────────────────────────────────────────────────────
// state: 'lobby' | 'countdown' | 'playing' | 'reviving'
let state    = 'lobby'
let score    = 0
let bVel     = new THREE.Vector3()
let bSpin    = new THREE.Vector3()
let kickCD   = 0
let shakeAmt = 0
let comboFlash = 0
let idleT    = 0
let isGrounded = false
let footVisible = false

const scoreEl        = document.getElementById('score-number')
const bestEl         = document.getElementById('best-number')
const indicator      = document.getElementById('ball-indicator')
const indDist        = document.getElementById('indicator-dist')
const hudEl          = document.getElementById('hud')
const announcementEl  = document.getElementById('game-announcement')
const windIndicator   = document.getElementById('wind-indicator')
const windBarFill     = document.getElementById('wind-bar-fill')
const windArrowEl     = document.getElementById('wind-arrow')
const modeTimerRow    = document.getElementById('mode-timer-row')
const modeTimerFill   = document.getElementById('mode-timer-fill')
const modeTimerNum    = document.getElementById('mode-timer-num')
const bestLabelEl     = document.getElementById('best-label')

function resetBall() {
  ball.position.set((Math.random() - 0.5) * 1.2, BALL_SPAWN_Y, 0)
  bVel.set((Math.random() - 0.5) * 1.5, -1, 0)
  bSpin.set(0, 0, 0)
  isGrounded = false
}

// ─── Progression state ────────────────────────────────────────────────────────
let airCoins          = []
let windForce         = 0
let windT             = 0
let windActive        = false
let windAnnounced     = false
let airCoinAnnounced  = false
let obstacleAnnounced = false
let obstacles         = []
let lastObstacleSpawn = 0
let _annTimer         = null

function showAnnouncement(key, duration = 2200) {
  if (!announcementEl) return
  clearTimeout(_annTimer)
  announcementEl.textContent = (window._t ? window._t(key) : null) || key
  announcementEl.classList.remove('fade-out')
  announcementEl.classList.add('visible')
  _annTimer = setTimeout(() => {
    announcementEl.classList.add('fade-out')
    announcementEl.classList.remove('visible')
  }, duration)
}

function spawnAirCoin() {
  const x = (Math.random() - 0.5) * (WALL_X * 2 - 1.0)
  const y = 0.4 + Math.random() * 2.0
  const g = new THREE.Group()
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.045, 8, 16),
    new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x553300 })
  )
  torus.rotation.x = Math.PI / 2
  g.add(torus)
  g.position.set(x, y, 0)
  scene.add(g)
  airCoins.push({ mesh: g, bobT: Math.random() * Math.PI * 2, baseY: y })
}

function updateAirCoins(dt) {
  if (score < 8) return
  if (!airCoinAnnounced) {
    airCoinAnnounced = true
    showAnnouncement('annCoin')
    if (!window._tutorialDone && tutHintSent === 2) {
      tutHintSent = 3
      window.dispatchEvent(new CustomEvent('showHint', { detail: 2 }))
    }
  }
  if (airCoins.length < 3 && Math.random() < dt * 0.45) spawnAirCoin()
  for (let i = airCoins.length - 1; i >= 0; i--) {
    const ac = airCoins[i]
    ac.bobT += dt * 2.5
    ac.mesh.position.y = ac.baseY + Math.sin(ac.bobT) * 0.12
    ac.mesh.rotation.y += dt * 3.2
    if (ball.position.distanceTo(ac.mesh.position) < _ballRadius + 0.17) {
      scene.remove(ac.mesh)
      airCoins.splice(i, 1)
      window.dispatchEvent(new CustomEvent('coinCollected', { detail: 15 }))
      sfx.coin()
    }
  }
}

function updateWind(dt) {
  if (score < 15) return
  if (!windAnnounced) {
    windAnnounced = true
    windActive    = true
    if (windIndicator) windIndicator.classList.remove('hidden')
    showAnnouncement('annWind')
  }
  windT     += dt
  windForce  = Math.sin(windT * 0.38) * 3.5 + Math.sin(windT * 0.71) * 1.5
  bVel.x    += windForce * dt
  if (windBarFill) windBarFill.style.width = Math.min(100, (Math.abs(windForce) / 5) * 100) + '%'
  if (windArrowEl) windArrowEl.textContent = windForce > 0 ? '→' : '←'
}

function spawnObstacle() {
  const y      = -0.5 + Math.random() * 2.8
  const left   = Math.random() < 0.5
  const vx     = (left ? 1 : -1) * (2.2 + Math.random() * 1.6)
  const mesh   = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.72, 0.30),
    new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x440000 })
  )
  mesh.position.set(left ? -WALL_X - 0.3 : WALL_X + 0.3, y, 0)
  mesh.castShadow = true
  scene.add(mesh)
  obstacles.push({ mesh, vx })
}

function updateObstacles(dt) {
  if (score < 25) return
  if (!obstacleAnnounced) {
    obstacleAnnounced = true
    showAnnouncement('annObs')
  }
  lastObstacleSpawn -= dt
  if (lastObstacleSpawn <= 0) {
    spawnObstacle()
    lastObstacleSpawn = 1.4 + Math.random() * 1.6
  }
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i]
    ob.mesh.position.x += ob.vx * dt
    if (Math.abs(ob.mesh.position.x) > WALL_X + 1.5) {
      scene.remove(ob.mesh)
      ob.mesh.geometry.dispose(); ob.mesh.material.dispose()
      obstacles.splice(i, 1)
      continue
    }
    const bx = Math.abs(ball.position.x - ob.mesh.position.x)
    const by = Math.abs(ball.position.y - ob.mesh.position.y)
    if (bx < 0.08 + _ballRadius && by < 0.36 + _ballRadius) {
      endGame(); return
    }
  }
}

function clearProgression() {
  airCoins.forEach(ac => scene.remove(ac.mesh))
  airCoins = []
  obstacles.forEach(ob => { scene.remove(ob.mesh); ob.mesh.geometry.dispose(); ob.mesh.material.dispose() })
  obstacles = []
  windForce = 0; windT = 0; windActive = false
  windAnnounced = false; airCoinAnnounced = false; obstacleAnnounced = false
  lastObstacleSpawn = 0
  if (windIndicator) windIndicator.classList.add('hidden')
}

export function startGame(_mode = 'classic') {
  gameMode = _mode
  _slowMoT = -1
  clearDropZoom()
  const a = window._playerAbility || {}
  abilityScoreMult  = a.scoreMult  != null ? a.scoreMult  : 1
  abilityKickBonus  = a.kickBonus  != null ? a.kickBonus  : 0
  abilityWallDamp   = a.wallDamp   != null ? a.wallDamp   : BOUNCE_DAMPING
  abilityFootScale  = a.footScale  != null ? a.footScale  : 1
  abilityFootSpeed  = a.footSpeed  != null ? a.footSpeed  : 1
  abilityCenterPull = a.centerPull != null ? a.centerPull : 0

  clearProgression()
  smoothVelY = 0
  prevRawY   = rawTarget.y

  // Mode-specific setup
  timeLeft  = 30
  kickCount = 0
  maxHeight = 0

  if (gameMode !== 'classic' && gameMode !== 'wc2026') {
    modeTimerRow?.classList.remove('hidden')
    if (modeTimerFill) { modeTimerFill.style.width = '100%'; modeTimerFill.style.background = '' }
    if (modeTimerNum)    modeTimerNum.textContent = '30s'
    if (bestLabelEl)     bestLabelEl.textContent  = gameMode === 'timeattack'
      ? (window._t ? window._t('kicks') : 'KICKS')
      : (window._t ? window._t('height') : 'HEIGHT')
  } else {
    modeTimerRow?.classList.add('hidden')
    if (bestLabelEl) bestLabelEl.innerHTML = 'BEST <span id="best-number">0</span>'
  }

  state = 'countdown'
  _cdT  = 0
  score = 0
  scoreEl.textContent = gameMode === 'challenge' ? '0.0m' : '0'
  scoreEl.style.fontSize = '48px'
  hudEl.classList.remove('hidden')
  resetBall()
  bVel.set(0, 0, 0)   // freeze ball during countdown
  indicator.classList.remove('visible')

  // Hide one leg on body — game loop will pick correct side dynamically
  // Start with right foot active (ball spawns slightly right of center on average)
  charBody.getObjectByName('lShin')?.visible === undefined || (charBody.getObjectByName('lShin').visible = true)
  charBody.getObjectByName('lShoe')?.visible === undefined || (charBody.getObjectByName('lShoe').visible = true)
  charBody.getObjectByName('rShin') && (charBody.getObjectByName('rShin').visible = false)
  charBody.getObjectByName('rShoe') && (charBody.getObjectByName('rShoe').visible = false)

  // Spawn kickFoot at the character's right foot world position so it
  // visually detaches from the body instead of popping in from nowhere
  const footStartX = charBody.position.x + 0.13
  const footStartY = charBody.position.y - 0.855
  kickFoot.position.set(footStartX, footStartY, 0.15)
  rawTarget.set(footStartX, footStartY, 0.15)
  prevRawY = rawTarget.y
  kickFoot.visible = true
  footVisible = true

  _showCountdownPhase('ready')

  // Tutorial hints (in-game)
  tutHintSent   = 0
  hasUsedRevive = false
  if (!window._tutorialDone) {
    setTimeout(() => {
      if (state === 'playing') {
        window.dispatchEvent(new CustomEvent('showHint', { detail: 0 }))
        tutHintSent = 1
      }
    }, 800)
  }
}

function endGame() {
  if (state !== 'playing' && state !== 'countdown' && state !== 'slowmo') return
  _slowMoT = -1
  state = 'lobby'
  clearDropZoom()
  _showCountdownPhase(null)
  clearProgression()
  modeTimerRow?.classList.add('hidden')
  indicator.classList.remove('visible')
  kickFoot.visible = false
  footVisible = false
  // Restore both legs on character body for idle stance
  ;['lShin','lShoe','rShin','rShoe'].forEach(n => {
    const obj = charBody.getObjectByName(n)
    if (obj) obj.visible = true
  })
  const finalScore =
    gameMode === 'classic'    ? Math.floor(score) :
    gameMode === 'timeattack' ? kickCount :
    gameMode === 'wc2026'     ? kickCount :
    parseFloat(maxHeight.toFixed(1))
  window.dispatchEvent(new CustomEvent('gameOver', { detail: { score: finalScore, mode: gameMode } }))
  sfx.gameOver()
}

// ─── Input: foot follows cursor/touch ─────────────────────────────────────────
const raycaster  = new THREE.Raycaster()
const footPlane  = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const footPt     = new THREE.Vector3()
const ndcMouse   = new THREE.Vector2()
const rawTarget  = new THREE.Vector3(0, FLOOR_Y + 0.3, 0.15)

// ─── Drag-velocity kick system ────────────────────────────────────────────────
let prevRawY       = rawTarget.y
let smoothVelY     = 0   // smoothed upward drag velocity (world units/sec)

function pointerToWorld(clientX, clientY) {
  ndcMouse.x = (clientX / window.innerWidth)  * 2 - 1
  ndcMouse.y = -(clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(ndcMouse, camera)
  if (raycaster.ray.intersectPlane(footPlane, footPt)) {
    rawTarget.set(footPt.x, footPt.y, 0.15)
    footVisible = true
  }
}

window.addEventListener('mousemove', e => {
  if (state === 'playing') pointerToWorld(e.clientX, e.clientY)
})

window.addEventListener('touchmove', e => {
  if (state !== 'playing') return
  e.preventDefault()
  pointerToWorld(e.touches[0].clientX, e.touches[0].clientY)
}, { passive: false })

window.addEventListener('touchstart', e => {
  if (state !== 'playing') return
  e.preventDefault()
  pointerToWorld(e.touches[0].clientX, e.touches[0].clientY)
}, { passive: false })

// Listen for lobby "Play" button
window.addEventListener('lobbyPlay', e => {
  _wcRoundTarget = e.detail?.wcTarget ?? 999
  startGame(e.detail?.mode || 'classic')
})

// ─── Revive ad events (from lobby.js) ────────────────────────────────────────
window.addEventListener('reviveGranted', () => {
  if (state !== 'reviving') return
  hasUsedRevive = true
  isGrounded    = false
  resetBall()
  bVel.set(0, 0, 0)
  _cdT = 0
  state = 'countdown'
  _showCountdownPhase('ready')
})

window.addEventListener('reviveDeclined', () => {
  if (state !== 'reviving') return
  state = 'playing'   // restore so endGame() guard passes
  endGame()
})

// ─── Hair style builder ───────────────────────────────────────────────────────
// Sphere head: centre y=0.64, radius=0.30 → top y=0.94, sides x=±0.30, front z=0.30
function buildHairMeshes(style, color) {
  const meshes = []
  function hbox(w, h, d, col, px, py, pz) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: col })
    )
    m.position.set(px, py, pz)
    m.castShadow = true
    m.userData.isHair = true
    meshes.push(m)
    return m
  }
  function hsph(r, col, px, py, pz) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 8),
      new THREE.MeshLambertMaterial({ color: col })
    )
    m.position.set(px, py, pz)
    m.castShadow = true
    m.userData.isHair = true
    meshes.push(m)
    return m
  }
  const c = color
  switch (style) {
    case 'bald':
      // 지단, 로벤 — 머리카락 없음, 미세 하이라이트만
      hbox(0.11, 0.010, 0.07, 0xfff2e0, 0.07, 0.965, 0.09)
      break
    case 'medium':
      // 미토마, 카카 — 짧은 캡 + 뒷머리 늘어짐
      hbox(0.52, 0.15, 0.50, c,  0,     0.930,  0.01)
      hbox(0.48, 0.26, 0.12, c,  0,     0.795, -0.22)
      break
    case 'long':
      // 메시 — 위 캡 + 길게 흘러내리는 뒷머리 + 옆머리
      hbox(0.52, 0.18, 0.50, c,  0,     0.938,  0.01)
      hbox(0.48, 0.44, 0.13, c,  0,     0.718, -0.22)
      hbox(0.12, 0.34, 0.11, c, -0.31,  0.790,  0)
      hbox(0.12, 0.34, 0.11, c,  0.31,  0.790,  0)
      break
    case 'curly':
      // 살라 — 큼직한 파마머리
      hbox(0.62, 0.24, 0.56, c,  0,     0.950,  0.02)
      hbox(0.15, 0.22, 0.14, c, -0.38,  0.925,  0)
      hbox(0.15, 0.22, 0.14, c,  0.38,  0.925,  0)
      hbox(0.60, 0.14, 0.54, c,  0,     0.870,  0)
      break
    case 'styled':
      // CR7 — 옆으로 쓸어넘긴 스타일 (약간 높은 탑)
      hbox(0.52, 0.19, 0.46, c,  0.04,  0.946, -0.01)
      hbox(0.42, 0.11, 0.15, c,  0.05,  0.906,  0.17)
      hbox(0.42, 0.09, 0.12, c,  0.04,  0.898, -0.20)
      break
    case 'undercut':
      // 모드리치 — 위만 볼륨 있는 언더컷
      hbox(0.40, 0.33, 0.46, c,  0,     0.998,  0.01)
      hbox(0.52, 0.12, 0.50, c,  0,     0.852,  0)
      hbox(0.07, 0.26, 0.48, c, -0.30,  0.895,  0)
      hbox(0.07, 0.26, 0.48, c,  0.30,  0.895,  0)
      break
    default:
      // short — 손흥민, 이니에스타, 비르츠, 델피에로 등
      hbox(0.52, 0.14, 0.50, c,  0,     0.921,  0.01)
      break
  }
  return meshes
}

function applyHairStyle(style, color) {
  const hairGroup = charBody.getObjectByName('hairGroup')
  if (!hairGroup) return
  while (hairGroup.children.length) {
    const c = hairGroup.children[0]
    c.geometry.dispose(); c.material.dispose()
    hairGroup.remove(c)
  }
  buildHairMeshes(style, color).forEach(m => hairGroup.add(m))
}

// ─── Apply character colors (role-based — no fragile origColor lookup) ────────
window.addEventListener('charChanged', e => {
  const { colors: c, hairStyle } = e.detail || {}
  if (!c) return

  // Apply to static body and to the kick foot (shin + shoe)
  ;[charBody, kickFoot].forEach(obj => {
    obj.traverse(child => {
      if (!child.isMesh || child.userData.isHair) return
      const role = child.userData.role
      if (!role) return
      switch (role) {
        case 'shirt':  child.material.color.setHex(c.shirt);  break
        case 'shorts': child.material.color.setHex(c.shorts); break
        case 'skin':   child.material.color.setHex(c.skin);   break
        case 'brow':   child.material.color.setHex(c.hair);   break
        // shoes stay dark; eyes stay black
      }
    })
  })
  applyHairStyle(hairStyle || 'short', c.hair)
})

// ─── Ball skin ────────────────────────────────────────────────────────────────
window.addEventListener('ballChanged', e => {
  const b = e.detail; if (!b) return

  // Lazy-load GLB if not yet downloaded, then switch mesh
  _lazyLoadBall(b.meshStyle)
  _setActiveBallScene(b.meshStyle ?? 'kenney')

  // Apply canvas texture only for Kenney-style balls
  if (!b.meshStyle || b.meshStyle === 'kenney') {
    applyBallColors(b.base, b.patch ?? 0x111111, b.style ?? 'soccer')
  }

  _ballGravMult   = b.gimmick?.gravityMult  ?? 1
  _ballBounceMult = b.gimmick?.wallBounce   ?? 1
  const rm = b.radiusMult ?? 1.0
  _ballRadius = BALL_RADIUS * rm
  ball.scale.setScalar(rm)
  blob.scale.setScalar(rm)
})

// ─── Stadium skin & physics ───────────────────────────────────────────────────
window.addEventListener('stadiumChanged', e => {
  const s = e.detail; if (!s) return
  scene.background.setHex(s.bg)
  scene.fog.color.setHex(s.fog)
  scene.fog.near = s.id === 'space' ? 30 : 20
  groundMesh.material.color.setHex(s.ground)
  paveMesh.material.color.setHex(s.pave)
  const amb = scene.children.find(c => c.isAmbientLight)
  if (amb) amb.color.setHex(s.ambient)
  sun.color.setHex(s.sun)
  _stadGravMult     = s.gimmick?.gravityMult != null ? s.gimmick.gravityMult : 1
  _wallScale        = s.gimmick?.wallScale   != null ? s.gimmick.wallScale   : 1
  _stadiumScoreMult = s.gimmick?.scoreMult   != null ? s.gimmick.scoreMult   : 1
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  css2dRenderer.setSize(window.innerWidth, window.innerHeight)
  setCamera()
})

// ─── Off-screen indicator ─────────────────────────────────────────────────────
function updateIndicator() {
  if (state !== 'playing') { indicator.classList.remove('visible'); return }
  const proj = ball.position.clone().project(camera)
  const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight
  const sx = ( proj.x * 0.5 + 0.5) * window.innerWidth

  if (sy < -10) {
    const m = ((ball.position.y - BALL_SPAWN_Y) * METERS_SCALE).toFixed(1)
    indDist.textContent = m + 'm'
    indicator.style.left = Math.max(40, Math.min(window.innerWidth - 40, sx)) + 'px'
    indicator.style.top  = '76px'
    indicator.classList.add('visible')
  } else {
    indicator.classList.remove('visible')
  }
}

// ─── Foot-ball collision kick ─────────────────────────────────────────────────
function checkKick() {
  if (kickCD > 0 || bVel.y > 2) return

  const footW = FOOT_W * abilityFootScale
  const fp = kickFoot.position
  const dx = Math.abs(ball.position.x - fp.x)
  const dy = ball.position.y - (fp.y + FOOT_H)

  if (dy >= -(_ballRadius + 0.08) && dy <= 0.22 && dx <= footW + _ballRadius * 0.8) {
    // Kick power = base + upward drag velocity
    // Slow/stationary: ~6 · medium swipe: ~13 · fast full swipe: ~20+
    const upVel   = Math.max(0, smoothVelY)
    const kickPow = Math.max(6, Math.min(22, 6 + upVel * 0.58))

    const offset = (ball.position.x - fp.x) / footW
    bVel.x  = offset * 5.5
    bVel.y  = kickPow + abilityKickBonus
    bVel.z  = 0
    bSpin.z = -offset * 9
    bSpin.x = (Math.random() - 0.5) * 4
    kickCD  = 0.15
    shakeAmt = 0.06
    comboFlash = 1
    sfx.kick(kickPow)

    if (gameMode === 'timeattack') {
      kickCount++
      scoreEl.textContent = kickCount
    } else if (gameMode === 'challenge') {
      kickCount++
      // score display updated in update() via maxHeight
    } else if (gameMode === 'wc2026') {
      kickCount++
      scoreEl.textContent = kickCount
      if (kickCount >= _wcRoundTarget) {
        setTimeout(() => endGame(), 400)   // 짧은 딜레이로 마지막 킥 느낌 살리고 종료
      }
    } else {
      score += abilityScoreMult * _stadiumScoreMult
      scoreEl.textContent = Math.floor(score)
    }

    // Milestone sound: 10, 20, 50, 100...
    const curScore = gameMode === 'classic' ? Math.floor(score) : kickCount
    if ([10, 20, 50, 100, 200].includes(curScore)) sfx.milestone()

    // Tutorial hint 1: after first kick
    if (!window._tutorialDone && tutHintSent === 1) {
      tutHintSent = 2
      window.dispatchEvent(new CustomEvent('showHint', { detail: 1 }))
    }

    const cols = [0x44aaff, 0x44ff88, 0xffcc22, 0xff4488, 0xcc44ff]
    spawnParticles(ball.position.clone(), cols[Math.min(Math.floor(score / 5), cols.length - 1)])
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function update(dt) {
  idleT += dt

  if (state === 'lobby') {
    // ── Camera lerp ──────────────────────────────────────────────────────────
    const targetPos  = _charPreviewMode ? CAM_PREVIEW_POS  : lobbyDefaultCamPos()
    const targetLook = _charPreviewMode ? CAM_PREVIEW_LOOK : lobbyDefaultCamLook()
    const lerpK = 1 - Math.pow(0.002, dt)   // smooth, frame-rate-independent
    _camPos.lerp(targetPos, lerpK)
    _camLook.lerp(targetLook, lerpK)
    camera.position.copy(_camPos)
    camera.lookAt(_camLook)

    // ── Character idle sway (subtle) ─────────────────────────────────────────
    charBody.rotation.y = Math.sin(idleT * 0.9) * (_charPreviewMode ? 0.25 : 0.06)

    // ── Ball idle float ──────────────────────────────────────────────────────
    ball.position.set(Math.sin(idleT * 0.7) * 1.0, 1.2 + Math.sin(idleT * 1.3) * 0.6, 0)
    ball.rotation.y += dt * 1.0
    ball.rotation.z += dt * 0.4

    const h = ball.position.y - FLOOR_Y
    blob.position.x = ball.position.x
    blob.material.opacity = Math.max(0.04, 0.35 * (1 - h * 0.065))
    blob.scale.setScalar(Math.max(0.15, 1 - h * 0.07))
    return
  }

  // ── Countdown (READY? → START!) ─────────────────────────────────────────────
  if (state === 'countdown') {
    _cdT += dt

    // Camera: smoothly ease into game position
    const lerpK = 1 - Math.pow(0.002, dt)
    _camPos.lerp(lobbyDefaultCamPos(), lerpK)
    camera.position.copy(_camPos)
    camera.lookAt(lobbyDefaultCamLook())

    // Foot tracks cursor during countdown so player can pre-position
    const limitC = WALL_X - 0.1
    rawTarget.x = Math.max(-limitC, Math.min(limitC, rawTarget.x))
    rawTarget.y = Math.max(FLOOR_Y + 0.15, rawTarget.y)
    kickFoot.position.lerp(rawTarget, Math.min(1, FOOT_LERP * dt))
    kickFoot.visible = true

    // Ball stays frozen
    bVel.set(0, 0, 0)
    ball.rotation.y += dt * 0.6

    // Blob shadow under ball
    const hC = ball.position.y - FLOOR_Y
    blob.position.x = ball.position.x
    blob.material.opacity = Math.max(0.04, 0.35 * (1 - hC * 0.055))
    blob.scale.setScalar(Math.max(0.15, 1 - hC * 0.065) * (_ballRadius / BALL_RADIUS))

    // Phase transitions
    if (_cdT >= CD_READY && _cdT - dt < CD_READY) {
      _showCountdownPhase('start')
      sfx.gameStart()
    }
    if (_cdT >= CD_READY + CD_START) {
      _showCountdownPhase(null)
      state = 'playing'
      // Give ball a small initial drop so it feels live
      bVel.set((Math.random() - 0.5) * 1.5, -1, 0)
    }
    return
  }

  // ── Slow-motion replay ───────────────────────────────────────────────────────
  if (state === 'slowmo') {
    _slowMoT += dt
    const pDt = dt * SLOW_MO_SCALE   // slowed physics delta

    // Gravity + movement
    bVel.y += GRAVITY * _stadGravMult * _ballGravMult * pDt
    ball.position.x += bVel.x * pDt
    ball.position.y += bVel.y * pDt
    ball.position.z  = 0

    // Wall bounce (damped)
    const wlSM = WALL_X * _wallScale - _ballRadius
    if (ball.position.x >  wlSM) { ball.position.x =  wlSM; bVel.x = -Math.abs(bVel.x) * 0.45 }
    if (ball.position.x < -wlSM) { ball.position.x = -wlSM; bVel.x =  Math.abs(bVel.x) * 0.45 }

    // Floor micro-bounce — each hop smaller until it settles
    if (ball.position.y - _ballRadius <= FLOOR_Y) {
      ball.position.y = FLOOR_Y + _ballRadius
      const vy = Math.abs(bVel.y) * 0.42
      bVel.y = vy < 0.5 ? 0 : vy
      bVel.x *= 0.72
    }

    // Spin
    bSpin.multiplyScalar(SPIN_DECAY)
    ball.rotation.x += bSpin.x * pDt
    ball.rotation.z += bSpin.z * pDt
    ball.rotation.y += bVel.x * 0.4 * pDt

    // Blob shadow
    const hSM = ball.position.y - FLOOR_Y
    blob.position.x = ball.position.x
    blob.material.opacity = Math.max(0.04, 0.35 * (1 - hSM * 0.055))
    blob.scale.setScalar(Math.max(0.15, 1 - hSM * 0.065) * (_ballRadius / BALL_RADIUS))

    // Proceed after SLOW_MO_HOLD real seconds
    if (_slowMoT >= SLOW_MO_HOLD) _proceedAfterDrop()
    // (drop zoom camera handled in the block below — no return here)
  }

  // ── Drop zoom camera (floor-drop effect, runs during play & revive) ──────────
  if (_dropZoomT >= 0) {
    _dropZoomT += dt
    const t    = Math.min(1, _dropZoomT / DROP_ZOOM_IN)
    const ease = t * t * (3 - 2 * t)   // smoothstep
    const gameZ = lobbyDefaultCamPos().z
    camera.position.set(
      THREE.MathUtils.lerp(0,   _dropBallX * 0.35, ease),
      THREE.MathUtils.lerp(0.5, 0.1,               ease),
      THREE.MathUtils.lerp(gameZ, 5.5,             ease)
    )
    camera.lookAt(new THREE.Vector3(
      _dropBallX * 0.25 * ease,
      FLOOR_Y + 0.7,
      0
    ))
    // zoom cleared explicitly in _proceedAfterDrop() / endGame() / startGame()
  }

  // Ball frozen at floor while revive prompt is open
  if (state === 'reviving') {
    kickFoot.visible = false
    return
  }

  // Slow-mo handles its own physics above — skip the normal playing loop
  if (state === 'slowmo') return

  kickFoot.visible = footVisible

  // ── Left / right foot selection based on ball x position ───────────────────
  const ballOnRight = ball.position.x >= 0
  const _lShin = charBody.getObjectByName('lShin')
  const _lShoe = charBody.getObjectByName('lShoe')
  const _rShin = charBody.getObjectByName('rShin')
  const _rShoe = charBody.getObjectByName('rShoe')
  // Show the resting foot; the kickFoot represents the other one
  if (_lShin) _lShin.visible =  ballOnRight   // left leg visible when ball is on right
  if (_lShoe) _lShoe.visible =  ballOnRight
  if (_rShin) _rShin.visible = !ballOnRight   // right leg visible when ball is on left
  if (_rShoe) _rShoe.visible = !ballOnRight
  // Mirror kickFoot so it looks like the correct foot
  kickFoot.scale.x = ballOnRight ? 1 : -1

  // ── Drag velocity tracking (for kick power) ─────────────────────────────────
  const frameVelY = (rawTarget.y - prevRawY) / Math.max(dt, 0.008)
  prevRawY = rawTarget.y
  // Fast rise (instant snap to peak), slow decay
  smoothVelY = frameVelY > smoothVelY
    ? smoothVelY * 0.20 + frameVelY * 0.80
    : smoothVelY * 0.80 + frameVelY * 0.20

  // ── Timed modes: countdown ──────────────────────────────────────────────────
  if (gameMode !== 'classic') {
    timeLeft = Math.max(0, timeLeft - dt)
    const pct = (timeLeft / 30) * 100
    if (modeTimerFill) {
      modeTimerFill.style.width = pct + '%'
      modeTimerFill.style.background = timeLeft < 8
        ? 'linear-gradient(90deg,#ff4040,#ff8020)'
        : ''
    }
    if (modeTimerNum) modeTimerNum.textContent = Math.ceil(timeLeft) + 's'
    if (timeLeft <= 0) { endGame(); return }
  }

  // ── Challenge: track max height ─────────────────────────────────────────────
  if (gameMode === 'challenge') {
    const h = parseFloat(((ball.position.y - FLOOR_Y) * METERS_SCALE).toFixed(1))
    if (h > maxHeight) {
      maxHeight = h
      scoreEl.textContent = maxHeight.toFixed(1) + 'm'
    }
  }

  // Lerp foot
  const limit = WALL_X - 0.1
  rawTarget.x = Math.max(-limit, Math.min(limit, rawTarget.x))
  rawTarget.y = Math.max(FLOOR_Y + 0.15, rawTarget.y)
  kickFoot.position.lerp(rawTarget, Math.min(1, FOOT_LERP * abilityFootSpeed * dt))

  kickCD = Math.max(0, kickCD - dt)

  // Physics
  bVel.y += GRAVITY * _stadGravMult * _ballGravMult * dt
  ball.position.x += bVel.x * dt
  ball.position.y += bVel.y * dt
  ball.position.z = 0

  // Wall bounce
  const wallLimit = WALL_X * _wallScale - _ballRadius
  if (ball.position.x > wallLimit) {
    ball.position.x = wallLimit
    bVel.x = -Math.abs(bVel.x) * abilityWallDamp * _ballBounceMult
    bSpin.z *= -0.5
    shakeAmt = 0.04
    sfx.bounce(0.35)
  } else if (ball.position.x < -wallLimit) {
    ball.position.x = -wallLimit
    bVel.x = Math.abs(bVel.x) * abilityWallDamp * _ballBounceMult
    bSpin.z *= -0.5
    shakeAmt = 0.04
    sfx.bounce(0.35)
  }

  // Center pull (Kaká / Messi)
  if (abilityCenterPull > 0) {
    bVel.x -= bVel.x * abilityCenterPull * dt
  }

  // Floor hit
  if (ball.position.y - _ballRadius <= FLOOR_Y) {
    if (gameMode === 'timeattack') {
      // Time Attack: respawn, no game over
      resetBall()
      isGrounded = false
    } else {
      ball.position.y = FLOOR_Y + _ballRadius
      bVel.set(0, 0, 0)
      if (!isGrounded) {
        isGrounded = true
        sfx.floorDrop(0.6)
        startDropZoom(ball.position.x)
        if (_slowMoEnabled()) {
          // Enter slow-motion replay for SLOW_MO_HOLD real seconds
          state  = 'slowmo'
          _slowMoT = 0
          // Small bounce so the ball has something to do in slow-mo
          bVel.set((Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.4), 2.8, 0)
        } else {
          bVel.set(0, 0, 0)
          _proceedAfterDrop()
        }
      }
      return
    }
  }

  // Foot collision
  checkKick()

  // Spin
  bSpin.multiplyScalar(SPIN_DECAY)
  ball.rotation.x += bSpin.x * dt
  ball.rotation.z += bSpin.z * dt
  ball.rotation.y += bVel.x * 0.4 * dt

  // Particles
  if (pLife > 0) {
    pLife -= dt * 1.8
    pMat.opacity = Math.max(0, pLife)
    for (let i = 0; i < PC; i++) {
      pVel[i].y += GRAVITY * 0.25 * dt
      pBuf[i*3]   += pVel[i].x * dt
      pBuf[i*3+1] += pVel[i].y * dt
      pBuf[i*3+2] += pVel[i].z * dt
    }
    pGeo.attributes.position.needsUpdate = true
  }

  // Blob shadow
  const h = ball.position.y - FLOOR_Y
  blob.position.x = ball.position.x
  blob.material.opacity = Math.max(0.04, 0.35 * (1 - h * 0.055))
  blob.scale.setScalar(Math.max(0.15, 1 - h * 0.065))

  // Camera shake (suppressed while drop zoom is active)
  if (_dropZoomT < 0 && shakeAmt > 0.002) {
    shakeAmt *= 0.78
    camera.position.x = (Math.random() - 0.5) * shakeAmt
    camera.position.y = 0.5 + (Math.random() - 0.5) * shakeAmt * 0.5
  } else if (_dropZoomT < 0 && shakeAmt > 0) {
    shakeAmt = 0
    setCamera()
  }

  // Score pulse
  if (comboFlash > 0) {
    comboFlash -= dt * 4
    const s = Math.max(0, comboFlash)
    scoreEl.style.fontSize = (52 + s * 16) + 'px'
    if (comboFlash <= 0) scoreEl.style.fontSize = '52px'
  }

  // Body tracks ball
  charBody.position.y = FLOOR_Y + 1.30 + Math.sin(idleT * 1.6) * 0.015
  const dx = ball.position.x - charBody.position.x
  charBody.rotation.y += (Math.atan2(dx * 0.15, 1) * 0.3 - charBody.rotation.y) * 4 * dt

  // Progression systems
  updateAirCoins(dt)
  updateWind(dt)
  updateObstacles(dt)

  updateIndicator()
}

function loop() {
  requestAnimationFrame(loop)
  try {
    const dt = Math.min(clock.getDelta(), 0.05)
    update(dt)
    renderer.render(scene, camera)
    css2dRenderer.render(scene, camera)
  } catch (e) {
    console.error('Loop error:', e)
  }
}

loop()
