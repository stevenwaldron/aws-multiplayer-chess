import { useCallback, useEffect, useRef, useState } from 'react'
import type { PieceColor } from '../chessTypes'

export type GamePhase = 'landing' | 'connecting' | 'waiting' | 'playing' | 'game_over'
export type GameStatus = 'waiting' | 'in_progress' | 'checkmate' | 'draw' | 'resigned'
export type Difficulty = 'easy' | 'medium' | 'hard'

interface Session {
  gameId: string
  playerToken: string
}

export interface MoveHistoryEntry {
  from: string
  to: string
  san: string
  color: PieceColor
  captured: string | null
  timestamp: number
}

export interface LastMove {
  from: string
  to: string
  moveKey: number
}

const SESSION_KEY = 'chess_session'
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL as string | undefined

function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function useChessSocket() {
  const socketRef = useRef<WebSocket | null>(null)
  const isUnmountedRef = useRef(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [phase, setPhase] = useState<GamePhase>('connecting')
  const [wsConnected, setWsConnected] = useState(false)
  const [gameId, setGameId] = useState<string | null>(null)
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null)
  const [boardState, setBoardState] = useState<string | null>(null)
  const [turn, setTurn] = useState<PieceColor>('white')
  const [status, setStatus] = useState<GameStatus>('waiting')
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([])
  const [lastMove, setLastMove] = useState<LastMove | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCpuGame, setIsCpuGame] = useState(false)

  const send = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
      return true
    }
    // The socket isn't open — most commonly because API Gateway's default
    // 10-minute idle-connection timeout closed it while the tab sat on the
    // lobby or mid-thought. Surface that instead of failing silently; the
    // reconnect loop below is already working on restoring it.
    setErrorMessage('connection_lost')
    return false
  }, [])

  useEffect(() => {
    if (!WS_URL) {
      console.error('VITE_WEBSOCKET_URL is not set — see .env.example')
      setErrorMessage('Backend not configured')
      setPhase('landing')
      return
    }

    function connectSocket() {
      const socket = new WebSocket(WS_URL as string)
      socketRef.current = socket

      socket.onopen = () => {
        setWsConnected(true)
        setErrorMessage((prev) => (prev === 'connection_lost' ? null : prev))
        const session = loadSession()
        if (session) {
          send({ action: 'reconnect', game_id: session.gameId, player_token: session.playerToken })
        } else {
          setPhase('landing')
        }
      }

      socket.onclose = () => {
        setWsConnected(false)
        if (isUnmountedRef.current) return
        // A closed socket while mid-game just means "reconnecting" from the
        // user's perspective — the session in localStorage is what lets a
        // page refresh (or this automatic reconnect) resume the same game
        // rather than starting over. Fixed 2s backoff is plenty for an idle
        // API Gateway connection that just needs re-establishing.
        setPhase((prev) => (prev === 'landing' ? 'landing' : 'connecting'))
        reconnectTimeoutRef.current = setTimeout(connectSocket, 2000)
      }

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      }
    }

    connectSocket()

    const keepaliveInterval = setInterval(() => {
      send({ action: 'ping' })
    }, 5 * 60 * 1000) // well under API Gateway's 10-minute idle timeout

    return () => {
      isUnmountedRef.current = true
      clearInterval(keepaliveInterval)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      socketRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // IMPORTANT: this function is only ever wired up once, inside the mount-only
  // useEffect below (socket.onmessage = ...). That means its closure captures
  // state as of the FIRST render — reading a state *value* (e.g. `turn`)
  // in here would silently use stale data forever. Only setState calls
  // (which are stable across renders) and values from `msg` itself are safe
  // to use inside this function.
  function handleMessage(msg: any) {
    switch (msg.type) {
      case 'created':
        saveSession({ gameId: msg.game_id, playerToken: msg.player_token })
        setGameId(msg.game_id)
        setPlayerColor(msg.color)
        setStatus('waiting')
        setPhase('waiting')
        break

      case 'joined':
        saveSession({ gameId: msg.game_id, playerToken: msg.player_token })
        setGameId(msg.game_id)
        setPlayerColor(msg.color)
        setBoardState(msg.board_state)
        setTurn(msg.turn)
        setStatus('in_progress')
        setPhase('playing')
        break

      case 'game_started':
        setBoardState(msg.board_state)
        setTurn(msg.turn)
        setStatus('in_progress')
        setPhase('playing')
        break

      case 'cpu_game_started':
        saveSession({ gameId: msg.game_id, playerToken: msg.player_token })
        setGameId(msg.game_id)
        setPlayerColor(msg.color)
        setBoardState(msg.board_state)
        setTurn(msg.turn)
        setStatus('in_progress')
        setIsCpuGame(true)
        setPhase('playing')
        break

      case 'reconnected':
        setGameId(msg.game_id)
        setPlayerColor(msg.color)
        setBoardState(msg.board_state)
        setTurn(msg.turn)
        setStatus(msg.status)
        setMoveHistory(msg.move_history || [])
        setIsCpuGame(!!msg.is_cpu_game)
        setPhase(msg.status === 'waiting' ? 'waiting' : msg.status === 'in_progress' ? 'playing' : 'game_over')
        break

      case 'move_made': {
        setBoardState(msg.board_state)
        setTurn(msg.turn)
        setStatus(msg.status)
        setLastMove({ from: msg.from, to: msg.to, moveKey: Date.now() })
        // The mover's color is the opposite of msg.turn (the *new* turn the
        // server just handed us) — deriving it this way avoids reading the
        // `turn` state directly, which would be stale here (see note above
        // handleMessage: this closure is only ever the mount-time one).
        const moverColor: PieceColor = msg.turn === 'white' ? 'black' : 'white'
        setMoveHistory((prev) => [
          ...prev,
          { from: msg.from, to: msg.to, san: msg.san, color: moverColor, captured: msg.captured ?? null, timestamp: Date.now() },
        ])
        if (msg.status === 'checkmate' || msg.status === 'draw') {
          setPhase('game_over')
        }
        break
      }

      case 'pong':
        // Keepalive response — nothing to do, its purpose is just to keep
        // the connection from going idle.
        break

      case 'error':
        setErrorMessage(msg.error)
        // A failed reconnect (stale/invalid session) should fall back to a
        // fresh landing screen rather than getting stuck.
        if (['not_found', 'invalid_token', 'expired'].includes(msg.error)) {
          clearSession()
          setPhase('landing')
        }
        break
    }
  }

  const createGame = useCallback(() => {
    setErrorMessage(null)
    send({ action: 'create' })
  }, [send])

  const joinGame = useCallback(
    (code: string) => {
      setErrorMessage(null)
      send({ action: 'join', game_id: code.trim().toLowerCase() })
    },
    [send]
  )

  const createGameVsCpu = useCallback(
    (difficulty: Difficulty) => {
      setErrorMessage(null)
      send({ action: 'create_vs_cpu', difficulty })
    },
    [send]
  )

  const sendMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      setErrorMessage(null)
      send({ action: 'move', from, to, promotion })
    },
    [send]
  )

  const leaveGame = useCallback(() => {
    clearSession()
    setGameId(null)
    setPlayerColor(null)
    setBoardState(null)
    setMoveHistory([])
    setLastMove(null)
    setIsCpuGame(false)
    setPhase('landing')
  }, [])

  return {
    phase,
    wsConnected,
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
  }
}
