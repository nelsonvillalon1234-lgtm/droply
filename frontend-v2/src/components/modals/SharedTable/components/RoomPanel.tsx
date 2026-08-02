import "./../styles/roomPanel.css";
import { useState } from "react";
import socket from "../../../../services/socket";
import deviceId, { deviceName } from "../../../../services/device";

import {
    Copy,
    Link2,
    LogIn,
    Users
} from "lucide-react";

type Props = {

    roomCode: string;

};

export default function RoomPanel({

    roomCode,

}: Props) {
    const [joinCode, setJoinCode] = useState("");

    function handleCopyCode() {

        navigator.clipboard.writeText(roomCode);

    }

    function handleCopyLink() {

        navigator.clipboard.writeText(

            `${window.location.origin}/join/${roomCode}`

        );

    }

    return (

        <div className="room-panel">

            <div className="room-header">

                <Users size={20} />

                <span>Sala privada</span>

            </div>

            <div className="room-code">

                {roomCode || "------"}

            </div>

            <button
    className="room-button"
    onClick={handleCopyCode}
>

    <Copy size={18} />

    Copiar código

</button>

            <button
    className="room-button secondary"
    onClick={handleCopyLink}
>

    <Link2 size={18} />

    Copiar enlace

</button>

            <div className="room-divider" />

            <label className="room-label">

                Unirse a una sala

            </label>

            <input
    className="room-input"
    placeholder="Código de sala"
    value={joinCode}
    onChange={(e) => {
        setJoinCode(
            e.target.value.toUpperCase()
        );
    }}
/>

            <button

    className="room-button connect"

    onClick={() => {

        if (!joinCode.trim()) return;

        console.log("🔗 Uniéndose a:", joinCode);

        socket.emit(

            "join-room",

            { code: joinCode.trim(), device: { id: deviceId, name: deviceName, type: "pc" } }

        );

    }}

>

    <LogIn size={18} />

    Conectar

</button>

        </div>

    );

}
