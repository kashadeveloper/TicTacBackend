import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(cors());

app.get("/online", async (req: Request, res: Response) => {
  return res.json({
    message: Math.round(Math.random() * 1000),
  });
});

io.on('connection', (socket) => {
    console.log('socket connected')
})

httpServer.listen(80, () => {
    console.log('started')
});
