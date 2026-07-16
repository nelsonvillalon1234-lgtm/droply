import { io } from "socket.io-client";

console.log(
    "BACKEND:",
    import.meta.env.VITE_BACKEND_URL
);

const socket = io(

    import.meta.env.VITE_BACKEND_URL,

    {
        reconnection: true,
        transports: ["websocket", "polling"]
    }

);

export default socket;