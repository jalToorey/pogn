const Lobby = require("./lobby");
const Player = require("./player"); // Import the Player class
const eventBus = require("./eventBus");

class LobbyController {
  constructor(gamesController) {
    this.gamesController = gamesController; // Use the shared instance
    this.lobby = new Lobby("default");
    this.relayManager = null;
    this.lobbyRelay = null;
    this.initializeListeners();

    // setInterval(() => {
    //   this.testEmitter();
    // }, 10000);
  }

  setRelayManager(relayManager) {
    this.relayManager = relayManager; // ✅ Store the RelayManager instance
  }
  setLobbyRelay(lobbyId, lobbyRelay) {
    this.lobbyRelay = lobbyRelay;
    // this.lobbyRelay.set(lobbyId, lobbyRelay);
  }

  processMessage(action, payload) {
    console.log("Processing lobby action:", action, payload);

    switch (action) {
      case "login":
        return this.joinLobby(payload.playerId);

      case "createNewGame":
        return this.createGame(payload);

      case "joinGame":
        return this.joinLobbyPlayerToGame(payload);

      case "startGame":
        return this.startGame(payload);

      case "endGame":
        return this.endGame(payload.gameId);

      default:
        console.warn(`Unhandled lobby action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  startGame(payload) {
    console.log("Lobby starting game:", payload);
    const { gameId, playerId } = payload;
    const game = this.lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found in the lobby.` },
      };
    }

    this.lobby.removeGame(gameId); // Remove from lobby

    try {
      const startGameResult = this.gamesController.startGame(game);
      if (startGameResult?.error) {
        console.error(`Error starting game: ${game.message}`);
        return {
          type: "error",
          action: "startGameFailed",
          payload: { message: game.message },
        };
      }

      console.log(this.gamesController.activeGames);
      let gameDetails = game.getGameDetails();
      console.log("Game started:", gameDetails);
      return {
        type: "lobby",
        action: "startGame",
        payload: {
          game: gameDetails,
        },
        broadcast: true,
      };
    } catch (error) {
      console.error(`Error starting game: ${error}`);
    }
  }

  joinLobby(playerId) {
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    if (this.lobby.players.some((p) => p.playerId === playerId)) {
      console.log(`Player ${playerId} already in the lobby!`);
      return;
    }
    console.log("Adding player", playerId);
    const player = new Player({
      playerId,
      inLobby: true, // Default to true when adding a player to the lobby
    });
    this.lobby.players.push(player);

    console.log(`Player ${playerId} added or updated in the lobby.`);
    console.log("Lobby Players", this.lobby.getLobbyPlayers());
    console.log("Lobby Games", this.lobby.getLobbyGames());

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  joinLobbyPlayerToGame(payload) {
    console.log("Joining player to game:", payload);
    const { gameId, playerId } = payload;
    const game = this.lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found.` },
      };
    }
    let gamePlayers;
    if (
      Array.from(game.players.values()).some((p) => p.playerId === playerId)
    ) {
      console.log(`Player ${playerId} already in the game!`);
      return {
        type: "error",
        payload: { message: `Player ${playerId} already in the game!` },
      };
    }

    if (game.players.length >= game.instance.maxPlayers) {
      console.log(`Game is full. Max players: ${game.instance.maxPlayers}`);
      return {
        type: "error",
        payload: {
          message: `Game is full. Max players: ${game.instance.maxPlayers}`,
        },
      };
    }

    game.players.set(playerId, { playerId }); // Store the playerId as the key and an object as the value
    console.log(
      `${playerId} was added to the game. Current players:`,
      game.players
    );

    if (game.players.size >= game.instance.maxPlayers) {
      game.status = "readyToStart";
      console.log("The game is ready to start.");
    } else if (game.players.size >= game.instance.minPlayers) {
      game.status = "canStart";
      console.log("The game can start.");
    }

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  createGame(payload, createRelay = false) {
    const { gameType, playerId } = payload;
    console.log("Creating game:", gameType, playerId);

    if (!this.gamesController.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return {
        type: "error",
        payload: { message: `Unsupported game type: ${gameType}` },
      };
    }
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Player ID required to create a game" },
      };
    }

    const game = this.gamesController.createGame(gameType, true, playerId);
    console.log("gameRelay", game.relay);
    //connect lobby with id lobby1 to game ws
    console.log("lobbyRelay", this.lobbyRelay);
    console.log("relay ws", game.relay.port);
    this.lobbyRelay.connectToRelay(game.gameId, game.relay.wsAddress);

    //wait 5 seconds and send a test msg
    setTimeout(() => {
      console.log("sending test message");
      this.lobbyRelay.relayConnector.sendMessage({
        type: "hello",
        payload: { message: "Hello from lobby" },
      });
    }, 10000);

    console.log("lobbyRelay", this.lobbyRelay);
    console.log("game", game);
    this.lobby.addGame(game);
    game.logAction(`${playerId} created game.`);
    const games = this.lobby.getLobbyGames();
    let players = this.lobby.getLobbyPlayers();
    console.log("games", games, "players", players);

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: games,
      },
      broadcast: true,
    };
  }

  test(playerId) {
    console.log(`Player ${playerId} is reconnecting or joining a game.`);
    let testGame = this.lobby
      .getLobbyGames()
      .find((game) => game.status === "joining");
    console.log("Lobby Games", this.lobby.getLobbyGames());
    console.log("testGame", testGame);
    if (!testGame) {
      this.lobby.games = [];
      this.lobby.players = [];
      console.log("No available games. Creating a new game.");
      this.createGame(
        {
          gameType: "odds-and-evens",
          playerId,
        }
        //true
      );
      console.log(
        "Created a new game and added to lobby:",
        this.lobby.getLobbyGames()
      );
      console.log("this.lobby.games", this.lobby.games);
      this.lobby.games[0].status = "test";
      testGame = this.lobby.games[0];
      console.log("testGame", testGame);
    } else {
      console.log(`Player ${playerId} is joining an existing game:`, testGame);
    }

    this.joinLobby(playerId);
    console.log("joining player to game", testGame.gameId, playerId);

    this.joinLobbyPlayerToGame({
      gameId: testGame.gameId,
      playerId,
    });
    console.log("joined player to game", testGame.gameId, playerId);
    testGame = this.lobby.getGameDetails(testGame.gameId);
    this.lobby.games[0].status = "joining";

    console.log("testGame", testGame);
    if (Object.keys(testGame.players).length === testGame.instance.maxPlayers) {
      console.log(`Game ${testGame.gameId} is now full. Starting game.`);
      this.lobby.games[0].status = "readyToStart";
    }
    console.log("sending refresh lobby");
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  endGame(gameId) {
    const game = this.gamesController.activeGames.get(gameId);
    if (!game) {
      console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
      return;
    }

    console.log("Ending game:", game);
    game.status = "ended";
    game.gameLog.push("Game ended.");
    console.log("gameRelay", game.relay, "gameRelayStatus", game.relay.status);
    game.relay.broadcastResponse({
      type: "game",
      action: "gameEnded",
      payload: {
        playerId: "lobbyController",
        gameId: gameId,
        status: "ended",
        gameLog: game.gameLog, // Include game history
      },
    });
    this.lobby.removeGame(gameId);
    this.gamesController.activeGames.get(gameId).status = "ended";
    this.gamesController.activeGames.get(gameId).gameLog.push("Game ended.");
    console.log("active games", this.gamesController.activeGames);

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  refreshLobby() {
    const lobbyRelay = this.lobbyRelay.get("lobby");
    console.log("lobbyRelay", lobbyRelay);
    lobbyRelay.broadcastResponse({
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
    });
  }

  initializeListeners() {
    eventBus.on("gameEnded", ({ gameId }) => {
      console.log("gameId", gameId);
      console.log("activeGames", this.gamesController.activeGames);
      const game = this.gamesController.activeGames.get(gameId);
      console.log("game", game);
      const gameDetails = game.getGameDetails();
      console.log("gameDetails", gameDetails);
      const gameRelay = game.relay;
      console.log("gameRelay", gameRelay);
      console.log("gameRelay Methods", Object.keys(game.relay || {}));

      game.relay.broadcastResponse({
        type: "game",
        action: "gameEnded",
        payload: {
          gameId: gameId,
          status: "ended",
          gameLog: game.gameLog, // Include game history
        },
      });
      // gameDetails.forEach((player) => {
      //   //send message to player
      //   lobbyRelay.sendToPlayer(player.playerId, {
      //     type: "game",
      //     action: "gameEnded",
      //     payload: {
      //       gameId: gameId,
      //       status: "ended",
      //       gameLog: game.gameLog, // Include game history
      //     },
      //   });
      // });
      //refresh lobby
      this.refreshLobby();
    });
    eventBus.on("gameMessage", (message) => {
      console.log("Lobby recieved gameMessage:", message);
    });
  }

  testEmitter() {
    console.log("emitting test event");
    eventBus.emit("lobbyMessage", { message: "hi game" });
  }
}

module.exports = LobbyController;
