import React, { useEffect, useRef, useState } from "react";
import RockPaperScissors from "./RockPaperScissors";
import OddsAndEvens from "./oddsAndEvens";

const GameConsole = ({
  message = {},
  sendMessage,
  playerId = "",
  initialGameState = {},
  setStartGameConsole,
  sendLobbyMessage,
  setStartWebSocket,
}) => {
  const [gameState, setGameState] = useState({
    ...initialGameState,
  });
  //lobby message var
  const [lobbyMessage, setLobbyMessage] = useState({});
  const [gameStarted, setGameStarted] = useState(false);

  //send the lobby message to the relay when lobbyMessage is set
  useEffect(() => {
    console.log("Lobby message:", lobbyMessage);
    if (lobbyMessage && Object.keys(lobbyMessage).length > 0) {
      console.log("Sending lobby message:", lobbyMessage);
      sendLobbyMessage(lobbyMessage);

      // ✅ Delay clearing the message slightly to avoid interfering with sendLobbyMessage
      setTimeout(() => {
        console.log("Clearing lobby message...");
        setLobbyMessage(null); // Use `null` instead of `{}`
      }, 100);
    }
  }, [lobbyMessage, sendLobbyMessage]);

  useEffect(() => {
    console.log("Checking game state for start condition...");
    console.log("gamestate", gameState);
    setGameStarted(gameState.status === "started");
  }, [gameState]);

  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      console.log("No message received.");
      return;
    }
    // if (
    //   !message ||
    //   Object.keys(message).length === 0 ||
    //   !message.action ||
    //   !message.payload
    // ) {
    //   console.warn("⚠️ Skipping empty or invalid message:", message);
    //   return;
    // }

    console.log("Processing Game message:", message);
    const { action, payload } = message;
    console.log("action", action);
    console.log("payload", payload);
    // if (!message || processedMessagesRef.current.has(message.unique)) {
    //   console.warn(
    //     "⚠️ Skipping message because it was already processed:",
    //     message
    //   );
    //   return;
    // }

    // processedMessagesRef.current.add(message.unique);
    console.log("Switching on action:", action);
    switch (action) {
      case "gameAction":
        console.log("Game action received:", payload);
        setGameState((prevState) => {
          const newState = { ...prevState, ...payload };
          console.log("🛠️ Updated GameState:", newState);
          setGameStarted(newState.status === "started"); // ✅ Set it inside
          return newState;
        });

        break;
      case "results":
        console.log("Game finished. Winner determined.");
        setGameState((prevState) => ({
          ...prevState,
          status: "complete",
          winner: payload.winner,
          loser: payload.loser,
          choices: payload.choices,
        }));
        break;
      case "gameEnded":
        console.log("Game ended.");
        setGameState({});
        setGameStarted(false);
        setStartWebSocket(false);
        setStartGameConsole(false);
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message]);

  const renderGameComponent = () => {
    console.log("Rendering game component:", gameState);
    switch (gameState.gameType) {
      case "rock-paper-scissors":
        return (
          <RockPaperScissors
            sendMessage={sendMessage}
            playerId={playerId}
            gameState={gameState}
            setLobbyMessage={setLobbyMessage}
          />
        );
      case "odds-and-evens":
        console.log("Rendering Odds and Evens component...", gameState);
        return (
          <OddsAndEvens
            sendMessage={sendMessage}
            playerId={playerId}
            gameState={gameState}
            setLobbyMessage={setLobbyMessage}
          />
        );
      default:
        return <p>Game type not supported.</p>;
    }
  };

  return (
    <div>
      <h2>Game Console</h2>
      <p>Player ID: {playerId}</p>
      <h3>Game State:</h3>
      <pre> {JSON.stringify(gameState, null, 2)}</pre>
      {console.log("🔍 Re-rendering: gameStarted =", gameStarted)}

      {gameStarted ? (
        <>
          {" "}
          {console.log("✅ Rendering Game Component")}
          {renderGameComponent()}
        </>
      ) : (
        <p>Console waiting for game to start...</p>
      )}
    </div>
  );
};

export default GameConsole;
