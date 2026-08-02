import { io } from "socket.io-client";
import deviceId from "./device";

const socket = io(
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3000"
);

let registeredSocketId = "";
let registrationPromise: Promise<void> | null = null;

export function ensureDeviceRegistered(): Promise<void> {
    if (socket.connected && registeredSocketId === socket.id) return Promise.resolve();
    if (registrationPromise) return registrationPromise;

    registrationPromise = new Promise((resolve, reject) => {
        const register = () => {
            socket.timeout(8_000).emit(
                "register-device",
                deviceId,
                (error: Error | null, result?: { ok?: boolean }) => {
                    registrationPromise = null;
                    if (error || !result?.ok) {
                        reject(new Error("No se pudo registrar el dispositivo."));
                        return;
                    }
                    registeredSocketId = socket.id ?? "";
                    resolve();
                }
            );
        };

        if (socket.connected) register();
        else socket.once("connect", register);
    });

    return registrationPromise;
}

socket.on("connect", () => {

    console.log("🖥️ Device:", deviceId);

    registeredSocketId = "";
    registrationPromise = null;
    void ensureDeviceRegistered().catch((error) => console.error(error));

});

socket.on("disconnect", () => {
    registeredSocketId = "";
    registrationPromise = null;
});

export default socket;
