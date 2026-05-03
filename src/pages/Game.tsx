import { useCallback, useState } from 'react';
import GameCanvas from '@/components/game/GameCanvas';
import { trpc } from '@/providers/trpc';
import { Trophy, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '@/game/sound';
import { View } from '../App';

export default function Game({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [status, setStatus] = useState<'playing' | 'failed' | 'victory'>('playing');
  const [finalTime, setFinalTime] = useState(0);
  const [finalPhaseTimes, setFinalPhaseTimes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [soundOn, setSoundOn] = useState(true);
  const submitScore = trpc.game.submitScore.useMutation({
    onError: (err) => console.log("Score not saved (Offline mode):", err.message)
  });

  const handleFail = useCallback(() => {
    setStatus('failed');
  }, []);

  const handleVictory = useCallback((time: number, phaseTimes: number[]) => {
    setStatus('victory');
    setFinalTime(time);
    setFinalPhaseTimes(phaseTimes);

    // Submit score anonymously
    const names = ['Гость', 'Неизвестный', 'Аноним', 'Вор', 'Ночной'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    submitScore.mutate({
      playerName: randomName,
      totalTime: time,
      phase1Time: phaseTimes[0] || 0,
      phase2Time: phaseTimes[1] || 0,
      phase3Time: phaseTimes[2] || 0,
      phase4Time: phaseTimes[3] || 0,
      phase5Time: phaseTimes[4] || 0,
      completed: 'true',
    });
  }, [submitScore]);

  const handleRestart = () => {
    setStatus('playing');
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.setEnabled(next);
  };

  const mm = String(Math.floor(finalTime / 60)).padStart(2, '0');
  const ss = String(finalTime % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Sound toggle */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full backdrop-blur text-white/70 hover:bg-white/20 transition"
      >
        {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {status === 'playing' && (
        <GameCanvas
          onFail={handleFail}
          onVictory={handleVictory}
          onBackToMenu={() => onNavigate('menu')}
        />
      )}

      {/* Fail Overlay */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-sm z-20 animate-fadeIn">
          <div className="text-red-500 text-5xl font-bold tracking-[6px] mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', textShadow: '0 0 40px rgba(239,68,68,0.6)' }}>
            ПРОВАЛ
          </div>
          <div className="text-white/40 text-xs tracking-[3px] font-mono mb-8">ТЕБЯ ЗАМЕТИЛИ</div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="px-8 py-3 border border-white/30 bg-white/5 text-white font-mono text-sm tracking-[3px] hover:bg-white/10 transition rounded flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              ЕЩЁ РАЗ
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-8 py-3 border border-white/20 text-white/70 font-mono text-sm tracking-[3px] hover:bg-white/5 transition rounded flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-yellow-500" />
              ЛИДЕРЫ
            </button>
            <button
              onClick={() => onNavigate('menu')}
              className="px-8 py-3 border border-white/10 text-white/50 font-mono text-sm tracking-[3px] hover:bg-white/5 transition rounded flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              В МЕНЮ
            </button>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {status === 'victory' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-950/30 backdrop-blur-sm z-20 animate-fadeIn">
          <div className="text-green-400 text-5xl font-bold tracking-[6px] mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', textShadow: '0 0 40px rgba(16,185,129,0.6)' }}>
            УШЛИ ЧИСТО
          </div>
          <div className="text-white/40 text-xs tracking-[3px] font-mono mb-2">ОГРАБЛЕНИЕ УДАЛОСЬ</div>
          <div className="text-green-300 text-2xl font-mono tracking-widest mb-6">
            {mm}:{ss}
          </div>

          {/* Phase breakdown */}
          <div className="grid grid-cols-5 gap-2 mb-6 text-center">
            {['СТЕЛС', 'ВЗЛОМ', 'ПОГОНЯ', 'ПЕРЕСТРЕЛКА', 'ПОБЕГ'].map((p, i) => {
              const pt = finalPhaseTimes[i] || 0;
              const pmm = String(Math.floor(pt / 60)).padStart(2, '0');
              const pss = String(pt % 60).padStart(2, '0');
              return (
                <div key={p} className="flex flex-col items-center">
                  <div className="text-[8px] text-white/30 font-mono mb-1">{p}</div>
                  <div className="text-xs text-white/60 font-mono">{pmm}:{pss}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="px-8 py-3 border border-white/30 bg-white/5 text-white font-mono text-sm tracking-[3px] hover:bg-white/10 transition rounded flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              ЕЩЁ РАЗ
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-8 py-3 border border-white/20 text-white/70 font-mono text-sm tracking-[3px] hover:bg-white/5 transition rounded flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-yellow-500" />
              ЛИДЕРЫ
            </button>
            <button
              onClick={() => onNavigate('menu')}
              className="px-8 py-3 border border-white/10 text-white/50 font-mono text-sm tracking-[3px] hover:bg-white/5 transition rounded flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              В МЕНЮ
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
