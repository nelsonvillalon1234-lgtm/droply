import { io } from "socket.io-client";
import deviceId from "./device";

const socket = io(
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3000"
);

socket.on("connect", () => {

    console.log("🖥️ Device:", deviceId);

    socket.emit("register-device", deviceId);

});

export default socket;