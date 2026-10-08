import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const M = { on: true, tx: 0, ty: 0, cx: 0, cy: 0, sp: 0, ss: 0, px: -9999, py: -9999, hl: 0, hf: 0, xl: 0, xf: 0, forceLula: false, forceFlavio: false }
export const intro = { amb: 0, lula: 0, flavio: 0 }
export const inv = { fn: null }

const AX = 28, AY = 16
const HOVER_SCALE = 0.08   // quanto o candidato "vem à frente"
const SCROLL_LIFT = 0.35   // quanto sobem no scroll (fração da altura da foto)

const gradTex = (draw) => {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); draw(g)
  return new THREE.CanvasTexture(c)
}
// o branco só começa a 80% da altura da foto (fica abaixo da primeira tela)
const fadeMask = () => gradTex((g) => {
  let v = g.createLinearGradient(0, 0, 0, 256)
  v.addColorStop(0, '#fff'); v.addColorStop(.8, '#fff'); v.addColorStop(.9, '#8a8a8a'); v.addColorStop(1, '#000')
  g.fillStyle = v; g.fillRect(0, 0, 256, 256)
  g.globalCompositeOperation = 'multiply'
  let h = g.createLinearGradient(0, 0, 256, 0)
  h.addColorStop(0, '#000'); h.addColorStop(.03, '#fff'); h.addColorStop(.97, '#fff'); h.addColorStop(1, '#000')
  g.fillStyle = h; g.fillRect(0, 0, 256, 256)
})
const softMask = () => gradTex((g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, '#fff'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, 256, 256)
})
// grade de alpha para o hover só ativar sobre a pessoa
const alphaGrid = (img) => {
  const gw = 128, gh = Math.round((gw * img.height) / img.width)
  const c = document.createElement('canvas'); c.width = gw; c.height = gh
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, gw, gh)
  return { gw, gh, d: x.getImageData(0, 0, gw, gh).data }
}
const solid = (a, u, v) => {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false
  const x = Math.min(a.gw - 1, (u * a.gw) | 0), y = Math.min(a.gh - 1, ((1 - v) * a.gh) | 0)
  return a.d[(y * a.gw + x) * 4 + 3] > 40
}

function Scene({ rootRef, coordsRef }) {
  const { size: { width: W, height: H }, invalidate } = useThree()
  inv.fn = invalidate
  const g = useRef()
  const [lt, ft] = useLoader(THREE.TextureLoader, ['/images/lula.png', '/images/flavio.png'])
  const { fade, soft, grids } = useMemo(() => {
    ;[lt, ft].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8 })
    return { fade: fadeMask(), soft: softMask(), grids: { lula: alphaGrid(lt.image), flavio: alphaGrid(ft.image) } }
  }, [lt, ft])

  const items = useMemo(() => {
    const m = W < 760
    // ↓↓ TAMANHO (mesma altura para os dois) ↓↓
    const hP = m ? .24 * H : Math.min(.70 * H, .358 * W)
    const lw = hP * 1.5, fw = hP * (1672 / 941), lh = hP, fh = hP
    // desktop: a foto passa 20% da própria altura abaixo da base da tela
    const yy = -H / 2 + .3 * hP
    const L = m ? { x: -.1 * W, y: .1 * H } : { x: -.054 * W - .48 * lw, y: yy }
    const F = m ? { x: .08 * W, y: -.2 * H } : { x: .07 * W + .29 * fw, y: yy }
    const sd = SCROLL_LIFT * hP
    const it = []
    const add = (o) => it.push({ z: 0, op: 1, f: 0, rf: 0, sd: 0, color: '#fff', ...o })
    if (!m) [-.36, .02, .40].forEach((fx) => add({ layer: 'amb', w: 1, h: H * 1.3, x: fx * W, y: 0, color: '#111', op: .09, f: .15 }))
    add({ layer: 'amb', w: W * 1.2, h: 1, x: 0, y: -.22 * H, color: '#111', op: .09, f: .2 })
    ;[[-.06, .3], [.08, -.3], [.42, .26]].forEach(([fx, fy]) => {
      add({ layer: 'amb', w: 14, h: 1, x: fx * W, y: fy * H, color: '#111', op: .4, f: .45 })
      add({ layer: 'amb', w: 1, h: 14, x: fx * W, y: fy * H, color: '#111', op: .4, f: .45 })
    })
    add({ layer: 'amb', circle: 1, w: (m ? .3 : .13) * W, x: L.x, y: L.y + .29 * hP, color: '#c4122b', op: .05, f: .35, z: .1 })
    add({ layer: 'amb', circle: 1, w: (m ? .22 : .10) * W, x: F.x + .05 * W, y: F.y + .29 * hP, color: '#2f9a52', op: .05, f: .3, z: .1 })
    add({ layer: 'amb', who: 'lula', shadow: 1, w: lw * .9, h: lh * .5, x: L.x, y: L.y - .1 * lh, alpha: soft, color: '#000', op: .06, f: .5, z: 1, sd })
    add({ layer: 'amb', who: 'flavio', shadow: 1, w: fw * .9, h: fh * .5, x: F.x, y: F.y - .1 * fh, alpha: soft, color: '#000', op: .06, f: .4, z: 1, sd })
    add({ layer: 'lula', who: 'lula', w: lw, h: lh, x: L.x, y: L.y, map: lt, alpha: fade, f: .8, rf: 1, z: 2, sd })
    add({ layer: 'flavio', who: 'flavio', w: fw, h: fh, x: F.x, y: F.y, map: ft, alpha: fade, f: .6, rf: .8, z: 3, sd })
    return it
  }, [W, H, lt, ft, fade, soft])

  useFrame((_, dt) => {
    if (M.on) {
      M.cx = THREE.MathUtils.damp(M.cx, M.tx, 2.6, dt)
      M.cy = THREE.MathUtils.damp(M.cy, M.ty, 2.6, dt)
    }
    M.ss = THREE.MathUtils.damp(M.ss, M.sp, 3.2, dt)

    // hover: o cursor está sobre a pessoa? (Flávio testado primeiro: está por cima)
    // teste na silhueta em tamanho normal (sem a escala do hover) → sair do candidato é imediato
    const cm = {}
    g.current.children.forEach((m) => { const u = m.userData; if (u.who && !u.shadow) cm[u.who] = m })
    let hit = null
    if (M.on) for (const w of ['flavio', 'lula']) {
      const m = cm[w]; if (!m) continue
      const u = (M.px - W / 2 - m.position.x) / m.userData.w + .5
      const v = (H / 2 - M.py - m.position.y) / m.userData.h + .5
      if (solid(grids[w], u, v)) { hit = w; break }
    }
    const tl = (hit === 'lula' || M.forceLula) ? 1 : 0
    const tf = (hit === 'flavio' || M.forceFlavio) ? 1 : 0

    // candidato: sobe suave, volta rápido | texto: reage quase imediato
    M.hl = THREE.MathUtils.damp(M.hl, tl, tl > M.hl ? 6 : 14, dt)
    M.hf = THREE.MathUtils.damp(M.hf, tf, tf > M.hf ? 6 : 14, dt)
    M.xl = THREE.MathUtils.damp(M.xl, tl, tl > M.xl ? 14 : 30, dt)
    M.xf = THREE.MathUtils.damp(M.xf, tf, tf > M.xf ? 14 : 30, dt)
    const HV = { lula: M.hl, flavio: M.hf }

    const r = rootRef.current
    r.style.setProperty('--mx', M.cx.toFixed(4)); r.style.setProperty('--my', M.cy.toFixed(4))
    r.style.setProperty('--hl', M.xl.toFixed(3)); r.style.setProperty('--hf', M.xf.toFixed(3))
    coordsRef.current.textContent = `X ${M.cx.toFixed(2)}  Y ${(-M.cy).toFixed(2)}`

    g.current.children.forEach((m) => {
      const u = m.userData, p = intro[u.layer]
      let dx = M.cx * AX * u.f, dy = -M.cy * AY * u.f
      let hv = 0
      if (u.who) {
        hv = HV[u.who]
        const ov = HV[u.who === 'lula' ? 'flavio' : 'lula']
        dy += M.ss * u.sd + hv * .012 * H            // scroll: sobem / hover: sobem um pouco
        m.scale.setScalar(1 + HOVER_SCALE * hv - .015 * ov)
      }
      if (u.layer === 'lula') dx -= (1 - p) * .05 * W
      if (u.layer === 'flavio') dx += (1 - p) * .05 * W
      if (u.layer === 'amb') dy -= (1 - p) * 14
      m.position.set(u.x + dx, u.y + dy, u.z)
      m.rotation.z = -M.cx * 0.026 * u.rf
      m.material.opacity = u.op * p * (u.shadow ? 1 + hv * 1.5 : 1)
    })

    const moving = Math.abs(M.tx - M.cx) + Math.abs(M.ty - M.cy) + Math.abs(M.sp - M.ss)
      + Math.abs(tl - M.hl) + Math.abs(tf - M.hf) + Math.abs(tl - M.xl) + Math.abs(tf - M.xf)
    if (moving > 0.0005) invalidate()
  })

  return (
    <group ref={g}>
      {items.map((it, i) => (
        <mesh key={i} userData={it} position={[it.x, it.y, it.z]}>
          {it.circle ? <circleGeometry args={[it.w, 64]} /> : <planeGeometry args={[it.w, it.h]} />}
          <meshBasicMaterial map={it.map} alphaMap={it.alpha} color={it.color} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function Stage3D(props) {
  return (
    <Canvas orthographic flat frameloop="demand" dpr={[1, 2]} gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }} className="gl">
      <Scene {...props} />
    </Canvas>
  )
}