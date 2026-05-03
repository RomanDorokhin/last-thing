import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, resetGameState } from '@/game/engine';
import { G, PHASES, W, H } from '@/game/types';
import { sound } from '@/game/sound';

interface GameCanvasProps {
  onPhaseChange?: (phase: number, label: string, color: string, sub: string) => void;
  onFail?: () => void;
  onVictory?: (time: number, phaseTimes: number[]) => void;
  onBackToMenu?: () => void;
}

export default function GameCanvas({ onPhaseChange, onFail, onVictory, onBackToMenu }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [phase, setPhase] = useState(0);
  const [noise, setNoise] = useState(0);
  const [time, setTime] = useState('00:00');
  const [showTransition, setShowTransition] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState({ label: '', sub: '', color: '#fff', phaseNum: '' });
  const [countdown, setCountdown] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number>(0);

  const startGame = useCallback(() => {
    resetGameState();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onPhaseChange = (p: number) => {
      setShowTransition(true);
      setTransitionInfo({
        label: PHASES[p].label,
        sub: PHASES[p].sub,
        color: PHASES[p].color,
        phaseNum: `ФАЗА ${p + 1} / 5`,
      });
      setPhase(p);
      setTimeout(() => setShowTransition(false), 1500);
      onPhaseChange?.(p, PHASES[p].label, PHASES[p].color, PHASES[p].sub);
    };

    engine.onFail = () => {
      sound.fail();
      onFail?.();
    };

    engine.onVictory = (t: number, pt: number[]) => {
      onVictory?.(t, pt);
    };

    engine.onNoiseChange = (n: number) => {
      setNoise(n);
    };

    engine.start();
    timerRef.current = window.setInterval(() => {
      if (engine.startTime && G.running) {
        const elapsed = Math.floor((performance.now() - engine.startTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        setTime(`${mm}:${ss}`);
      }
    }, 500);
  }, [onPhaseChange, onFail, onVictory]);

  useEffect(() => {
    setCountdown(3);
    let cd = 3;
    
    // Focus canvas immediately
    

    const cdInterval = window.setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(cdInterval);
        startGame();
        // Focus again when game actually starts
        
      }
    }, 800);
    return () => {
      clearInterval(cdInterval);
      engineRef.current?.stop();
      clearInterval(timerRef.current);
    };
  }, [startGame]);

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      G.keys[e.code] = true;
      engineRef.current?.handleKey(e.code, e.key, true);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      G.keys[e.code] = false;
      engineRef.current?.handleKey(e.code, e.key, false);
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  // Touch controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchActive = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchActive.current = true;
    G.keys['Space'] = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    G.keys['ArrowLeft'] = false;
    G.keys['ArrowRight'] = false;
    G.keys['ArrowUp'] = false;
    G.keys['ArrowDown'] = false;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) G.keys['ArrowRight'] = true;
      else if (dx < -20) G.keys['ArrowLeft'] = true;
    } else {
      if (dy < -20) G.keys['ArrowUp'] = true;
      else if (dy > 20) G.keys['ArrowDown'] = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchActive.current = false;
    G.keys['ArrowLeft'] = false;
    G.keys['ArrowRight'] = false;
    G.keys['ArrowUp'] = false;
    G.keys['ArrowDown'] = false;
    G.keys['Space'] = false;
    touchStart.current = null;
  }, []);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      engineRef.current?.resume();
    } else {
      setPaused(true);
      engineRef.current?.pause();
    }
  };

  const noiseColor = noise > 70 ? '#ef4444' : noise > 40 ? '#f59e0b' : '#6366f1';

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none overflow-hidden">
      <div className="relative" style={{ width: '100%', maxWidth: 480, aspectRatio: '480/720' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          
          
          className="w-full h-full block rounded-lg outline-none"
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          
        />

        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
          <div className="text-white font-bold tracking-widest text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif', textShadow: `0 0 20px ${PHASES[phase].color}`, color: PHASES[phase].color }}>
            {PHASES[phase].label}
          </div>
          <div className="text-white/50 text-xs tracking-widest font-mono">{time}</div>
        </div>

        {/* Noise Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full transition-all duration-100" style={{ width: `${noise}%`, background: noiseColor, boxShadow: `0 0 8px ${noiseColor}` }} />
        </div>

        {/* Pause Button */}
        <button
          
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full backdrop-blur text-white/70 hover:bg-white/20 transition"
        >
          {paused ? '▶' : '⏸'}
        </button>

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
            <div className="text-white text-7xl font-bold tracking-widest font-mono animate-pulse">
              {countdown}
            </div>
            <div className="text-white/40 text-xs tracking-[4px] font-mono mt-4">ГОТОВЬСЯ</div>
          </div>
        )}

        {/* Pause Overlay */}
        {paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <div className="text-white text-2xl font-bold tracking-widest mb-6 font-mono">ПАУЗА</div>
            <button  className="px-6 py-3 border border-white/40 text-white font-mono text-sm tracking-widest hover:bg-white/10 transition mb-3 rounded">
              ПРОДОЛЖИТЬ
            </button>
            <button  className="px-6 py-3 border border-white/20 text-white/60 font-mono text-sm tracking-widest hover:bg-white/10 transition rounded">
              В МЕНЮ
            </button>
          </div>
        )}

        {/* Phase Transition */}
        {showTransition && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-15 animate-fadeIn">
            <div className="text-white/40 text-xs tracking-[6px] font-mono mb-2">{transitionInfo.phaseNum}</div>
            <div className="text-white text-5xl tracking-widest font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif', color: transitionInfo.color, textShadow: `0 0 30px ${transitionInfo.color}` }}>
              {transitionInfo.label}
            </div>
            <div className="text-white/40 text-xs tracking-[2px] font-mono mt-3">{transitionInfo.sub}</div>
          </div>
        )}

        {/* Mobile Hint */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/20 text-[10px] tracking-widest font-mono pointer-events-none">
          {PHASES[phase].hint}
        </div>
      </div>
    </div>
  );
}
