import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const M = { on: true, tx: 0, ty: 0, cx: 0, cy: 0, sp: 0, ss: 0, px: -9999, py: -9999, hl: 0, hf: 0, forceLula: false, forceFlavio: false }
export const intro = { amb: 1, lula: 1, flavio: 1 }
export const inv = { fn: null }

const AX = 15, AY = 8
const HOVER_SCALE = 0.08 // quanto o candidato cresce ao passar o mouse

const gradTex = (draw) => {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); draw(g)
  return new THREE.CanvasTexture(c)
}

// Fade suave apenas nos 12% inferiores da foto
const fadeMask = () => gradTex((g) => {
  let v = g.createLinearGradient(0, 0, 0, 256)
  v.addColorStop(0, '#fff')
  v.addColorStop(0.85, '#fff')
  v.addColorStop(0.95, '#8a8a8a')
  v.addColorStop(1, '#000')
  g.fillStyle = v
  g.fillRect(0, 0, 256, 256)
  g.globalCompositeOperation = 'multiply'
  let h = g.createLinearGradient(0, 0, 256, 0)
  h.addColorStop(0, '#000')
  h.addColorStop(0.02, '#fff')
  h.addColorStop(0.98, '#fff')
  h.addColorStop(1, '#000')
  g.fillStyle = h
  g.fillRect(0, 0, 256, 256)
})

const softMask = () => gradTex((g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, '#fff'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, 256, 256)
})

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

function Scene({ rootRef }) {
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
    // Maior escala: ocupando mais espaço pra cima e preenchendo a composição
    const hP = m ? 0.48 * H : Math.min(0.80 * H, 0.42 * W)
    const lh = hP, lw = hP * 1.5
    // Flávio um pouco maior para equilibrar com a presença e chapéu do Lula
    const fh = m ? hP * 1.05 : hP * 1.07
    const fw = fh * (1672 / 941)

    // Posicionamento vertical: mais para cima, com base descendo harmoniosamente
    const yyL = -H / 2 + 0.54 * lh
    const yyF = -H / 2 + 0.54 * fh

    // Lula: escapando sutilmente pela lateral esquerda
    const L = m ? { x: -0.12 * W, y: 0.1 * H } : { x: -0.06 * W - 0.47 * lw, y: yyL }
    // Flávio: um pouco maior e mais ao centro, porém ainda escapando pela lateral
    const F = m ? { x: 0.10 * W, y: -0.2 * H } : { x: 0.045 * W + 0.32 * fw, y: yyF }

    const it = []
    const add = (o) => it.push({ z: 0, op: 1, f: 0, rf: 0, renderOrder: 0, color: '#fff', ...o })

    // Elementos de ambiente decorativos (estritamente atrás, renderOrder: 0, z negativo)
    if (!m) [-.36, .02, .40].forEach((fx) => add({ layer: 'amb', w: 1, h: H * 1.3, x: fx * W, y: 0, color: '#111', op: .06, f: 0, z: -20, renderOrder: 0 }))
    add({ layer: 'amb', w: W * 1.2, h: 1, x: 0, y: -.22 * H, color: '#111', op: .06, f: 0, z: -20, renderOrder: 0 })

    // Círculos de iluminação atmosférica suave atrás dos candidatos
    add({ layer: 'amb', circle: 1, w: (m ? .3 : .14) * W, x: L.x, y: L.y + .26 * lh, color: '#c4122b', op: .05, f: 0, z: -10, renderOrder: 1 })
    add({ layer: 'amb', circle: 1, w: (m ? .22 : .12) * W, x: F.x + .05 * W, y: F.y + .26 * fh, color: '#2f9a52', op: .05, f: 0, z: -10, renderOrder: 1 })

    // Sombras suaves de profundidade atrás dos candidatos
    add({ layer: 'amb', who: 'lula', shadow: 1, w: lw * .9, h: lh * .5, x: L.x, y: L.y - .1 * lh, alpha: soft, color: '#000', op: .05, f: .6, z: -2, renderOrder: 2 })
    add({ layer: 'amb', who: 'flavio', shadow: 1, w: fw * .9, h: fh * .5, x: F.x, y: F.y - .1 * fh, alpha: soft, color: '#000', op: .05, f: .6, z: -2, renderOrder: 2 })

    // Candidatos (protagonistas, na frente do ambiente, renderOrder alto)
    add({ layer: 'lula', who: 'lula', w: lw, h: lh, x: L.x, y: L.y, map: lt, alpha: fade, f: .8, rf: 1, z: 1, renderOrder: 10 })
    add({ layer: 'flavio', who: 'flavio', w: fw, h: fh, x: F.x, y: F.y, map: ft, alpha: fade, f: .8, rf: 1, z: 2, renderOrder: 11 })

    return it
  }, [W, H, lt, ft, fade, soft])

  useFrame((_, dt) => {
    if (M.on) {
      M.cx = THREE.MathUtils.damp(M.cx, M.tx, 2.8, dt)
      M.cy = THREE.MathUtils.damp(M.cy, M.ty, 2.8, dt)
    }

    // Hit test do hover sobre a pessoa (Flávio primeiro, fica por cima).
    // Usa a silhueta em tamanho NORMAL (sem m.scale): sair do candidato é imediato.
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

    // Candidato: sobe suave, volta rápido
    M.hl = THREE.MathUtils.damp(M.hl, tl, tl > M.hl ? 6 : 12, dt)
    M.hf = THREE.MathUtils.damp(M.hf, tf, tf > M.hf ? 6 : 12, dt)
    const HV = { lula: M.hl, flavio: M.hf }

    // Texto no DOM: segue o ALVO direto (sem amortecer) → entra e sai no mesmo frame
    const r = rootRef?.current
    if (r) {
      r.classList.toggle('hover-lula', tl === 1)
      r.classList.toggle('hover-flavio', tf === 1)
    }

    g.current.children.forEach((m) => {
      const u = m.userData
      let dx = 0, dy = 0
      let hv = 0
      if (u.who) {
        hv = HV[u.who]
        const ov = HV[u.who === 'lula' ? 'flavio' : 'lula']
        dx = M.cx * AX * u.f
        dy = -M.cy * AY * u.f + hv * 0.015 * H // sobe um pouco no hover
        m.scale.setScalar(1 + HOVER_SCALE * hv - 0.015 * ov)
      }
      m.position.set(u.x + dx, u.y + dy, u.z)
      m.rotation.z = 0
      m.material.opacity = u.op * (u.shadow ? 1 + hv * 1.5 : 1)
    })

    if (Math.abs(M.tx - M.cx) + Math.abs(M.ty - M.cy) + Math.abs(tl - M.hl) + Math.abs(tf - M.hf) > 0.0005) {
      invalidate()
    }
  })

  return (
    <group ref={g}>
      {items.map((it, i) => (
        <mesh key={i} userData={it} position={[it.x, it.y, it.z]} renderOrder={it.renderOrder}>
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