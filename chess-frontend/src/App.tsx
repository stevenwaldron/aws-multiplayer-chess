import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ChessBoard from './components/ChessBoard'
import ThemeSelector from './components/ThemeSelector'
import Lobby from './components/Lobby'
import WaitingRoom from './components/WaitingRoom'
import CapturedTray from './components/CapturedTray'
import { useChessSocket } from './hooks/useChessSocket'
import type { ThemeName } from './pieceGeometry'

export default function App() {
  const {
    phase,
    gameId,
    playerColor,
    boardState,
    turn,
    status,
    moveHistory,
    lastMove,
    errorMessage,
    isCpuGame,
    createGame,
    joinGame,
    createGameVsCpu,
    sendMove,
    leaveGame,
  } = useChessSocket()

  const [theme, setTheme] = useState<ThemeName>('classic')
  const [menuOpen, setMenuOpen] = useState(false)

  if (phase === 'connecting') {
    return (
      <div className="app-shell">
        <div className="center-message">Connecting…</div>
      </div>
    )
  }

  if (phase === 'landing') {
    return (
      <div className="app-shell">
        <Lobby onCreate={createGame} onJoin={joinGame} onPlayVsCpu={createGameVsCpu} errorMessage={errorMessage} />
      </div>
    )
  }

  if (phase === 'waiting' && gameId) {
    return (
      <div className="app-shell">
        <WaitingRoom gameId={gameId} onLeave={leaveGame} />
      </div>
    )
  }

  if (!boardState || !playerColor) {
    return (
      <div className="app-shell">
        <div className="center-message">Loading game…</div>
      </div>
    )
  }

  const isMyTurn = turn === playerColor && status === 'in_progress'

  return (
    <div className="app-shell">
      <div className="hud">
        <div className="hud-turn">
          <span className={`turn-dot ${turn}`} />
          {status === 'checkmate'
            ? `Checkmate — ${turn === 'white' ? 'Black' : 'White'} wins`
            : status === 'draw'
            ? 'Draw'
            : isMyTurn
            ? 'Your move'
            : `${turn === 'white' ? 'White' : 'Black'} to move`}
        </div>

        <button className="hud-menu-toggle" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? '✕ Close' : '☰ Menu'}
        </button>

        {menuOpen && (
          <div className="hud-menu-panel">
            <div className="hud-you">You're playing {playerColor}{isCpuGame ? ' vs CPU' : ''}</div>
            <button
              className="hud-leave-button"
              onClick={() => {
                if (window.confirm('Leave this game? You won\u2019t be able to rejoin it afterward.')) {
                  leaveGame()
                }
              }}
            >
              Leave game
            </button>
            <CapturedTray moveHistory={moveHistory} />
            <div className="hud-log">
              {moveHistory.length === 0 ? (
                <span className="hud-log-empty">No moves yet</span>
              ) : (
                moveHistory.slice(-6).map((m, i) => (
                  <span key={i} className="hud-log-entry">
                    {m.san}
                  </span>
                ))
              )}
            </div>
            <ThemeSelector theme={theme} onChange={setTheme} />
          </div>
        )}

        {errorMessage && !['not_found', 'invalid_token', 'expired'].includes(errorMessage) && (
          <div className="hud-error">{errorMessage.replace(/_/g, ' ')}</div>
        )}
      </div>

      <Canvas shadows camera={{ position: [0, 8, 9], fov: 45 }}>
        <color attach="background" args={['#1B1712']} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[6, 10, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-6, 4, -4]} intensity={0.3} color="#5DCAA5" />

        <ChessBoard
          boardFen={boardState}
          myColor={playerColor}
          isMyTurn={isMyTurn}
          onAttemptMove={sendMove}
          theme={theme}
          lastMove={lastMove}
        />

        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={16}
          minPolarAngle={0.3}
          maxPolarAngle={1.3}
        />
      </Canvas>

      {(status === 'checkmate' || status === 'draw') && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>{status === 'checkmate' ? `${turn === 'white' ? 'Black' : 'White'} wins!` : "It's a draw"}</h2>
            <button className="lobby-button primary" onClick={leaveGame}>
              Back to lobby
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
