import { Socket } from "socket.io";

import DeviceManager from "../services/DeviceManager.js";
import { isSafeId } from "../security.js";

export default function registerConnectionEvents(
    socket: Socket
) {

    socket.emit("connected", {
        id: socket.id
    });

    socket.on("register-device", (deviceId: string, acknowledge?: (result: { ok: boolean }) => void) => {

        if (!isSafeId(deviceId)) {
            socket.emit("security-error", "Identificador de dispositivo invalido");
            acknowledge?.({ ok: false });
            return;
        }

        DeviceManager.register(deviceId, socket.id);
        acknowledge?.({ ok: true });

        console.log(
            "🖥️ Dispositivo registrado:",
            deviceId,
            "→",
            socket.id
        );

    });

    socket.on("disconnect", () => {

        DeviceManager.unregister(socket.id);

        console.log("🔴 Cliente desconectado:", socket.id);

    });

}
