import { useState } from 'react'

export type Difficulty = 'easy' | 'medium' | 'hard'

interface LobbyProps {
  onCreate: () => void
  onJoin: (code: string) => void
  onPlayVsCpu: (difficulty: Difficulty) => void
  errorMessage: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Couldn't find a game with that code — check for typos.",
  expired: 'That invite has expired. Ask for a new one.',
  already_full: "That game's already full.",
  invalid_token: 'That session is no longer valid — starting fresh.',
  unknown_action: 'Something went wrong on our end. Try again.',
  connection_lost: 'Connection dropped — reconnecting, try again in a moment.',
  'Backend not configured': "The app wasn't built with a backend URL — check .env.local.",
  server_error: 'Something went wrong. Try again.',
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export default function Lobby({ onCreate, onJoin, onPlayVsCpu, errorMessage }: LobbyProps) {
  const [joinCode, setJoinCode] = useState('')
  const [showDifficulty, setShowDifficulty] = useState(false)

  return (
    <div className="lobby">
      <h1 className="lobby-title">3D Chess</h1>
      <p className="lobby-subtitle">Play a real-time game with a friend, or against the computer</p>

      <button className="lobby-button primary" onClick={onCreate}>
        Create a game
      </button>

      <div className="lobby-divider">or</div>

      <form
        className="lobby-join-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (joinCode.trim()) onJoin(joinCode)
        }}
      >
        <input
          className="lobby-input"
          type="text"
          placeholder="swift-falcon-42"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button className="lobby-button" type="submit" disabled={!joinCode.trim()}>
          Join
        </button>
      </form>

      <div className="lobby-divider">or</div>

      {!showDifficulty ? (
        <button className="lobby-button ghost-outline" onClick={() => setShowDifficulty(true)}>
          Play vs CPU
        </button>
      ) : (
        <div className="difficulty-row">
          {DIFFICULTIES.map((d) => (
            <button key={d.value} className="lobby-button" onClick={() => onPlayVsCpu(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="lobby-error">{ERROR_MESSAGES[errorMessage] || 'Something went wrong.'}</div>
      )}
    </div>
  )
}
