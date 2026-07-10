import { io } from "socket.io-client";

const socket = io(
    "https://aaron-bucks-pittsburgh-relocation.trycloudflare.com",
    {
        reconnection: true,
        transports: ["polling", "websocket"]
    }
);

socket.on("connect", () => {

    console.log("🟢 Socket conectado:", socket.id);

});

socket.on("connect_error", (err) => {

    console.error("❌ Error:", err);

});

export default socket;