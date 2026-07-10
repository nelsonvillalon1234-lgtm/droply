import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import setupSocket from "./SocketServer";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
    res.send("🚀 Droply Backend funcionando");
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

setupSocket(io);

const PORT = 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Backend iniciado en puerto ${PORT}`);
});