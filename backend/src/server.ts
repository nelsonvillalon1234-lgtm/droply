import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import setupSocket from "./SocketServer.js";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";

if (existsSync(".env")) {
    process.loadEnvFile(".env");
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const rawOrigins = process.env.CLIENT_ORIGINS;
const configuredOrigins = (rawOrigins ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);
const allowOrigin = (origin?: string) => !origin || allowedOrigins.has(origin);

if (isProduction && !rawOrigins) {
    throw new Error("CLIENT_ORIGINS es obligatorio en produccion");
}
if (isProduction && process.env.TURN_URLS && !process.env.TURN_SHARED_SECRET) {
    throw new Error("TURN_SHARED_SECRET es obligatorio para credenciales TURN temporales en produccion");
}

app.disable("x-powered-by");
app.use((_, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
});
app.use(cors({ origin: (origin, callback) => callback(null, allowOrigin(origin)) }));
app.use(express.json({ limit: "64kb" }));

app.get("/", (_, res) => {
    res.send("🚀 Droply Backend funcionando");
});

app.get("/api/ice-config", async (_, res) => {
    const meteredApp = (process.env.METERED_TURN_APP_NAME ?? "").trim();
    const meteredApiKey = (process.env.METERED_TURN_API_KEY ?? "").trim();
    if (/^[a-z0-9-]{1,63}$/i.test(meteredApp) && meteredApiKey) {
        try {
            const endpoint = new URL(`https://${meteredApp}.metered.live/api/v1/turn/credentials`);
            endpoint.searchParams.set("apiKey", meteredApiKey);
            const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000) });
            if (response.ok) {
                const meteredServers = await response.json();
                if (Array.isArray(meteredServers) && meteredServers.length) {
                    res.setHeader("Cache-Control", "private, no-store");
                    return res.json({ iceServers: meteredServers, relayAvailable: true });
                }
            }
        } catch (error) {
            console.warn("No se pudo obtener la configuracion TURN de Metered", error);
        }
    }

    const urls = (process.env.TURN_URLS ?? "").split(",").map((url) => url.trim()).filter(Boolean);
    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];
    if (urls.length && process.env.TURN_SHARED_SECRET) {
        const username = `${Math.floor(Date.now() / 1000) + 3600}:droply`;
        const credential = createHmac("sha1", process.env.TURN_SHARED_SECRET).update(username).digest("base64");
        iceServers.push({ urls, username, credential });
    } else if (!isProduction && urls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ iceServers, relayAvailable: iceServers.length > 1 });
});

const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 1_000_000,
    cors: {
        origin: (origin, callback) => callback(null, allowOrigin(origin)),
        methods: ["GET", "POST"]
    }
});

setupSocket(io);

const PORT = Number(process.env.PORT ?? 3000);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Backend iniciado en puerto ${PORT}`);
});
