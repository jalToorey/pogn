import React, { useState, useEffect, useRef } from "react";
import "./css/lobby.css";

const Lobby = ({
  message,
  sendMessage,
  playerId,
  onUpdatePlayers,
  players, // Default value for players
}) => {
  //const [processedMessages, setProcessedMessages] = useState([]);
  const processedMessagesRef = useRef(new Set());

  // Process messages and track unique ones
  useEffect(() => {
    console.log("lobby");
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return; // Exit early if message is invalid
    }

    if (!message.unique || processedMessagesRef.current.has(message.unique)) {
      console.log("Skipping processed message:", message);
      return;
    }

    console.log("Processing Lobby message:", message);
    const { action, payload } = message;

    // Add message to processedMessages
    processedMessagesRef.current.add(message.unique);

    switch (action) {
      case "updatePlayers":
        console.log("Updating player list:", payload.players);

        // Map the payload to the required player format
        if (!payload.players) return;
        const updatedPlayers = (payload.players || []).map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName || "Unknown", // Fallback to "Unknown"
        }));

        // Notify the parent to update the global state
        if (onUpdatePlayers) {
          onUpdatePlayers(updatedPlayers);
        }
        break;

      case "joinLobbyStandby":
        console.log("Standby for verification:", payload.playerId);
        break;

      case "verifyPlayer":
        console.log("Verification request received.");
        const verifyMessage = {
          type: "lobby",
          action: "verifyResponse",
          payload: { playerId: playerId },
        };
        console.log("Sending verifyResponse:", verifyMessage);
        sendMessage(verifyMessage);
        break;

      case "playerVerified":
        console.log(`${payload.playerId} has verified.`);
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message, playerId, onUpdatePlayers]);

  return (
    <div className="lobby">
      <h2>Lobby</h2>
      <p>Players in Lobby: {players.length}</p>
      <ul>
        {players.length > 0 ? (
          players.map((player, index) => (
            <li key={index}>
              <strong>Player {index + 1}:</strong> {player.playerId}
            </li>
          ))
        ) : (
          <li>No players connected yet</li>
        )}
      </ul>
    </div>
  );
};

export default Lobby;
