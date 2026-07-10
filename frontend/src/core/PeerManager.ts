import socket from "../services/socket";

class PeerManager {

    private peer: RTCPeerConnection | null = null;
    private channel: RTCDataChannel | null = null;
    private room = "";

    initialize(room: string) {

        this.room = room;

        if (this.peer)
            return;

        this.peer = new RTCPeerConnection({

            iceServers: [

                {
                    urls: [
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302"
                    ]
                }

            ]

        });

        this.peer.onconnectionstatechange = () => {

            console.log("🌐", this.peer?.connectionState);

        };

        this.peer.oniceconnectionstatechange = () => {

            console.log("🧊", this.peer?.iceConnectionState);

        };

        this.peer.onicecandidate = ({ candidate }) => {

            if (!candidate)
                return;

            socket.emit("ice-candidate", {

                room: this.room,

                candidate

            });

        };

        this.peer.ondatachannel = ({ channel }) => {

    console.log("📦 DataChannel recibido");

    this.channel = channel;

    this.registerChannel();

};

    }

    private registerChannel() {

        if (!this.channel)
            return;

        
       this.channel.onopen = () => {

    console.log("🟢 DataChannel abierto");

    this.channel?.send("Hola desde " + this.room);

};



let received: ArrayBuffer[] = [];

let fileName = "";

this.channel.onmessage = ({ data }) => {

    if (typeof data === "string") {

        if (!data.startsWith("{")) {

            console.log("💬", data);

            return;

        }

        const message = JSON.parse(data);

        if (message.type === "start") {

            console.log("📥 Comenzando archivo:", message.name);

            received = [];

            fileName = message.name;

            return;

        }

        if (message.type === "end") {

            console.log("✅ Archivo completo");

            const blob = new Blob(received.map(buffer => new Uint8Array(buffer)));

            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = url;

            a.download = fileName;

            a.click();

            URL.revokeObjectURL(url);

            return;

        }

    }

    console.log("📦", received.length + 1);

    if (data instanceof ArrayBuffer) {
    received.push(data);
}

};
        this.channel.onclose = () => {

            console.log("🔴 DataChannel cerrado");

        };

    }

    createChannel() {

        if (!this.peer)
            return;

        this.channel = this.peer.createDataChannel("droply");

        this.registerChannel();

    }

    async createOffer() {

        if (!this.peer)
            return null;

        const offer = await this.peer.createOffer();

        await this.peer.setLocalDescription(offer);

        return offer;

    }

    async createAnswer() {

        if (!this.peer)
            return null;

        const answer = await this.peer.createAnswer();

        await this.peer.setLocalDescription(answer);

        return answer;

    }

    async setRemoteDescription(description: RTCSessionDescriptionInit) {

        if (!this.peer)
            return;

        await this.peer.setRemoteDescription(description);

    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {

        if (!this.peer)
            return;

        await this.peer.addIceCandidate(candidate);

    }

    send(message: string) {
        

        this.channel?.send(message);

    }
    
 async sendFile(file: File) {

    if (!this.channel) {

        console.log("❌ DataChannel cerrado");

        return;

    }

    const CHUNK_SIZE = 64 * 1024; // 64 KB

    console.log("📤 Enviando:", file.name);

    this.channel.send(JSON.stringify({

        type: "start",

        name: file.name,

        size: file.size

    }));

    let offset = 0;

    while (offset < file.size) {

        const slice = file.slice(offset, offset + CHUNK_SIZE);

        const buffer = await slice.arrayBuffer();

        while (this.channel.bufferedAmount > 4 * 1024 * 1024) {

            await new Promise(resolve => setTimeout(resolve, 10));

        }

        this.channel.send(buffer);

        offset += CHUNK_SIZE;

        console.log(

            `📤 ${Math.floor(offset / file.size * 100)}%`

        );

    }

    this.channel.send(JSON.stringify({

        type: "end"

    }));

    console.log("✅ Archivo enviado");

}

}

export default new PeerManager();