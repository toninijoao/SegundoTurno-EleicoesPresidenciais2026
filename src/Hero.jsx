import { useCallback, useEffect, useRef, useState } from 'react'
import Stage3D, { M, intro, inv } from './Scene.jsx'
import { castVote, fetchTally } from './vote.js'

const fmt = (n) => n.toLocaleString('pt-BR')
const label = (n) => `${fmt(n)} ${n === 1 ? 'voto' : 'votos'}`

export default function Hero() {
  const root = useRef(null)
  const timer = useRef(0)
  const [tally, setTally] = useState({ lula: 0, flavio: 0 })
  const [voted, setVoted] = useState(() => localStorage.getItem('voto') || '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setTally(await fetchTally())
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [refresh])

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

  const say = (text) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 4500)
  }

  const vote = async (candidate) => {
    if (busy) return
    if (voted) {
      say('Seu apoio já foi registrado neste navegador.')
      return
    }
    setBusy(true)
    try {
      const result = await castVote(candidate)
      if (result === 'ok') {
        localStorage.setItem('voto', candidate)
        setVoted(candidate)
        say('Seu apoio foi registrado.')
        refresh()
      } else if (result === 'already') {
        localStorage.setItem('voto', 'x')
        setVoted('x')
        say('Esta conta Google já demonstrou apoio.')
      } else if (result === 'ip_limit') {
        say('Muitos votos vindos desta rede hoje. Tente mais tarde.')
      } else {
        say('Não foi possível registrar. Tente novamente.')
      }
    } catch (e) {
      say(e.message === 'popup_closed' ? 'Login com Google cancelado.' : 'Não foi possível registrar. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const onKey = (candidate) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      vote(candidate)
    }
  }

  const total = tally.lula + tally.flavio
  const pl = total ? (tally.lula / total) * 100 : 50
  const lp = total ? Math.round(pl) : 0
  const fp = total ? 100 - lp : 0

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
          <span className="question-hint">(clique no nome do seu candidato)</span>
        </div>

        <div className="vote" aria-live="polite">
          <div className="vote-pct">
            <span className="vp lula">{lp}%</span>
            <span className="vp flavio">{fp}%</span>
          </div>
          <div className="vote-bar" style={{ '--pl': pl }}>
            <span className="vb lula" />
            <span className="vb flavio" />
          </div>
          <div className="vote-count">
            <span>{label(tally.lula)}</span>
            <span>{label(tally.flavio)}</span>
          </div>
          <p className={`vote-msg${msg ? ' on' : ''}`}>{msg}</p>
        </div>

        <div className="hero-name-wrap name-wrap-lula">
          <div
            className="name lula"
            data-t="Lula"
            role="button"
            tabIndex={0}
            onClick={() => vote('lula')}
            onKeyDown={onKey('lula')}
          >
            Lula
          </div>
        </div>

        <div className="hero-name-wrap name-wrap-flavio">
          <div
            className="name flavio"
            data-t="Flávio"
            role="button"
            tabIndex={0}
            onClick={() => vote('flavio')}
            onKeyDown={onKey('flavio')}
          >
            Flávio
          </div>
        </div>

        <div className="micro micro-tl">Brasil</div>
        <div className="micro micro-tr">2026</div>
      </section>
    </div>
  )
}