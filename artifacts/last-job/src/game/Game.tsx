import { useEffect, useRef, useState } from 'react';
import type { ScreenState } from './types';
import { PHASE_ENGINES, PHASES_CFG, hack } from './phaseEngines';
import { CHOICES, PHASE_INTROS, STORY, HINTS, MONOLOGUES, getEnding } from './narrative';

const W = 480, H = 720;

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core mutable game state — never triggers re-renders
  const G = useRef({
    phase: 0,
    noise: 0,
    running: false,
    dt: 0,
    lastTime: 0,
    keys: {} as Record<string, boolean>,
    morality: 50,
    choices: {} as Record<string, string>,
    startTime: 0,
  });

  // React UI state
  const [screen, setScreen] = useState<ScreenState>('intro');
  const [backstoryIdx, setBackstoryIdx] = useState(0);
  const [phaseIntro, setPhaseIntro] = useState<typeof PHASE_INTROS[0] | null>(null);
  const [choiceData, setChoiceData] = useState<typeof CHOICES[0] | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState('00:00');
  const [noiseDisplay, setNoiseDisplay] = useState(0);
  const [phaseLabelDisplay, setPhaseLabelDisplay] = useState('—');
  const [phaseColorDisplay, setPhaseColorDisplay] = useState('#fff');
  const [hintText, setHintText] = useState('');
  const [failVisible, setFailVisible] = useState(false);
  const [ending, setEnding] = useState<ReturnType<typeof getEnding> | null>(null);
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState({ phase: 0, label: '', sub: '', color: '' });
  const [morality, setMorality] = useState(50);

  // Refs for callbacks used inside the RAF loop (avoids stale closure / dependency issues)
  const onFailRef = useRef<() => void>(() => {});
  const onPhaseCompleteRef = useRef<(p: number) => void>(() => {});

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const showHint = (phaseIdx: number) => {
    setHintText(HINTS[phaseIdx]);
    setTimeout(() => setHintText(''), 4500);
  };

  const beginPhase = (phaseIdx: number) => {
    const g = G.current;
    g.phase = phaseIdx;
    g.noise = 0;
    g.lastTime = 0;
    g.running = true;
    PHASE_ENGINES[phaseIdx].init();
    setPhaseLabelDisplay(PHASES_CFG[phaseIdx].label);
    setPhaseColorDisplay(PHASES_CFG[phaseIdx].color);
    showHint(phaseIdx);
    setScreen('playing');
  };

  const doTransition = (phaseIdx: number, done?: () => void) => {
    G.current.running = false;
    setTransitionInfo({
      phase: phaseIdx,
      label: PHASES_CFG[phaseIdx].label,
      sub: PHASES_CFG[phaseIdx].sub,
      color: PHASES_CFG[phaseIdx].color,
    });
    setTransitionVisible(true);
    setTimeout(() => {
      setTransitionVisible(false);
      if (done) done();
      else beginPhase(phaseIdx);
    }, 1800);
  };

  const showInterlude = (phaseIdx: number, onDone: () => void) => {
    const intro = PHASE_INTROS.find(p => p.phase === phaseIdx);
    if (!intro) { onDone(); return; }
    setPhaseIntro(intro);
    setScreen('interlude');
    setTimeout(() => {
      setPhaseIntro(null);
      onDone();
    }, 5000);
  };

  // Store a pending choice callback so handleChoice can call it
  const pendingChoiceCb = useRef<(() => void) | null>(null);

  const triggerChoice = (choiceIdx: number, onDone: () => void) => {
    const choice = CHOICES[choiceIdx];
    if (!choice || G.current.choices[choice.id]) { onDone(); return; }
    setChoiceData(choice);
    setScreen('choice');
    pendingChoiceCb.current = onDone;
  };

  const handleChoice = (option: 'A' | 'B') => {
    if (!choiceData) return;
    const delta = option === 'A' ? choiceData.optionA.moralityDelta : choiceData.optionB.moralityDelta;
    const g = G.current;
    g.morality = Math.max(0, Math.min(100, g.morality + delta));
    g.choices[choiceData.id] = option;
    setMorality(g.morality);
    setChoiceData(null);
    const cb = pendingChoiceCb.current;
    pendingChoiceCb.current = null;
    if (cb) cb();
  };

  // ─── FAIL & PHASE COMPLETE (updated into refs before each frame) ───────────
  const doFail = () => {
    G.current.running = false;
    setFailVisible(true);
    setTimeout(() => {
      setFailVisible(false);
      G.current.noise = 0;
      PHASE_ENGINES[G.current.phase].init();
      G.current.lastTime = 0;
      G.current.running = true;
    }, 1400);
  };

  const doPhaseComplete = (phaseIdx: number) => {
    G.current.running = false;
    PHASE_ENGINES[phaseIdx].done = false;

    if (phaseIdx >= 4) {
      const end = getEnding(G.current.morality, G.current.choices);
      setEnding(end);
      setScreen('ending');
      return;
    }

    const nextPhase = phaseIdx + 1;

    showInterlude(nextPhase, () => {
      triggerChoice(nextPhase - 1, () => {
        doTransition(nextPhase);
      });
    });
  };

  // Keep refs current on every render so the RAF loop always has fresh callbacks
  onFailRef.current = doFail;
  onPhaseCompleteRef.current = doPhaseComplete;

  // ─── GAME LOOP — runs once on mount ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let alive = true;

    function loop(ts: number) {
      if (!alive) return;
      requestAnimationFrame(loop);

      const g = G.current;
      if (!g.lastTime) g.lastTime = ts;
      g.dt = Math.min((ts - g.lastTime) / (1000 / 60), 3);
      g.lastTime = ts;

      if (!g.running) return;

      const phase = PHASE_ENGINES[g.phase];
      phase.update(g as Parameters<typeof phase.update>[0], MONOLOGUES[g.phase] ?? []);
      phase.draw(ctx!);

      const elapsed = Math.floor((ts - g.startTime) / 1000);
      setElapsedDisplay(
        `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
      );
      setNoiseDisplay(g.noise);

      if (g.noise >= 100) {
        onFailRef.current();
        return;
      }

      if (phase.done) {
        onPhaseCompleteRef.current(g.phase);
      }
    }

    requestAnimationFrame(loop);

    return () => { alive = false; };
  }, []); // ← empty: loop runs exactly once

  // ─── KEYBOARD ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      G.current.keys[e.code] = true;
      if (G.current.phase === 1 && G.current.running) {
        if (e.code === 'Backspace') hack.onKey('BACKSPACE');
        else hack.onKey(e.key);
        e.preventDefault();
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { G.current.keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // touch is handled by the overlay buttons below

  // ─── UI HANDLERS ──────────────────────────────────────────────────────────
  const handleStart = () => {
    setBackstoryIdx(0);
    setScreen('backstory');
  };

  const storyLines = STORY.backstory.filter(l => l !== '');

  const handleBackstoryNext = () => {
    if (backstoryIdx < storyLines.length - 1) {
      setBackstoryIdx(i => i + 1);
    } else {
      G.current.startTime = performance.now();
      G.current.lastTime = 0;
      showInterlude(0, () => doTransition(0));
    }
  };

  const handleRestart = () => {
    G.current = {
      phase: 0, noise: 0, running: false, dt: 0, lastTime: 0,
      keys: {}, morality: 50, choices: {}, startTime: 0,
    };
    setMorality(50);
    setEnding(null);
    setBackstoryIdx(0);
    setScreen('intro');
  };

  // ─── DERIVED ──────────────────────────────────────────────────────────────
  const noiseColor = noiseDisplay > 70 ? '#ef4444' : noiseDisplay > 40 ? '#f59e0b' : '#6366f1';
  const moralityColor = morality >= 60 ? '#10b981' : morality >= 35 ? '#f59e0b' : '#ef4444';

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: "'Share Tech Mono', monospace",
      color: '#fff',
    }}>
      <div style={{ position: 'relative', width: 480, height: 720, flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ display: 'block', width: 480, height: 720, imageRendering: 'pixelated' }}
        />

        {/* HUD */}
        {screen === 'playing' && (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px 10px',
              pointerEvents: 'none', zIndex: 10,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3,
                color: phaseColorDisplay, textShadow: `0 0 20px ${phaseColorDisplay}`,
              }}>
                {phaseLabelDisplay}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
                {elapsedDisplay}
              </div>
            </div>
            {/* Morality */}
            <div style={{
              position: 'absolute', top: 52, right: 18,
              display: 'flex', alignItems: 'center', gap: 6,
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>СОВЕСТЬ</div>
              <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{
                  height: '100%', width: `${morality}%`,
                  background: moralityColor, transition: 'width 0.5s, background 0.5s',
                }} />
              </div>
            </div>
            {/* Noise bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', zIndex: 10 }}>
              <div style={{
                height: '100%', background: noiseColor, width: `${noiseDisplay}%`,
                transition: 'width 0.1s, background 0.3s',
                boxShadow: `0 0 8px ${noiseColor}`,
              }} />
            </div>
            {/* Hint — shows at top, fades out */}
            {hintText && (
              <div style={{
                position: 'absolute', top: 50, left: 0, right: 0,
                textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.55)',
                letterSpacing: 3, pointerEvents: 'none', zIndex: 10,
                animation: 'fadeIn 0.4s ease',
                textTransform: 'uppercase',
              }}>
                {hintText}
              </div>
            )}

            {/* TOUCH CONTROLS OVERLAY */}
            <TouchControls
              phase={G.current.phase}
              keys={G.current.keys}
              onHackKey={(k) => hack.onKey(k)}
            />
          </>
        )}

        {/* FAIL FLASH */}
        {failVisible && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.15)', zIndex: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 6, color: '#ef4444',
          }}>
            ПРОВАЛ
          </div>
        )}

        {/* TRANSITION */}
        {transitionVisible && (
          <div style={{
            position: 'absolute', inset: 0, background: '#000', zIndex: 15,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 6, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              ФАЗА {transitionInfo.phase + 1} / 5
            </div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 4,
              color: transitionInfo.color, textShadow: `0 0 30px ${transitionInfo.color}`,
            }}>
              {transitionInfo.label}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 12 }}>
              {transitionInfo.sub}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
              {PHASES_CFG.map((p, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= transitionInfo.phase ? p.color : 'rgba(255,255,255,0.15)',
                  boxShadow: i === transitionInfo.phase ? `0 0 8px ${p.color}` : 'none',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* INTRO */}
        {screen === 'intro' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.96)', zIndex: 20, textAlign: 'center', padding: 40,
          }}>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 6, lineHeight: 1, marginBottom: 8 }}>
              ПОСЛЕДНЕЕ<br />ДЕЛО
            </h1>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 32, textTransform: 'uppercase' }}>
              Ограбление века
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 320, marginBottom: 20 }}>
              Пять фаз. Пять выборов.<br />
              Твои решения определят исход.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
              {PHASES_CFG.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
            <Btn onClick={handleStart}>[ НАЧАТЬ ]</Btn>
          </div>
        )}

        {/* BACKSTORY */}
        {screen === 'backstory' && (
          <div
            onClick={handleBackstoryNext}
            style={{
              position: 'absolute', inset: 0, background: '#000', zIndex: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 60, cursor: 'pointer', animation: 'fadeIn 0.6s ease',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 40, textTransform: 'uppercase' }}>
              ДОСЬЕ
            </div>
            <div key={backstoryIdx} style={{
              fontSize: 18, color: '#fff', lineHeight: 2, letterSpacing: 1,
              maxWidth: 340, minHeight: 80, textAlign: 'center', animation: 'fadeIn 0.5s ease',
            }}>
              {storyLines[backstoryIdx]}
            </div>
            <div style={{ position: 'absolute', bottom: 40, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>
              {backstoryIdx < storyLines.length - 1 ? '[ нажми, чтобы продолжить ]' : '[ начать ]'}
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {storyLines.map((_, i) => (
                <div key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: i === backstoryIdx ? '#fff' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* INTERLUDE */}
        {screen === 'interlude' && phaseIntro && (
          <div style={{
            position: 'absolute', inset: 0, background: '#000', zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 60, textAlign: 'center', animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 4, marginBottom: 36, textTransform: 'uppercase' }}>
              ФАЗА {phaseIntro.phase + 1} — {PHASES_CFG[phaseIntro.phase].label}
            </div>
            {phaseIntro.lines.map((line, i) => (
              <div key={i} style={{
                fontSize: line === '' ? 0 : 15, height: line === '' ? 16 : 'auto',
                color: 'rgba(255,255,255,0.75)', lineHeight: 1.9, marginBottom: 2,
              }}>
                {line}
              </div>
            ))}
            {phaseIntro.quote && (
              <div style={{ marginTop: 40, padding: '0 20px', borderLeft: `2px solid ${PHASES_CFG[phaseIntro.phase].color}` }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.8 }}>
                  "{phaseIntro.quote}"
                </div>
                {phaseIntro.quoteAuthor && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8, letterSpacing: 2 }}>
                    — {phaseIntro.quoteAuthor}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHOICE */}
        {screen === 'choice' && choiceData && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 40, animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 36, textTransform: 'uppercase' }}>
              ВЫБОР
            </div>
            <div style={{
              fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2,
              textAlign: 'center', maxWidth: 340, marginBottom: 48, whiteSpace: 'pre-line',
            }}>
              {choiceData.text}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360 }}>
              {(['A', 'B'] as const).map(opt => {
                const data = opt === 'A' ? choiceData.optionA : choiceData.optionB;
                return (
                  <ChoiceBtn key={opt} onClick={() => handleChoice(opt)}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3, marginBottom: 6 }}>
                      {opt} · {data.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                      {data.hint}
                    </div>
                  </ChoiceBtn>
                );
              })}
            </div>
            <div style={{ marginTop: 36, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>
              Твой выбор повлияет на финал
            </div>
          </div>
        )}

        {/* ENDING */}
        {screen === 'ending' && ending && (
          <EndingScreen ending={ending} morality={morality} onRestart={handleRestart} />
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&display=swap');
          @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes fadeInUp { from { opacity:0;transform:translateY(12px) } to { opacity:1;transform:translateY(0) } }
        `}</style>
      </div>
    </div>
  );
}

// ─── TOUCH CONTROLS ───────────────────────────────────────────────────────────
function TBtn({
  label, style, onDown, onUp,
}: {
  label: React.ReactNode;
  style: React.CSSProperties;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <div
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onTouchCancel={(e) => { e.preventDefault(); onUp(); }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      style={{
        position: 'absolute',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 14,
        color: 'rgba(255,255,255,0.65)',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 22,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      {label}
    </div>
  );
}

function TouchControls({
  phase, keys, onHackKey,
}: {
  phase: number;
  keys: Record<string, boolean>;
  onHackKey: (k: string) => void;
}) {
  const setKey = (k: string, v: boolean) => { keys[k] = v; };

  const overlay: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, bottom: 4, height: 155,
    zIndex: 11, pointerEvents: 'auto',
  };

  if (phase === 1) {
    // Hack: 4 large letter buttons + backspace
    const hackBtnStyle = (left: number): React.CSSProperties => ({
      left, top: 14, width: 88, height: 68, fontSize: 28, borderRadius: 16,
      background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)',
      color: 'rgba(255,255,255,0.85)',
    });
    return (
      <div style={overlay}>
        {(['A','B','C','D'] as const).map((ch, i) => (
          <TBtn key={ch} label={ch}
            style={hackBtnStyle(16 + i * 110)}
            onDown={() => onHackKey(ch)} onUp={() => {}}
          />
        ))}
        <TBtn label="⌫" style={{ left: 148, top: 98, width: 184, height: 48, fontSize: 18, borderRadius: 12 }}
          onDown={() => onHackKey('BACKSPACE')} onUp={() => {}}
        />
      </div>
    );
  }

  // Movement phases (0,2,3,4): D-pad left + action right
  // Layout: [LEFT][UP][RIGHT] on row 1, [DOWN] centered on row 2
  const showAction = phase === 3 || phase === 4;
  const S = 56, G2 = 4;
  const dRow1Top = 8, dRow2Top = dRow1Top + S + G2;
  const dCol0 = 14, dCol1 = dCol0 + S + G2, dCol2 = dCol1 + S + G2;

  return (
    <div style={overlay}>
      {/* Row 1: LEFT · UP · RIGHT */}
      <TBtn label="◀" style={{ left: dCol0, top: dRow1Top, width: S, height: S }}
        onDown={() => setKey('ArrowLeft', true)} onUp={() => setKey('ArrowLeft', false)}
      />
      <TBtn label="▲" style={{ left: dCol1, top: dRow1Top, width: S, height: S }}
        onDown={() => setKey('ArrowUp', true)} onUp={() => setKey('ArrowUp', false)}
      />
      <TBtn label="▶" style={{ left: dCol2, top: dRow1Top, width: S, height: S }}
        onDown={() => setKey('ArrowRight', true)} onUp={() => setKey('ArrowRight', false)}
      />
      {/* Row 2: DOWN (centered under UP) */}
      <TBtn label="▼" style={{ left: dCol1, top: dRow2Top, width: S, height: S }}
        onDown={() => setKey('ArrowDown', true)} onUp={() => setKey('ArrowDown', false)}
      />
      {/* Action button: round button on right side */}
      {showAction && (
        <TBtn
          label={phase === 3 ? '⚡' : '↑'}
          style={{
            right: 18, top: 20, width: 88, height: 88, borderRadius: 44, fontSize: 30,
            background: phase === 3 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
            border: `1px solid ${phase === 3 ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.45)'}`,
          }}
          onDown={() => setKey('Space', true)} onUp={() => setKey('Space', false)}
        />
      )}
    </div>
  );
}

// ─── TINY COMPONENTS ──────────────────────────────────────────────────────────
function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'}`,
        color: '#fff', fontFamily: "'Share Tech Mono', monospace",
        fontSize: 13, letterSpacing: 3, padding: '14px 40px',
        cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s',
      }}>
      {children}
    </button>
  );
}

function ChoiceBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}`,
        color: '#fff', fontFamily: "'Share Tech Mono', monospace",
        fontSize: 12, letterSpacing: 2, padding: '18px 24px',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', lineHeight: 1.5, width: '100%',
      }}>
      {children}
    </button>
  );
}

function EndingScreen({ ending, morality, onRestart }: {
  ending: ReturnType<typeof getEnding>;
  morality: number;
  onRestart: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [showCoda, setShowCoda] = useState(false);
  const [showRestart, setShowRestart] = useState(false);

  useEffect(() => {
    if (lineIdx < ending.lines.length) {
      const t = setTimeout(() => setLineIdx(i => i + 1), 900);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setShowCoda(true), 800);
    const t2 = setTimeout(() => setShowRestart(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lineIdx, ending.lines.length]);

  const moralLabel = morality >= 60 ? 'ПРАВЕДНИК' : morality >= 35 ? 'ПРИЗРАК' : 'ИНСТРУМЕНТ';
  const moralColor = morality >= 60 ? '#10b981' : morality >= 35 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000', zIndex: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 50px', animation: 'fadeIn 1s ease', overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 6,
        color: ending.color, textShadow: `0 0 40px ${ending.color}`, marginBottom: 6,
      }}>
        {ending.title}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 40 }}>
        {ending.subtitle}
      </div>

      <div style={{ minHeight: 220, textAlign: 'center', width: '100%' }}>
        {ending.lines.slice(0, lineIdx).map((line, i) => (
          <div key={i} style={{
            fontSize: line === '' ? 0 : 14, height: line === '' ? 14 : 'auto',
            color: 'rgba(255,255,255,0.8)', lineHeight: 2, animation: 'fadeInUp 0.5s ease',
          }}>
            {line}
          </div>
        ))}
      </div>

      {showCoda && (
        <div style={{ marginTop: 32, padding: '16px 24px', borderLeft: `2px solid ${ending.color}`, animation: 'fadeIn 1s ease' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.8, textAlign: 'left', whiteSpace: 'pre-line' }}>
            {ending.coda}
          </div>
        </div>
      )}

      {showRestart && (
        <div style={{ marginTop: 32, textAlign: 'center', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 6 }}>ПРОФИЛЬ</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: moralColor, letterSpacing: 2 }}>{moralLabel}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 6 }}>СОВЕСТЬ</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: moralColor, letterSpacing: 2 }}>{morality}%</div>
            </div>
          </div>
          <Btn onClick={onRestart}>[ СНОВА ]</Btn>
        </div>
      )}
    </div>
  );
}
