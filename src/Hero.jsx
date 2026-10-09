import { useEffect, useRef } from 'react'
import Stage3D, { M, intro, inv } from './Scene.jsx'

export default function Hero() {
  const root = useRef(null)

  useEffect(() => {
    const kick = () => inv.fn && inv.fn()
    M.on = true
    intro.amb = 1
    intro.lula = 1
    intro.flavio = 1
    kick()

    const move = (e) => {
      M.px = e.clientX
      M.py = e.clientY
      if (!M.on) return
      M.tx = (e.clientX / innerWidth) * 2 - 1
      M.ty = (e.clientY / innerHeight) * 2 - 1
      kick()
    }

    const leave = () => {
      M.px = M.py = -9999
      M.tx = 0
      M.ty = 0
      kick()
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('mouseleave', leave)

    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
    }
  }, [])

  return (
    <div className="stage" ref={root}>
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-noise" />
        </div>

        <Stage3D rootRef={root} />

        <header className="hero-header">
          <h1 className="hero-title">
            <span className="hero-title-sub">Segundo Turno das</span>
            <span className="hero-title-main">Eleições Presidenciais 2026</span>
          </h1>
        </header>

        <div className="hero-question">
          <p className="question-text">
            <span className="q-line" data-t="Pra quem">Pra quem</span>
            <span className="q-line" data-t="vai seu apoio?">vai seu apoio?</span>
          </p>
        </div>

        <div className="hero-name-wrap name-wrap-lula">
          <div className="name lula" data-t="Lula">
            Lula
          </div>
        </div>

        <div className="hero-name-wrap name-wrap-flavio">
          <div className="name flavio" data-t="Flávio">
            Flávio
          </div>
        </div>

        <div className="micro micro-tl">Brasil</div>
        <div className="micro micro-tr">2026</div>
      </section>
    </div>
  )
}