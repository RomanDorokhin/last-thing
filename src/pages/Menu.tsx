import { useNavigate } from 'react-router';
import { Trophy, Play, Volume2, VolumeX, ChevronRight, Shield, Zap, Target, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { sound } from '@/game/sound';

export default function Menu() {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const [tgReady, setTgReady] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgReady(true);
    }
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.setEnabled(next);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        <div className="mb-2">
          <h1 className="text-6xl font-bold tracking-[6px] leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ПОСЛЕДНЕЕ
          </h1>
          <h1 className="text-6xl font-bold tracking-[6px] leading-none text-red-500" style={{ fontFamily: 'Bebas Neue, sans-serif', textShadow: '0 0 40px rgba(239,68,68,0.5)' }}>
            ДЕЛО
          </h1>
        </div>
        <div className="text-xs text-white/40 tracking-[4px] uppercase mb-8 font-mono">
          Ограбление века
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {['СТЕЛС', 'ВЗЛОМ', 'ПОГОНЯ', 'ПЕРЕСТРЕЛКА', 'ПОБЕГ'].map((p, i) => (
            <div key={p} className="flex flex-col items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: i === 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                  boxShadow: i === 0 ? '0 0 8px #fff' : 'none',
                }}
              />
              <span className="text-[8px] text-white/30 tracking-wider font-mono">{p}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => navigate('/game')}
            className="group relative px-8 py-4 border border-white/30 bg-white/5 backdrop-blur text-white font-mono text-sm tracking-[3px] hover:bg-white/10 hover:border-white/60 transition-all duration-300 rounded overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3">
              <Play className="w-4 h-4 group-hover:scale-110 transition" />
              НАЧАТЬ ОГРАБЛЕНИЕ
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="group px-8 py-3 border border-white/20 bg-white/5 backdrop-blur text-white/80 font-mono text-sm tracking-[3px] hover:bg-white/10 hover:border-white/50 transition-all duration-300 rounded"
          >
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-4 h-4 text-yellow-500" />
              ТАБЛИЦА ЛИДЕРОВ
            </div>
          </button>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={toggleSound}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded text-white/50 text-xs font-mono hover:bg-white/5 transition"
          >
            {soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {soundOn ? 'ЗВУК ВКЛ' : 'ЗВУК ВЫКЛ'}
          </button>
          <div className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded text-white/50 text-xs font-mono">
            <Users className="w-3 h-3" />
            ГОСТЬ
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="flex items-start gap-2 p-3 border border-white/10 rounded bg-white/5">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-mono text-white/70">5 ФАЗ</div>
              <div className="text-[10px] text-white/30 font-mono">Стелс · Взлом · Погоня</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border border-white/10 rounded bg-white/5">
            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-mono text-white/70">ТАБЛИЦА ЛИДЕРОВ</div>
              <div className="text-[10px] text-white/30 font-mono">Соревнуйся с игроками</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border border-white/10 rounded bg-white/5">
            <Target className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-mono text-white/70">ШАТДАУН МЕХАНИКА</div>
              <div className="text-[10px] text-white/30 font-mono">Не попадайся</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border border-white/10 rounded bg-white/5">
            <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-mono text-white/70">MOBILE READY</div>
              <div className="text-[10px] text-white/30 font-mono">Touch управление</div>
            </div>
          </div>
        </div>

        {tgReady && (
          <div className="mt-4 text-[10px] text-white/20 font-mono tracking-wider">
            TELEGRAM WEB APP
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
