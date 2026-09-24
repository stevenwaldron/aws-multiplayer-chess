import { useState } from 'react'

interface WaitingRoomProps {
  gameId: string
  onLeave: () => void
}

export default function WaitingRoom({ gameId, onLeave }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const shareLink = `${window.location.origin}/game/${gameId}`

  function handleCopy() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="lobby">
      <h1 className="lobby-title">Waiting for an opponent</h1>
      <p className="lobby-subtitle">Share this code or link to invite someone</p>

      <div className="invite-code">{gameId}</div>

      <button className="lobby-button primary" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy invite link'}
      </button>

      <button className="lobby-button ghost" onClick={onLeave}>
        Cancel
      </button>
    </div>
  )
}
