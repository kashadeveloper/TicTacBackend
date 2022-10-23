import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: false,
  cors: {
    origin: "*"
  }
});

app.use(cors());

app.get("/online", async (req: Request, res: Response) => {
  const sockets = await io.fetchSockets();
  return res.json({
    status: "ok",
    message: sockets.length,
  });
});

app.get('/', async (req: Request, res: Response, next: any) => {
  try {
    throw new Error('Server currently not available')
  } catch (e) {
    next(e)
  }
})



io.on('connection', (socket) => {
  const { username } = socket.handshake.query
  if (!username) return socket.disconnect(true);
  socket.data.username = username;
  socket.on('change username', (username) => {
    if (username.length <= 0 || username.length > 20) return username.emit('fail');

    socket.data.username = username
  })
  socket.on('change room', (room) => {
    socket.join(room)
  })
  socket.on('ping', (s) => {
    socket.emit('ping', 'pong')
  })
})

async function notFoundHandler(req: Request, res: Response) {
  if (req.accepts('application/json')) {
    return res.status(404).json({
      status: 'fail',
      error: {
        error_message: 'Page not found',
        error_code: 404
      }
    })
  }
  if (req.accepts('application/xml')) {
    res.setHeader('Content-Type', 'application/xml')
    return res.status(404).send(`<?xml version="1.0" encoding="UTF-8" ?>
      <root>
      <status>fail</status>
      <message>This page not found</message>
    </root>`)
  }
  return res.send('<h1>Not found</h1>')
}

function ErrorHandler(err: Error, req: Request, res: Response, next: any) {
  return res.json({
    status: 'fail',
    error: {
      error_message: err.message,
      error_code: 500
    }
  })
}

app.use(ErrorHandler)

app.use('*', notFoundHandler)

async function randomUsers() {
  const clients = await io.in('waiting').fetchSockets();
  if (clients.length <= 1) return;

  for (let i = 0; i < clients.length - 1; i++) {
    clients[i].leave('waiting');
    clients[i + 1].leave('waiting');
    clients[i].join(`game:${clients[i].id}-${clients[i + 1].id}`);
     clients[i].emit('change room', `game:${clients[i].id}-${clients[i + 1].id}`);
     clients[i + 1].join(`game:${clients[i].id}-${clients[i + 1].id}`);
     clients[i + 1].emit('change room', `game:${clients[i].id}-${clients[i + 1].id}`);
  }
  console.log(io.sockets.adapter.rooms)
}

setInterval(() => randomUsers(), 1000)

httpServer.listen(80, () => {
  console.log('started')
});
