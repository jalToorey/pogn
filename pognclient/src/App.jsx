import React, { useState, useEffect, useMemo, useCallback } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
import useWebSocket from "./components/hooks/webSocket";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [players, setPlayers] = useState([]);

  // Memoized WebSocket handlers
  const handleWebSocketMessage = useCallback((data) => {
    if (!data.unique) {
      data.unique = `${data.type}-${Date.now()}-${Math.random()}`;
    }

    console.log(`Main switch: ${data.type}`, data);

    switch (data.type) {
      case "lobby":
        console.log("Setting lobby message:", data);
        setLobbyMessage(data);
        break;

      case "game":
        setGameMessage(data);
        break;

      case "chat":
        setMessages((prevMessages) => [...prevMessages, data.payload]);
        break;

      default:
        console.warn(`Unhandled message type: ${data.type}`);
    }
  }, []);

  const handleWebSocketOpen = useCallback(
    (socket) => {
      if (playerId) {
        const loginMessage = {
          type: "lobby",
          action: "login",
          payload: { playerId },
        };
        console.log("Sending login message:", loginMessage);
        socket.send(JSON.stringify(loginMessage));
      } else {
        console.warn("playerId is not set. Unable to send login message.");
      }
    },
    [playerId]
  );

  // Only open the WebSocket after playerId is set
  const { ws, sendMessage } = useWebSocket(
    playerId ? "ws://localhost:8080" : null, // Open WebSocket only when playerId is set
    {
      onOpen: handleWebSocketOpen,
      onMessage: handleWebSocketMessage,
    }
  );

  const memoizedLobbyMessage = useMemo(() => lobbyMessage, [lobbyMessage]);
  const memoizedGameMessage = useMemo(() => gameMessage, [gameMessage]);

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <h1>Game App</h1>
        {/* Generate playerId in Player component */}
        <Player setPlayerId={setPlayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        {/* Uncomment other components as needed */}

        {/* {memoizedLobbyMessage && (
          <div>
            <h3>Debugging memoizedLobbyMessage</h3>
            <pre>{JSON.stringify(memoizedLobbyMessage, null, 2)}</pre>
            <h4>Players:</h4>
            <pre>{JSON.stringify(players, null, 2)}</pre>
            <h4>Player ID:</h4>
            <pre>{playerId}</pre>
          </div>
        )} */}

        {memoizedLobbyMessage && (
          <Lobby
            players={players}
            message={memoizedLobbyMessage}
            sendMessage={sendMessage}
            playerId={playerId}
            onUpdatePlayers={setPlayers}
          />
        )}

        <GameConsole
          players={players || []}
          message={memoizedGameMessage || { payload: {} }}
          sendMessage={sendMessage}
          playerId={playerId || ""}
        />

        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
