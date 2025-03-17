import React, { useEffect, useState, useRef } from "react";

const OddsAndEvens = ({
  sendMessage,
  playerId,
  gameState,
  setLobbyMessage,
}) => {
  const [role, setRole] = useState(null); // Player's assigned role
  const [number, setNumber] = useState(""); // Player's chosen number
  const [localGameState, setLocalGameState] = useState({
    //status: "started",
    winner: null,
    sum: null,
    roles: {}, // Store the roles assigned by the server
    numbers: {}, // Track submitted numbers
  });

  const rolesFetched = useRef(false); // Ref to track whether roles have been fetched

  useEffect(() => {
    console.log("gameState", gameState);
    setLocalGameState((prev) => ({
      ...prev,
      ...gameState,
    }));

    // ✅ Only request roles if they haven't been fetched yet
    if (
      !rolesFetched.current &&
      gameState?.gameId &&
      Object.keys(gameState.roles || {}).length === 0
    ) {
      console.log("Roles not assigned yet. Fetching from the relay...");
      sendMessage({
        type: "game",
        action: "gameAction",
        payload: {
          gameAction: "getRoles",
          playerId,
          gameId: gameState.gameId,
        },
      });

      rolesFetched.current = true; // ✅ Prevent multiple fetches
    }
  }, [gameState, sendMessage, playerId]);

  useEffect(() => {
    console.log("gameState", localGameState);
    switch (localGameState?.action) {
      case "rolesAssigned":
        rolesFetched.current = true;
        console.log(`Role assigned`);
        setRole(localGameState.roles[playerId]);
        setLocalGameState((prev) => ({
          ...prev,
          action: "gotRoles",
          state: "in-progress",
        }));

        break;

      case "waitingForOpponent":
        console.log("Waiting for the other player...");
        setLocalGameState((prev) => ({
          ...prev,
          waitingForOpponent: true,
        }));
        break;

      case "gotRoles":
        console.log("Got roles from the relay.");
        break;

      case "results":
        setLocalGameState((prev) => ({
          ...prev,
          state: "complete",
          winner: localGameState.winner,
          sum: localGameState.sum,
          roles: localGameState.roles,
          numbers: localGameState.numbers,
        }));
        console.log("Game results received.");

        break;

      default:
        console.warn(
          `Unhandled action: ${
            localGameState?.action
          } with message: ${JSON.stringify(localGameState)}`
        );
    }
  }, [localGameState.action]);

  const handleSubmitNumber = () => {
    console.log("Submitting number:", number);
    sendMessage({
      type: "game",
      action: "gameAction",
      payload: {
        game: "odds-and-evens",
        gameAction: "submitNumber",
        playerId,
        number: parseInt(number, 10),
        state: localGameState.state,
        gameId: localGameState.gameId,
      },
    });
    setNumber(""); // Clear input after submission
  };

  //send a msg to game to get a role "getRole"
  // Send a message to the game to get roles
  // useEffect(() => {
  //   console.log("gameState", localGameState);
  //   if (localGameState?.action === "getRoles") {
  //     console.log("Getting roles...");
  //     // rolesFetched.current = true;
  //     sendMessage({
  //       type: "game",
  //       action: "gameAction",
  //       payload: {
  //         game: "odds-and-evens",
  //         gameAction: "getRoles",
  //         playerId,
  //         gameId: localGameState.gameId, // Use gameState directly
  //         state: localGameState.status, // Use gameState directly
  //       },
  //     });
  //   } else {
  //     console.warn("Game ID or state is not available yet.");
  //   }
  // }, [localGameState.action]);

  return (
    <div className="mb-5">
      <h2>Odds and Evens</h2>

      {/* Display current local state for debugging */}
      <div className="localState">
        <h3>Local Game State</h3>
        <pre>{JSON.stringify(localGameState, null, 2)}</pre>
      </div>

      {/* Game Waiting State */}
      {localGameState.state === "waiting" && (
        <p>Odds and Evens Waiting to start...</p>
      )}

      {/* Game In Progress */}
      {localGameState.state === "in-progress" && role && (
        <div>
          <p>
            Your Role: <strong>{role.toUpperCase()}</strong>
          </p>
          <p>Enter a number:</p>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            min="1"
            required
          />
          <button onClick={handleSubmitNumber} disabled={!number}>
            Submit Number
          </button>
        </div>
      )}

      {/* Game Complete */}
      {localGameState.state === "complete" && (
        <div>
          <p>
            <strong>Winner:</strong> {localGameState.winner}
          </p>
          <p>
            <strong>Sum of Numbers:</strong> {localGameState.sum}
          </p>
          <h4>Roles:</h4>
          <ul>
            {Object.entries(localGameState.roles).map(
              ([player, assignedRole]) => (
                <li key={player}>
                  Player {player}: <strong>{assignedRole.toUpperCase()}</strong>
                </li>
              )
            )}
          </ul>
          <h4>Numbers:</h4>
          <ul>
            {Object.entries(localGameState.numbers).map(
              ([player, submittedNumber]) => (
                <li key={player}>
                  Player {player}: <strong>{submittedNumber}</strong>
                </li>
              )
            )}
          </ul>
        </div>
      )}
      {/* Kill Game */}
      <button
        onClick={() => {
          setLobbyMessage((prev) => {
            // ✅ Prevent redundant updates (avoids unnecessary re-renders)
            if (prev?.gameId === gameState.gameId) return prev;

            return {
              type: "lobby",
              action: "endGame",
              payload: {
                playerId,
                gameId: gameState.gameId,
              },
            };
          });
        }}
      >
        Kill Game
      </button>
    </div>
  );
};

export default OddsAndEvens;
