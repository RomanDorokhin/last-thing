import { useState } from 'react'
import Menu from './pages/Menu'
import Game from './pages/Game'
import Leaderboard from './pages/Leaderboard'

export type View = 'menu' | 'game' | 'leaderboard';

export default function App() {
  const [view, setView] = useState<View>('menu');

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      {view === 'menu' && <Menu onNavigate={setView} />}
      {view === 'game' && <Game onNavigate={setView} />}
      {view === 'leaderboard' && <Leaderboard onNavigate={setView} />}
    </div>
  )
}
