import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Trophy, ArrowLeft, Medal, Clock, Users, Gamepad2 } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { data: leaderboard, isLoading, error: lbError } = trpc.game.getLeaderboard.useQuery({ limit: 20 }, { retry: false });
  const { data: stats } = trpc.game.getStats.useQuery(undefined, { retry: false });

  const getMedal = (idx: number) => {
    if (idx === 0) return <Medal className="w-5 h-5 text-yellow-400" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (idx === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-white/30 text-sm font-mono w-5 text-center">{idx + 1}</span>;
  };

  const formatTime = (seconds: number) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            МЕНЮ
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-mono tracking-widest">ЛИДЕРЫ</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-md mx-auto w-full px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-white/10 rounded p-3 text-center bg-white/5">
            <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono">{stats?.totalPlayers || 0}</div>
            <div className="text-[10px] text-white/40 font-mono">ИГРОКИ</div>
          </div>
          <div className="border border-white/10 rounded p-3 text-center bg-white/5">
            <Gamepad2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono">{stats?.totalRuns || 0}</div>
            <div className="text-[10px] text-white/40 font-mono">ЗАБЕГИ</div>
          </div>
          <div className="border border-white/10 rounded p-3 text-center bg-white/5">
            <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono">{stats?.completedRuns || 0}</div>
            <div className="text-[10px] text-white/40 font-mono">УСПЕХИ</div>
          </div>
        </div>

        {/* Leaderboard list */}
        <div className="border border-white/10 rounded overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40 font-mono tracking-wider">РЕЙТИНГ</span>
            <span className="text-xs text-white/40 font-mono tracking-wider">ВРЕМЯ</span>
          </div>

          {isLoading && (
            <div className="p-8 text-center text-white/30 font-mono text-sm">ЗАГРУЗКА...</div>
          )}

          {lbError && (
            <div className="p-8 text-center text-red-400/50 font-mono text-sm">
              ОФФЛАЙН-РЕЖИМ<br />
              <span className="text-[10px] text-white/20 uppercase">Сервер недоступен</span>
            </div>
          )}

          {leaderboard && leaderboard.length === 0 && !lbError && (
            <div className="p-8 text-center text-white/30 font-mono text-sm">
              ПОКА НЕТ РЕЗУЛЬТАТОВ<br />
              <span className="text-[10px]">БУДЬ ПЕРВЫМ!</span>
            </div>
          )}

          {leaderboard?.map((entry, idx) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                {getMedal(idx)}
                <div>
                  <div className="text-sm font-mono text-white/80">{entry.playerName}</div>
                  <div className="text-[10px] text-white/30 font-mono">
                    {new Date(entry.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-white/20" />
                <span className="text-sm font-mono text-green-400">{formatTime(entry.totalTime)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Phase breakdown hint */}
        <div className="mt-4 text-center">
          <div className="text-[10px] text-white/20 font-mono tracking-wider">
            ОТОБРАЖАЮТСЯ ТОЛЬКО ЗАВЕРШЁННЫЕ ПРОХОЖДЕНИЯ
          </div>
        </div>
      </div>
    </div>
  );
}
