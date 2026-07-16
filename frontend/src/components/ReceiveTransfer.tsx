import { useEffect, useRef, useState } from "react";

import socket from "../services/socket";
import PeerManager from "../core/PeerManager";

type ReceiveTransferProps = {

    initialCode?: string;

    showInput?: boolean;

};

function ReceiveTransfer({

    initialCode = "",

    showInput = true

}: ReceiveTransferProps) {

    const [roomCode, setRoomCode] = useState(

        initialCode.toUpperCase()

    );

    const [downloadProgress, setDownloadProgress] = useState(0);

    const [connected, setConnected] = useState(false);

    const [downloadUrl, setDownloadUrl] = useState("");

    const [downloadName, setDownloadName] = useState("");

    const roomRef = useRef(

        initialCode.toUpperCase()

    );

    useEffect(() => {

        PeerManager.setOnReceiveProgress(

            setDownloadProgress

        );
        const handleFileReady = (event: Event) => {

    const customEvent = event as CustomEvent;

    setDownloadUrl(

        customEvent.detail.url

    );

    setDownloadName(

        customEvent.detail.name

    );

};

window.addEventListener(

    "file-ready",

    handleFileReady

);

        socket.on(

            "joined-room",

            () => {

                setConnected(true);

            }

        );

        socket.on(

            "offer",

            async (offer) => {

                PeerManager.initialize(

                    roomRef.current

                );

                await PeerManager.setRemoteDescription(

                    offer

                );

                const answer =

                    await PeerManager.createAnswer();

                socket.emit(

                    "answer",

                    {

                        room: roomRef.current,

                        answer

                    }

                );

            }

        );

        socket.on(

            "ice-candidate",

            async (candidate) => {

                await PeerManager.addIceCandidate(

                    candidate

                );

            }

        );

       if (initialCode) {

    roomRef.current = initialCode.toUpperCase();

    PeerManager.initialize(

        roomRef.current

    );

    socket.emit(

        "join-room",

        roomRef.current

    );

}

        return () => {

    socket.off("joined-room");

    socket.off("offer");

    socket.off("ice-candidate");

    window.removeEventListener(

        "file-ready",

        handleFileReady

    );

};

    }, []);

    function connect() {

        if (!roomRef.current)

            return;

        PeerManager.initialize(

            roomRef.current

        );

        socket.emit(

            "join-room",

            roomRef.current

        );

    }

   return (

    <div className="receive-transfer">

        {

            showInput && (

                <>

       <input

    className="receive-input"

    value={roomCode}

    onChange={(e) => {

        const value = e.target.value.toUpperCase();

        roomRef.current = value;

        setRoomCode(value);

    }}

    placeholder="ABC123"

    maxLength={6}

/>

<button

    className="primary-btn"

    onClick={connect}

    disabled={connected}

>

    {

        connected

            ? "Conectado ✅"

            : "Conectar"

    }

</button>

                </>

            )

        }

        {

            downloadProgress > 0 && (

                <div className="download-box">

                    <progress

                        value={downloadProgress}

                        max="100"

                    />

                    <p>

                        📥 Descargando: {downloadProgress}%

                    </p>

                </div>

            )

        }
        {

    downloadUrl && (

        <div className="download-card">

            <h3>

                📦 {downloadName}

            </h3>

            <a

                href={downloadUrl}

                download={downloadName}

                className="primary-btn"

            >

                Descargar

            </a>

        </div>

    )

}

    </div>

);

}

export default ReceiveTransfer;