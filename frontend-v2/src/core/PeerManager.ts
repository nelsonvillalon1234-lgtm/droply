import socket from "../services/socket";
import HistoryManager from "./HistoryManager";

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function advanceTransferHash(previous: Uint8Array, chunk: ArrayBuffer) {
    const input = new Uint8Array(previous.byteLength + chunk.byteLength);
    input.set(previous, 0);
    input.set(new Uint8Array(chunk), previous.byteLength);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", input));
}

class PeerManager {

    private peer: RTCPeerConnection | null = null;
    private channel: RTCDataChannel | null = null;
    private room = "";
    private isOpen = false;
    private isSending = false;
    private isApplyingRemoteDescription = false;
    private signalTargetSocketId = "";
    private signalItemId = "";
    private relayAvailable = false;
    private pendingIceCandidates: RTCIceCandidateInit[] = [];
    private onReceiveProgressCallback?: (progress: number) => void;
    private onProgressCallback?: (progress: number) => void;
    private onSpeedCallback?: (speed: string) => void;

private onTimeCallback?: (time: string) => void;
private onClipboardCallback?: (text: string) => void;
private onReadyCallback?: () => void;
private fileAckResolver?: () => void;

private transferVersion = 0;
private iceConfigurationReady: Promise<void> = Promise.resolve();

    initialize(room: string) {

        if (this.peer && this.room !== room) this.reset();
        this.room = room;

        if (this.peer)
            return;

        this.peer = new RTCPeerConnection({
            iceServers: [{
                urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
            }],
        });
        this.iceConfigurationReady = this.loadIceConfiguration();
console.log(
    "Configuración ICE:",
    this.peer.getConfiguration()
);

this.peer.oniceconnectionstatechange = () => {

    console.log(
        "ICE:",
        this.peer?.iceConnectionState
    );

};

this.peer.onconnectionstatechange = () => {

    console.log(
        "Estado:",
        this.peer?.connectionState
    );

};
        
console.log(
    "🧊 Configuración ICE:",
    this.peer.getConfiguration()
);
        this.peer.onsignalingstatechange = () => {

console.log(
    "📡 Signaling:",
    this.peer?.signalingState
);

};


        this.peer.onconnectionstatechange = () => {

            console.log("🌐", this.peer?.connectionState);

        };

        this.peer.oniceconnectionstatechange = () => {

    console.log(
        "🧊",
        this.peer?.iceConnectionState
    );

    if (
        this.peer?.iceConnectionState === "failed"
    ) {

        console.log(
            "⚠️ Conexión perdida"
        );

    }

};
this.peer.onicegatheringstatechange = () => {

    console.log(
        "🧊 Gathering:",
        this.peer?.iceGatheringState
    );

};

this.peer.onicegatheringstatechange = () => {

    console.log(
        "🧊 Gathering:",
        this.peer?.iceGatheringState
    );

};
        

        this.peer.onicecandidate = ({ candidate }) => {

    if (candidate) {

        console.log(
            "🧊 ICE:",
            candidate.type,
            candidate.candidate
        );

    } else {

        console.log("🧊 FIN ICE");

    }

    if (!candidate)
        return;

    if (this.signalTargetSocketId && this.signalItemId) {
        socket.emit("download-ice-candidate", {
            targetSocketId: this.signalTargetSocketId,
            itemId: this.signalItemId,
            candidate,
        });
    } else {
        socket.emit("ice-candidate", {
            room: this.room,
            candidate
        });
    }

};
this.peer.onconnectionstatechange = async () => {

    console.log(
        "🌐 Estado:",
        this.peer?.connectionState
    );

    if (this.peer?.connectionState === "connected") {

        await this.detectConnectionType();

    }

    if (this.peer?.connectionState === "failed") {
        window.dispatchEvent(new CustomEvent("peer-connection-failed", {
            detail: { relayAvailable: this.relayAvailable },
        }));
    }

};

        this.peer.ondatachannel = ({ channel }) => {

    console.log("📦 DataChannel recibido");

    this.channel = channel;

    this.registerChannel();

};

    }

    private async loadIceConfiguration() {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
            const response = await fetch(`${backendUrl}/api/ice-config`, { cache: "no-store" });
            if (!response.ok) return;
            const configuration = await response.json() as { iceServers?: RTCIceServer[]; relayAvailable?: boolean };
            this.relayAvailable = Boolean(configuration.relayAvailable);
            if (this.peer && Array.isArray(configuration.iceServers) && configuration.iceServers.length) {
                this.peer.setConfiguration({ iceServers: configuration.iceServers });
            }
        } catch (error) {
            console.warn("No se pudo cargar TURN; se usara STUN.", error);
        }
    }

    private registerChannel() {

    if (!this.channel)
            return;

    this.channel.binaryType = "arraybuffer";

        
    this.channel.onopen = () => {

    console.log("🟢 DataChannel abierto");

    this.isOpen = true;

    this.channel?.send("Hola desde " + this.room);

    this.onReadyCallback?.();

};




let received: ArrayBuffer[] = [];
let fileName = "";
let totalSize = 0;

let receivedSize = 0;
let receivedHash = new Uint8Array(32);
let hashQueue: Promise<void> = Promise.resolve();
let lastReceiveProgress = -1;

this.channel.onmessage = ({ data }) => {

    if (typeof data === "string") {

        if (!data.startsWith("{")) {

            console.log("💬", data);

            return;

        }

        const message = JSON.parse(data);

        if (message.type === "file-ack") {
            this.fileAckResolver?.();
            this.fileAckResolver = undefined;
            return;
        }

        if (message.type === "clipboard") {

    console.log(

        "📋 Portapapeles recibido:",

        message.text

    );

    HistoryManager.save({

        id: crypto.randomUUID(),

        type: "clipboard",

        name: message.text,

        date: Date.now()

    });

    this.onClipboardCallback?.(

        message.text

    );

    return;

}

       if (message.type === "start") {

    lastReceiveProgress = -1;

    fileName = message.name;

    received = [];

    totalSize = message.size;

    receivedSize = 0;

    receivedHash = new Uint8Array(32);

    hashQueue = Promise.resolve();

    lastReceiveProgress = -1;

    return;
}

        if (message.type === "end") {

    const completedName = fileName;
    const completedChunks = received;
    const completedSize = receivedSize;
    const completedTotal = totalSize;
    const completedHashQueue = hashQueue;

    void (async () => {

    await completedHashQueue;

    const expectedHash = typeof message.hash === "string" ? message.hash : "";
    const actualHash = bytesToHex(receivedHash);

    if (completedSize !== completedTotal || !expectedHash || actualHash !== expectedHash) {
        console.error("❌ Verificación de integridad fallida");
        received = [];
        window.dispatchEvent(new CustomEvent("file-integrity-error", {
            detail: { name: completedName }
        }));
        this.channel?.send(JSON.stringify({ type: "file-ack" }));
        return;
    }

    console.log("✅ Integridad SHA-256 verificada");

    console.log("✅ Archivo completo");

    const blob = new Blob(
        completedChunks.map(
            buffer => new Uint8Array(buffer)
        )
    );

    console.log("Tamaño:", blob.size);

    const url = URL.createObjectURL(blob);

    HistoryManager.save({

    id: crypto.randomUUID(),

    type: "file",

    name: completedName,

    size: blob.size,

    date: Date.now()

});

    console.log("URL creada:", url);

    window.dispatchEvent(

        new CustomEvent(

            "file-ready",

            {

                detail: {

                    url,

                    name: completedName,

                    blob

                }

            }

        )

    );

    completedChunks.length = 0;
received = [];
receivedSize = 0;
totalSize = 0;
fileName = "";

    this.channel?.send(JSON.stringify({ type: "file-ack" }));

    })();

    return;
}

    }

    

    if (data instanceof ArrayBuffer) {

    received.push(data);

const hashChunk = data;
hashQueue = hashQueue.then(async () => {
    receivedHash = await advanceTransferHash(receivedHash, hashChunk);
});

receivedSize += data.byteLength;

const progress =
    totalSize > 0
        ? Math.floor((receivedSize / totalSize) * 100)
        : 0;

if (progress !== lastReceiveProgress) {
    lastReceiveProgress = progress;

    this.onReceiveProgressCallback?.(progress);

    if (progress % 5 === 0 || progress === 100) {
        console.log(`📥 Descargando: ${progress}%`);
    }
}

    

}

};
        this.channel.onerror = (error) => {

    console.error(
        "❌ Error DataChannel:",
        error
    );

};

this.channel.onclose = () => {

    console.log("🔴 DataChannel cerrado");

    this.isOpen = false;
    this.isSending = false;

    this.channel = null;

};

    }

    createChannel() {

    if (!this.peer)
        return;

    console.log("🟡 Creando DataChannel...");

    this.channel = this.peer.createDataChannel("droply");

    console.log("🟡 DataChannel creado");

    this.registerChannel();

}

    async createOffer() {

    await this.iceConfigurationReady;

    if (!this.peer)
        return null;

    console.log("📨 Creando Offer");

    const offer = await this.peer.createOffer();

    await this.peer.setLocalDescription(offer);

    console.log("✅ Offer listo");

    return offer;

}

    async createAnswer() {

    await this.iceConfigurationReady;

    if (!this.peer)
        return null;

    console.log("📨 Creando Answer");

    const answer = await this.peer.createAnswer();

    await this.peer.setLocalDescription(answer);

    console.log("✅ Answer listo");

    return answer;

}

    async setRemoteDescription(description: RTCSessionDescriptionInit) {

        if (!this.peer)
            return false;

        if (this.isApplyingRemoteDescription) {
            console.log("Descripción WebRTC duplicada ignorada");
            return false;
        }

        if (description.type === "answer" && this.peer.signalingState !== "have-local-offer") {
            console.log("Respuesta WebRTC duplicada ignorada");
            return false;
        }

        if (description.type === "offer" && this.peer.signalingState !== "stable") {
            console.log("Oferta WebRTC duplicada ignorada");
            return false;
        }

    console.log("📥 RemoteDescription");

        this.isApplyingRemoteDescription = true;
        try {
            await this.peer.setRemoteDescription(description);

            const candidates = this.pendingIceCandidates.splice(0);
            for (const candidate of candidates) {
                await this.peer.addIceCandidate(candidate);
            }

            return true;
        } finally {
            this.isApplyingRemoteDescription = false;
        }

}

    async addIceCandidate(candidate: RTCIceCandidateInit) {

        if (!this.peer)
            return;

        if (!this.peer.remoteDescription) {
            this.pendingIceCandidates.push(candidate);
            return;
        }

        await this.peer.addIceCandidate(candidate);

    }

    reset() {
        this.transferVersion += 1;
        this.fileAckResolver?.();
        this.fileAckResolver = undefined;
        this.channel?.close();
        this.peer?.close();
        this.channel = null;
        this.peer = null;
        this.room = "";
        this.isOpen = false;
        this.isSending = false;
        this.isApplyingRemoteDescription = false;
        this.signalTargetSocketId = "";
        this.signalItemId = "";
        this.relayAvailable = false;
        this.pendingIceCandidates = [];
        this.iceConfigurationReady = Promise.resolve();
    }

    setDownloadSignalTarget(targetSocketId: string, itemId: string) {
        this.signalTargetSocketId = targetSocketId;
        this.signalItemId = itemId;
    }

    send(message: string) {

    this.channel?.send(message);

}


setOnProgress(callback: (progress: number) => void) {

    this.onProgressCallback = callback;

}

setOnSpeed(callback: (speed: string) => void) {

    this.onSpeedCallback = callback;

}

setOnTime(callback: (time: string) => void) {

    this.onTimeCallback = callback;

}

cancelTransfer() {

    this.transferVersion++;
    this.isSending = false;

    console.log(
        "❌ Transferencia invalidada"
    );

}

setOnReceiveProgress(callback: (progress: number) => void) {

    this.onReceiveProgressCallback = callback;

}

setOnReady(callback: () => void) {

    this.onReadyCallback = callback;

}
    
async sendFile(file: File) {

    if (this.isSending) {
        console.log("El archivo ya se está enviando");
        return;
    }

    const currentTransfer =
        ++this.transferVersion;

    if (
        !this.channel ||
        this.channel.readyState !== "open"
    ) {

        console.log(
            "❌ DataChannel cerrado"
        );

        return;

    }

    this.isSending = true;

    const CHUNK_SIZE = 64 * 1024;

    console.log("📤 Enviando:", file.name);

    this.channel.send(JSON.stringify({

        type: "start",

        name: file.name,

        size: file.size

    }));


    let offset = 0;
    let transferHash = new Uint8Array(32);
    const startTime = Date.now();

    while (offset < file.size) {

    if (
    currentTransfer !==
    this.transferVersion
) {

    console.log(
        "❌ Transferencia anterior cancelada"
    );

    return;

}

    const slice = file.slice(
        offset,
        offset + CHUNK_SIZE
        
    );

    const buffer = await slice.arrayBuffer();

while (this.channel.bufferedAmount > 1024 * 1024) {
    await new Promise(resolve => setTimeout(resolve, 10));
}
if (
    currentTransfer !==
    this.transferVersion
) {

    console.log(
        "❌ Fragmento descartado"
    );

    return;

}

try {

    this.channel.send(buffer);

} catch (error) {

    console.log("⚠️ Buffer lleno, reintentando...");

    await new Promise(resolve => setTimeout(resolve, 25));

    continue;

}

transferHash = await advanceTransferHash(transferHash, buffer);
offset += buffer.byteLength;
    const progress = Math.min(
    Math.floor((offset / file.size) * 100),
    100
);

this.onProgressCallback?.(progress);

const elapsed = (Date.now() - startTime) / 1000;

const speed = offset / elapsed;

const speedMb = (
    speed / 1024 / 1024
).toFixed(2);

this.onSpeedCallback?.(
    `${speedMb} MB/s`
);

const remainingBytes =
    file.size - offset;

const remainingSeconds =
    Math.ceil(
        remainingBytes / speed
    );

this.onTimeCallback?.(
    `${remainingSeconds}s`
);
}
if (
    currentTransfer !==
    this.transferVersion
) {

    console.log(
        "❌ Finalización descartada"
    );

    return;

}

    this.channel.send(JSON.stringify({

        type: "end",

        hash: bytesToHex(transferHash),

        hashAlgorithm: "SHA-256-chain-v1"

    }));

    await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 15000);
        this.fileAckResolver = () => {
            window.clearTimeout(timeout);
            resolve();
        };
    });

    this.isSending = false;

    console.log("✅ Archivo enviado");

}
setOnClipboard(
    callback: (text: string) => void
) {

    this.onClipboardCallback = callback;

}

sendClipboard(text: string) {

    if (

        !this.channel ||

        this.channel.readyState !== "open"

    ) {

        console.log(

            "❌ Canal cerrado"

        );

        return;

    }

    this.channel.send(

        JSON.stringify({

            type: "clipboard",

            text

        })

    );

    console.log(

        "📋 Portapapeles enviado"

    );

}

private async detectConnectionType() {

    if (!this.peer) return;

    const stats = await this.peer.getStats();

    console.log("════════════════════════════");

    let found = false;

    for (const report of stats.values()) {

        if (report.type !== "candidate-pair") continue;
        if (report.state !== "succeeded") continue;
        if (!report.nominated) continue;

        found = true;

        const local = stats.get(report.localCandidateId) as any;
        const remote = stats.get(report.remoteCandidateId) as any;
        const localType = local?.candidateType ?? "desconocido";
        const remoteType = remote?.candidateType ?? "desconocido";

        console.log("🏆 Ruta seleccionada");
        console.log("Local :", localType);
        console.log("Remoto:", remoteType);

        if (localType === "relay" || remoteType === "relay") {

            console.log("🟠 Conexión mediante TURN");

        } else {

            console.log("🟢 Conexión P2P");

        }

        console.log("----------------------------");

    }

    if (!found) {

        console.log("⚠️ No se encontró un Candidate Pair seleccionado.");

    }

    console.log("════════════════════════════");

}

isReady() {

    return this.isOpen;

}

}

export default new PeerManager();
