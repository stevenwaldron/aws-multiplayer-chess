# Chess frontend

Vite + React + TypeScript + React Three Fiber.

## Setup

```
npm install
cp .env.example .env.local
# edit .env.local: set VITE_WEBSOCKET_URL to the `websocket_url` Terraform
# output from chess-backend/infra
npm run dev
```

## How it talks to the backend

`src/hooks/useChessSocket.ts` owns the WebSocket connection and all game
state. It:

- Connects on mount, and if `localStorage` has a saved `{game_id,
  player_token}` session, sends a `reconnect` action immediately (this is
  what lets a page refresh resume the same game instead of starting over —
  see the backend README's reconnect-token design).
- Exposes `phase` (`landing | connecting | waiting | playing | game_over`)
  that `App.tsx` uses to decide what to render — the lobby, a "waiting for
  opponent" screen, the board, or a game-over overlay.
- Never mutates the board itself. `ChessBoard.tsx` calls `onAttemptMove`
  when you click a destination square, but the piece doesn't actually move
  until a `move_made` message comes back from the server and updates
  `boardState` (a FEN string, parsed by `parseFen` in `chessTypes.ts`) — this
  was a deliberate choice over optimistic local movement, so there's never a
  visible correction if a move is somehow rejected.

## Structure additions since the last delivery

```
src/
├── hooks/useChessSocket.ts   WebSocket connection + all game state
├── components/
│   ├── Lobby.tsx              Create/join screen
│   └── WaitingRoom.tsx        Shown to the creator until someone joins
```

`ChessBoard.tsx` was reworked to be purely a function of the server's FEN
string instead of managing its own board state.
