import { useEffect, useRef, useState } from "react";

import "./styles/transferModal.css";

import socket, { ensureDeviceRegistered } from "../../../services/socket";
import PeerManager from "../../../core/PeerManager";
import deviceId, { deviceName } from "../../../services/device";

import FileCard from "./components/FileCard";
import QRSection from "./components/QRSection";
import ConnectionStatus from "./components/ConnectionStatus";
import Footer from "./components/Footer";


type Props = {
    isOpen: boolean;
    mode: "sender" | "receiver";
    room: string;
    files: File[];
    onClose: () => void;
};

type TransferDevice = { id: string; name: string; type: "pc" | "phone" | "tablet" | "laptop" };

function currentDevice(): TransferDevice {
    const agent = navigator.userAgent;
    const type = /iPad|Tablet/i.test(agent) ? "tablet" : /Android|iPhone|Mobile/i.test(agent) ? "phone" : "pc";
    return { id: deviceId, name: deviceName || (type === "phone" ? "Teléfono" : "Mi PC"), type };
}

export default function TransferModal({
    isOpen,
    mode,
    room,
    files,
    onClose,
}: Props) {

    const [roomCode, setRoomCode] = useState("");
    const [connected, setConnected] = useState(false);
    const [downloadUrl,setDownloadUrl]=useState("");
    const [downloadName,setDownloadName]=useState("");
    const [roomInput, setRoomInput] = useState("");
    const [progress, setProgress] = useState(0);
    const [receiveProgress, setReceiveProgress] = useState(0);
    const [integrityError, setIntegrityError] = useState("");
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [devices, setDevices] = useState<TransferDevice[]>([]);
    const [joinError, setJoinError] = useState("");
    const [receivedFiles, setReceivedFiles] = useState<Array<{ url: string; name: string }>>([]);
    const [queuedFiles, setQueuedFiles] = useState<File[]>(files);

    const roomRef = useRef("");
    const sendingRef = useRef(false);
    const queuedFilesRef = useRef<File[]>(files);
    const sentCountRef = useRef(0);
    const addFilesInputRef = useRef<HTMLInputElement>(null);

    async function sendSelectedFiles() {
        if (mode !== "sender" || queuedFilesRef.current.length === 0 || sendingRef.current || !PeerManager.isReady()) return;
        sendingRef.current = true;
        try {
            while (sentCountRef.current < queuedFilesRef.current.length) {
                const index = sentCountRef.current;
                const currentFiles = queuedFilesRef.current;
                setProgress(Math.round((index / currentFiles.length) * 100));
                await PeerManager.sendFile(currentFiles[index]);
                sentCountRef.current += 1;
            }
            setProgress(100);
        } finally {
            sendingRef.current = false;
            if (sentCountRef.current < queuedFilesRef.current.length && PeerManager.isReady()) {
                queueMicrotask(() => void sendSelectedFiles());
            }
        }
    }

    useEffect(() => {

        if (!isOpen) return;

        PeerManager.reset();
        setConnected(false);
        setIntegrityError("");
        setJoinError("");
        setDevices([]);
        setReceivedFiles([]);
        sendingRef.current = false;
        queuedFilesRef.current = files;
        setQueuedFiles(files);
        sentCountRef.current = 0;

         //HACE QUE EL ARVHIVO SE ENVIE DE MANERA AUTOMATICA
        PeerManager.setOnReady(async () => {

    if (mode !== "sender") return;

    if (queuedFilesRef.current.length === 0) return;

    console.log("🚀 DataChannel listo");

    await sendSelectedFiles();

});

PeerManager.setOnProgress((value) => {
    setProgress(value);
});
PeerManager.setOnReceiveProgress((value) => {
    setReceiveProgress(value);
});
        
        setRoomCode("");

        roomRef.current = "";

        //----------------------------------
        // ROOM CREATED (HOST)
        //----------------------------------

        const handleRoomCreated = (code: string) => {

            if (roomRef.current) return;

            console.log("✅ Sala creada:", code);

            roomRef.current = code;

            setRoomCode(code);

            PeerManager.initialize(code);

        };

        //----------------------------------
        // RECEIVER CONNECTED
        //----------------------------------

        const handleReceiverConnected = async () => {

            console.log("📱 Receptor conectado");

            setConnected(true);

            PeerManager.createChannel();

            const offer =
                await PeerManager.createOffer();

            if (!offer) return;

            socket.emit("offer", {
                room: roomRef.current,
                offer,
            });

        };

        const handleDevices = (members: TransferDevice[]) => setDevices(members);
        const handleExpiresAt = (value: number) => setExpiresAt(value);
        const handleJoinError = () => setJoinError("El código venció o ya no existe.");
        const handleCodeUsed = () => setJoinError("Este código ya fue utilizado por otro dispositivo.");

        //----------------------------------
        // ANSWER
        //----------------------------------

        const handleAnswer = async (
            answer: RTCSessionDescriptionInit
        ) => {

            console.log("📥 Answer");

            await PeerManager.setRemoteDescription(
                answer
            );

        };

        //----------------------------------
        // OFFER
        //----------------------------------

        const handleOffer = async (
            offer: RTCSessionDescriptionInit
        ) => {

            console.log("📨 Offer");

            const applied = await PeerManager.setRemoteDescription(
                offer
            );

            if (!applied) return;

            const answer =
                await PeerManager.createAnswer();

            socket.emit("answer", {
                room: roomRef.current,
                answer,
            });

        };

        //----------------------------------
        // ICE
        //----------------------------------

        const handleIceCandidate = async (
            candidate: RTCIceCandidateInit
        ) => {

            await PeerManager.addIceCandidate(
                candidate
            );

        };

        //----------------------------------
        // LISTENERS
        //----------------------------------

        socket.on(
            "room-created",
            handleRoomCreated
        );

        socket.on(
            "receiver-connected",
            handleReceiverConnected
        );

        socket.on(
            "answer",
            handleAnswer
        );

        socket.on(
            "ice-candidate",
            handleIceCandidate
        );
        socket.on("room-devices", handleDevices);
        socket.on("room-expires-at", handleExpiresAt);
        socket.on("join-error", handleJoinError);
        socket.on("transfer-code-used", handleCodeUsed);

        //----------------------------------
        // MODO EMISOR
        //----------------------------------

        let cancelled = false;

        const enterTransferRoom = async () => {
            try {
                await ensureDeviceRegistered();
                if (cancelled) return;

                if (mode === "sender") {
                    socket.emit("create-room", { purpose: "transfer", device: currentDevice() });
                    return;
                }

                if (mode === "receiver" && room) {
                    roomRef.current = room;
                    setRoomCode(room);
                    PeerManager.initialize(room);
                    socket.emit("join-room", { code: room, device: currentDevice() });
                }
            } catch {
                if (!cancelled) setJoinError("No se pudo conectar con Droply. Inténtalo nuevamente.");
            }
        };

        void enterTransferRoom();

        //----------------------------------
        // MODO RECEPTOR
        //----------------------------------

        if (mode === "receiver") {

            console.log("📱 Entrando como receptor");

            socket.on(
                "offer",
                handleOffer
            );

            socket.on(
                "joined-room",
                () => {

                    console.log(
                        "✅ Unido a la sala"
                    );

                    setConnected(true);

                }
            );

        }

        //----------------------------------
        // CLEANUP
        //----------------------------------

        return () => {

            cancelled = true;
            PeerManager.reset();

            socket.off(
                "room-created",
                handleRoomCreated
            );

            socket.off(
                "receiver-connected",
                handleReceiverConnected
            );

            socket.off(
                "answer",
                handleAnswer
            );

            socket.off(
                "offer",
                handleOffer
            );

            socket.off(
                "ice-candidate",
                handleIceCandidate
            );

            socket.off("joined-room");
            socket.off("room-devices", handleDevices);
            socket.off("room-expires-at", handleExpiresAt);
            socket.off("join-error", handleJoinError);
            socket.off("transfer-code-used", handleCodeUsed);

        };

    }, [isOpen, mode, room]);

    useEffect(() => {

    const handleFileReady = (event: Event) => {

        const customEvent = event as CustomEvent;

        console.log("📦 Archivo listo para descargar");

        setDownloadUrl(customEvent.detail.url);

        setDownloadName(customEvent.detail.name);
        setReceivedFiles((current) => [...current, customEvent.detail]);

        setIntegrityError("");

    };

    const handleIntegrityError = (event: Event) => {
        const customEvent = event as CustomEvent<{ name?: string }>;
        setDownloadUrl("");
        setReceiveProgress(0);
        setIntegrityError(`No se guardó ${customEvent.detail?.name || "el archivo"}: la verificación no coincidió.`);
    };

    window.addEventListener(
        "file-ready",
        handleFileReady
    );
    window.addEventListener("file-integrity-error", handleIntegrityError);

    return () => {

        window.removeEventListener(
            "file-ready",
            handleFileReady
        );
        window.removeEventListener("file-integrity-error", handleIntegrityError);

    };

}, []);

    async function handleSendFile() {

        if (files.length === 0) return;

        if (!PeerManager.isReady()) {

            console.log(
                "⏳ Esperando DataChannel..."
            );

            return;

        }

        console.log("🚀 Enviando archivo...");

        await sendSelectedFiles();

    }

    if (!isOpen) return null;

    return (

        <div className="transfer-overlay">

            <div className="transfer-modal">

                <button
                    className="transfer-close"
                    onClick={onClose}
                >
                    ✕
                </button>

                <h2>

                    {
                        mode === "sender"

                            ? "Enviar archivo"

                            : "Recibir archivo"

                    }

                </h2>

                <div className="transfer-body">

                    {

                        mode === "sender" && (

                            <>

                                <FileCard
                                    file={queuedFiles[0]}
                                />
                                {queuedFiles.length > 1 && <div className="transfer-file-list">
                                    <strong>{queuedFiles.length} archivos preparados</strong>
                                    <span>{queuedFiles.slice(1, 4).map(item => item.name).join(" Â· ")}{queuedFiles.length > 4 ? ` Â· +${queuedFiles.length - 4}` : ""}</span>
                                </div>}
                                <input id="transfer-add-files-input" ref={addFilesInputRef} className="transfer-add-input" type="file" multiple onChange={(event) => {
                                    const incoming = Array.from(event.target.files ?? []);
                                    if (incoming.length === 0) return;
                                    const known = new Set(queuedFilesRef.current.map(item => `${item.name}:${item.size}:${item.lastModified}`));
                                    const next = [...queuedFilesRef.current, ...incoming.filter(item => !known.has(`${item.name}:${item.size}:${item.lastModified}`))];
                                    queuedFilesRef.current = next;
                                    setQueuedFiles(next);
                                    event.currentTarget.value = "";
                                    if (PeerManager.isReady()) void sendSelectedFiles();
                                }} />
                                <label className="transfer-add-files" htmlFor="transfer-add-files-input">
                                    <span>+</span><div><strong>Agregar archivos</strong><small>Puedes elegir varios a la vez</small></div>
                                </label>

                                <QRSection
                                    roomCode={roomCode}
                                    expiresAt={expiresAt}
                                    connected={connected}
                                />

                            </>

                        )

                    }



                {
    mode === "receiver" && (

        <div className="receiver-section">

            {

                !room && !connected && (

                    <>

                        <h3>

                            Recibir archivo

                        </h3>

                        <p>

                            Introduce el código compartido

                        </p>

                        <input

                            className="receiver-input"

                            value={roomInput}

                            onChange={(e) =>

                                setRoomInput(

                                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")

                                )

                            }

                            placeholder="ABC123"

                            maxLength={6}

                        />

                       <button
    className="primary-btn"
    disabled={roomInput.length !== 6}
    onClick={async () => {

        if (!roomInput.trim()) return;

        roomRef.current = roomInput.toUpperCase();

        setRoomCode(roomRef.current);

        console.log("🔗 Uniéndose a:", roomRef.current);

        setJoinError("");
        try {
            await ensureDeviceRegistered();
            PeerManager.initialize(roomRef.current);
            socket.emit("join-room", { code: roomRef.current, device: currentDevice() });
        } catch {
            setJoinError("No se pudo conectar con Droply. Inténtalo nuevamente.");
        }

    }}
>

    Conectar

</button>

                        {joinError && <p className="receiver-error" role="alert">{joinError}</p>}

                    </>

                )

            }

            {

                room && (

                    <>

                        <h3>

                            {

                                downloadUrl

                                    ? "✅ Archivo recibido"

                                    : "Conectando..."

                            }

                        </h3>

                        <p>

                            Sala: {roomCode}

                        </p>

                    </>

                )

            }

            {
    downloadUrl && receivedFiles.length === 1 && (

        <button
            className="download-button"
            onClick={() => {

                const link = document.createElement("a");

                link.href = downloadUrl;

                link.download = downloadName;

                link.click();

            }}
        >

            ⬇ Descargar archivo

        </button>

    )
}
            {receivedFiles.length > 1 && <div className="received-file-list">
                {receivedFiles.map((received, index) => <button
                    key={`${received.name}-${index}`}
                    className="download-button"
                    onClick={() => {
                        const link = document.createElement("a");
                        link.href = received.url;
                        link.download = received.name;
                        link.click();
                    }}
                >Descargar {received.name}</button>)}
            </div>}

        </div>

    )
}

                    <ConnectionStatus
                        connected={connected}
                        peerName={devices.find(device => device.id !== deviceId)?.name}
                    />

                    {integrityError && <div className="integrity-error" role="alert">{integrityError}</div>}

                                    {
    mode === "receiver" &&
    receiveProgress > 0 &&
    receiveProgress < 100 && (

        <div className="transfer-progress">

            <div className="progress-header">

                <span>Descargando...</span>

                <span>{receiveProgress}%</span>

            </div>

            <div className="progress-track">

                <div
                    className="progress-fill"
                    style={{
                        width: `${receiveProgress}%`
                    }}
                />

            </div>

        </div>

    )
}

                    {

                        mode === "sender" && (

                            <Footer
    connected={connected}
    progress={progress}
    onSend={handleSendFile}
/>

                        )

                    }

                </div>

            </div>

        </div>

    );

}
