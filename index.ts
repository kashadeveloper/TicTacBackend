import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import gameInfoProps from "./types/gameInfo.type";
import { instrument } from "@socket.io/admin-ui";

const app = express();

var gamesList: Array<gameInfoProps> = [];

const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: false,
  cors: {
    origin: "*",
  },
});

instrument(io, {
  auth: false,
  namespaceName: "/admin",
});

app.use(cors());

app.get("/online", async (_: Request, res: Response) => {
  const sockets = await io.fetchSockets();
  return res.json({
    status: "ok",
    message: sockets.length,
  });
});

app.get("/", async (req: Request, res: Response, next: any) => {
  try {
    throw new Error("Server currently not available");
  } catch (e) {
    next(e);
  }
});

app.get("/game/:gameId", async (req, res, next) => {
  try {
    let game = gamesList.find((x) => x.gameId === req.params.gameId);
    if (!game) throw new Error("Game not found");

    return res.json(game);
  } catch (error) {
    next(error);
  }
});

io.on("connection", (socket) => {
  const { username } = socket.handshake.query;
  if (!username) return socket.disconnect(true);
  socket.data.username = username;
  socket.on("change username", (username) => {
    if (username.length <= 0 || username.length > 20)
      return username.emit("fail");

    socket.data.username = username;
  });
  socket.on("change room", (room) => {
    socket.join(room);
    if (room == "main") socket.leave("waiting");
    socket.emit("change room", ["ping", "ok"]);
  });
  socket.on("board", (item) => {
    let game = gamesList.find((x) => x.players.includes(socket.data.username));
    if (!game) return;
    if (game.playsNow !== socket.data.username) return;

    const index = item.split("-");
    if (game.board[index[0]][index[1]].length >= 1) return;
    game.board[Number(index[0])][Number(index[1])] = `${
      game.designation[socket.data.username]
    }`;
    game.playsNow = game.players[game.nextIndex];
    game.nextIndex = game.nextIndex <= 0 ? 1 : 0;
    io.in(game.gameId).emit("board", game.board);
    io.in(game.gameId).emit("playerNow", game.playsNow);
  });
  socket.on("ping", () => {
    socket.emit("ping", "pong");
  });
  socket.on("leaveGame", (room) => {
    socket.rooms.forEach((value, key) => {
      if (value.startsWith("game:")) {
        io.in(value).emit("change room", ["error", "main"]);
        removeGame(value);
        io.in(value).socketsLeave(value);
      }
    });
  });
  socket.on("disconnecting", (s) => {
    socket.rooms.forEach((value, key) => {
      if (value.startsWith("game:")) {
        io.in(value).emit("change room", ["error", "main"]);
        //io.in(value).socketsJoin("waiting");
        removeGame(value);
        io.in(value).socketsLeave(value);
      }
    });
  });
});

async function notFoundHandler(req: Request, res: Response) {
  if (req.accepts("application/json")) {
    return res.status(404).json({
      status: "fail",
      error: {
        error_message: "Page not found",
        error_code: 404,
      },
    });
  }
  if (req.accepts("application/xml")) {
    res.setHeader("Content-Type", "application/xml");
    return res.status(404).send(`<?xml version="1.0" encoding="UTF-8" ?>
      <root>
      <status>fail</status>
      <message>This page not found</message>
    </root>`);
  }
  return res.send("<h1>Not found</h1>");
}

function ErrorHandler(err: Error, req: Request, res: Response, next: any) {
  return res.json({
    status: "fail",
    error: {
      error_message: err.message,
      error_code: 500,
    },
  });
}

app.use(ErrorHandler);

//app.use("*", notFoundHandler);

async function randomUsers() {
  const clients = await io.in("waiting").fetchSockets();
  //console.log(clients.length)
  if (clients.length <= 1) return;

  for (let i = 0; i < clients.length - 1; i++) {
    const gameName = `game:${clients[i].id}-${clients[i + 1].id}`;
    clients[i].leave("waiting");
    clients[i + 1].leave("waiting");
    clients[i].join(gameName);

    clients[i].emit("change room", ["ok", gameName]);
    clients[i + 1].join(gameName);
    clients[i + 1].emit("change room", ["ok", gameName]);
    const designation = designationRand();
    gamesList.push({
      players: [clients[i].data.username, clients[i + 1].data.username],
      board: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      playsNow: clients[i].data.username,
      gameId: gameName,
      designation: {
        [clients[i].data.username]: designation[0],
        [clients[i + 1].data.username]: designation[1],
      },
      nextIndex: 1,
    });
    // io.in(gameName).timeout(2000).emit("playerNow", clients[i].data.username);
    // io.in(gameName).emit("board", [
    //   ["", "", ""],
    //   ["", "", ""],
    //   ["", "", ""],
    // ]);
  }
}

setInterval(() => randomUsers(), 1000);

function removeGame(gameId: string) {
  gamesList.forEach((value, index) => {
    if (value.gameId === gameId) {
      gamesList.splice(index, 1);
    }
  });
  return gamesList;
}

function checkWin(gameId: string) {
  let game = gamesList.find(x => x.gameId === gameId);
  if(!game) return false;

  const properties = Object.getOwnPropertyNames(game.designation)

  if(game.board[0][0] === game.board[0][1] && game.board[0][1] === game.board[0][2]) return game.designation[properties[0][0]]
}

function designationRand() {
  const random = Math.floor(Math.random() * 2);
  console.log(random)
  if (random == 1) return ["X", "O"];
  if (random == 2) return ["O", "X"];

  return ["X", "O"];
}

httpServer.listen(80, () => {
  console.log("started");
});
