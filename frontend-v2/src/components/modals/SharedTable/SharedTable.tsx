
import { useEffect, useState } from "react";
import type { ActivityItem, ChatMessage, DeviceType, TableItem } from "./types";



import "./styles/sharedTable.css";
import socket from "../../../services/socket";
import deviceId, {
    deviceName
} from "../../../services/device";
import TopBar from "./components/TopBar";
import Workspace from "./components/Workspace";
import { useRef } from "react";
import PeerManager from "../../../core/PeerManager";



type Props = {

    isOpen: boolean;

    onClose: () => void;

    file?: File | null;

};

export default function SharedTable({

    isOpen,

    file,

    onClose,

}: Props) {
    

    const [hasRoom, setHasRoom] = useState(false);

    const [creatingRoom, setCreatingRoom] = useState(false);

    const [roomCode, setRoomCode] = useState("");

    const [showMenu, setShowMenu] = useState(true);
    const [socketConnected, setSocketConnected] = useState(socket.connected);

    const roomRef = useRef("");

const [
    downloadItemId,
    setDownloadItemId
] = useState<string | null>(null);

const [
    downloadProgress,
    setDownloadProgress
] = useState(0);

const [
    downloadComplete,
    setDownloadComplete
] = useState(false);

const downloadingItemRef =
    useRef<string | null>(null);

const activeTransferItemRef =
    useRef<string | null>(null);

const [devices, setDevices] = useState<DeviceType[]>([
    {
        id: deviceId,
        name: deviceName,
        type: "pc",
    },
]);

const files = useRef(new Map<string, File>());

const [items, setItems] = useState<TableItem[]>([]);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [activity, setActivity] = useState<ActivityItem[]>([]);
const undoRef = useRef<TableItem | null>(null);

function recordActivity(text: string) {
    setActivity(current => [{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...current].slice(0, 50));
}

function updateItem(item: TableItem, changes: Partial<TableItem>, activityText: string) {
    undoRef.current = { ...item };
    const updated = { ...item, ...changes };
    setItems(current => current.map(entry => entry.id === item.id ? updated : entry));
    socket.emit("table-item-updated", updated);
    recordActivity(activityText);
}

function handleRenameItem(item: TableItem, name: string) {
    updateItem(item, { name }, `${deviceName} renombró un elemento a ${name}`);
}

function handleDeleteItem(item: TableItem) {
    updateItem(item, { deleted: true }, `${deviceName} movió ${item.name} a la papelera`);
}

function handleRestoreItem(item: TableItem) {
    updateItem(item, { deleted: false }, `${deviceName} restauró ${item.name}`);
}

function handleUndo() {
    const previous = undoRef.current;
    if (!previous) return;
    setItems(current => current.map(entry => entry.id === previous.id ? previous : entry));
    socket.emit("table-item-updated", previous);
    undoRef.current = null;
    recordActivity(`${deviceName} deshizo la última acción`);
}


    function handleCreateRoom() {

    if (creatingRoom) return;

    setCreatingRoom(true);

    socket.emit("create-room", { id: deviceId, name: deviceName, type: "pc" });

    setTimeout(() => {

        setHasRoom(true);

        setCreatingRoom(false);

    }, 700);

}

function addTableItem(file: File, x: number, y: number, parentId: string | null = null) {

    const item: TableItem = {

    id: crypto.randomUUID(),

    ownerId: deviceId,
    ownerName: deviceName,

    type: "file",

        name: file.name,

        size: file.size,

        extension: file.name.split(".").pop() ?? "",

        x,

        y,

        available: true,
        parentId,

    };
    files.current.set(item.id, file);

    console.log("👤 Owner:", deviceId);

    socket.emit("table-item-added", item);

    console.log("📄 Agregando", item);

    setItems((current) => [

        ...current,

        item,

    ]);
    recordActivity(`${deviceName} agregó ${file.name}`);

}

function addWorkspaceItem(
    type: "folder" | "note",
    name: string,
    x: number,
    y: number,
    content = "",
    parentId: string | null = null
) {
    const item: TableItem = {
        id: crypto.randomUUID(),
        ownerId: deviceId,
        ownerName: deviceName,
        type,
        name,
        size: type === "note" ? new Blob([content]).size : 0,
        extension: type === "note" ? "TXT" : "",
        x,
        y,
        available: true,
        content,
        parentId,
    };

    socket.emit("table-item-added", item);
    setItems((current) => [...current, item]);
    recordActivity(`${deviceName} creó ${name}`);
}

function handleSendMessage(text: string) {
    const message: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: deviceId,
        senderName: deviceName,
        text,
        createdAt: Date.now(),
    };

    setMessages((current) => [...current, message]);
    socket.emit("chat-message", message);
}

function handleMoveItem(
    item: TableItem,
    x: number,
    y: number,
    parentId: string | null = item.parentId ?? null
) {

    undoRef.current = { ...item };

    setItems((current) =>
        current.map((currentItem) =>
            currentItem.id === item.id
                ? {
                      ...currentItem,
                      x,
                      y,
                      parentId,
                  }
                : currentItem
        )
    );

    socket.emit(
        "table-item-moved",
        {
            itemId: item.id,
            x,
            y,
            parentId,
        }
    );
    recordActivity(`${deviceName} movió ${item.name}`);

}

function handleCancelDownload() {

    socket.emit("cancel-transfer");

    PeerManager.cancelTransfer();

    downloadingItemRef.current = null;

    activeTransferItemRef.current = null;

    setDownloadItemId(null);

    setDownloadProgress(0);

    setDownloadComplete(false);

}


function handleDownload(item: TableItem) {

    if (item.type !== "file") return;

    const file = files.current.get(item.id);

    if (file) {

        console.log("📤 Soy el propietario");

        return;

    }

    downloadingItemRef.current = item.id;

    activeTransferItemRef.current = item.id;

    setDownloadItemId(item.id);

    setDownloadProgress(0);

    setDownloadComplete(false);

    console.log("📥 Solicitando descarga");

    socket.emit("download-request", {

        itemId: item.id,

        ownerId: item.ownerId,

    });

}



    useEffect(() => {

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on("room-created", (code: string) => {

    console.log("✅ Sala creada:", code);

    setRoomCode(code);

    roomRef.current = code;

});
    socket.on("joined-room", (code: string) => {

    console.log("✅ Unido a la sala:", code);

    setRoomCode(code);

    roomRef.current = code;

    setHasRoom(true);

});



    socket.on("receiver-connected", () => {});

    socket.on("room-devices", (roomDevices: DeviceType[]) => setDevices(roomDevices));
    socket.on("room-items", (roomItems: TableItem[]) => setItems(roomItems));

socket.on("table-item-added", (item: TableItem) => {

         console.log("📥 Recibido desde socket:", item);

    setItems((current) => {

        if (current.some(i => i.id === item.id)) {

            return current;

        }

        return [

            ...current,

            item,

        ];

    });

});
socket.on(
    "table-item-moved",
    ({
        itemId,
        x,
        y,
        parentId,
    }: {
        itemId: string;
        x: number;
        y: number;
        parentId?: string | null;
    }) => {

        setItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          x,
                          y,
                          parentId: parentId ?? null,
                      }
                    : item
            )
        );

    }
);

socket.on("cancel-transfer", () => {

    PeerManager.cancelTransfer();

});
socket.on("table-item-updated", (updated: TableItem) => {
    setItems(current => current.map(item => item.id === updated.id ? updated : item));
});

socket.on("chat-message", (message: ChatMessage) => {
    setMessages((current) =>
        current.some((item) => item.id === message.id)
            ? current
            : [...current, message]
    );
});

socket.on("room-full", () => {
    setCreatingRoom(false);
    window.dispatchEvent(new CustomEvent("droply-toast", { detail: "Esta mesa ya tiene 4 integrantes." }));
});


socket.on(
    "download-request",
    async ({ itemId, requesterSocketId }: { itemId: string; requesterSocketId: string }) => {

        const file = files.current.get(itemId);

        if (!file) return;

        PeerManager.reset();
        activeTransferItemRef.current = itemId;

        console.log("🚀 Iniciando envío:", file.name);

        PeerManager.setOnReady(async () => {
        await PeerManager.sendFile(file);
        });

        PeerManager.initialize(roomRef.current);

        PeerManager.setDownloadSignalTarget(requesterSocketId, itemId);

        PeerManager.createChannel();

        const offer = await PeerManager.createOffer();

        if (!offer) return;

        socket.emit("download-offer", {
             targetSocketId: requesterSocketId,
             itemId,
             offer,
        });

    }
);
socket.on("download-offer", async ({ itemId, offer, sourceSocketId }: { itemId: string; offer: RTCSessionDescriptionInit; sourceSocketId: string }) => {

    if (downloadingItemRef.current !== itemId) return;

    console.log("📨 OFFER recibido");

    PeerManager.reset();
    activeTransferItemRef.current = itemId;
    PeerManager.initialize(roomRef.current);
    PeerManager.setDownloadSignalTarget(sourceSocketId, itemId);

    const applied = await PeerManager.setRemoteDescription(offer);

    if (!applied) return;

    const answer = await PeerManager.createAnswer();

    socket.emit("download-answer", {
        targetSocketId: sourceSocketId,
        itemId,
        answer,
    });

});
socket.on("download-answer", async ({ itemId, answer }: { itemId: string; answer: RTCSessionDescriptionInit }) => {

    if (activeTransferItemRef.current !== itemId) return;

    console.log("📥 ANSWER recibido");

    await PeerManager.setRemoteDescription(answer);

});
socket.on("download-ice-candidate", async ({ itemId, candidate }: { itemId: string; candidate: RTCIceCandidateInit }) => {

    if (activeTransferItemRef.current !== itemId) return;

    await PeerManager.addIceCandidate(candidate);

});

socket.on("download-unavailable", ({ itemId }: { itemId: string }) => {
    if (downloadingItemRef.current !== itemId) return;
    downloadingItemRef.current = null;
    activeTransferItemRef.current = null;
    setDownloadItemId(null);
    setDownloadProgress(0);
    setDownloadComplete(false);
    window.dispatchEvent(new CustomEvent("droply-toast", { detail: "El dispositivo que tiene este archivo esta desconectado." }));
});

    return () => {

        socket.off("room-created");

        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);

        socket.off("joined-room");

        socket.off("receiver-connected");
        socket.off("room-devices");
        socket.off("room-items");

        socket.off("table-item-added");
        socket.off("table-item-updated");

        socket.off("table-item-moved");

        socket.off("cancel-transfer");

        socket.off("chat-message");
        socket.off("room-full");

        socket.off("download-request");

        socket.off("download-offer");

        socket.off("download-answer");

        socket.off("download-ice-candidate");

        socket.off("download-unavailable");

    };

    

}, []);
useEffect(() => {

    PeerManager.setOnReceiveProgress(
        (progress) => {

            if (!downloadingItemRef.current)
                return;

            setDownloadProgress(progress);

        }
    );

    function handleFileReady(
        event: Event
    ) {

        const fileEvent =
            event as CustomEvent<{
                url: string;
                name: string;
            }>;

        if (!downloadingItemRef.current)
            return;

        setDownloadProgress(100);

        setDownloadComplete(true);

        activeTransferItemRef.current = null;

        const link =
            document.createElement("a");

        link.href =
            fileEvent.detail.url;

        link.download =
            fileEvent.detail.name;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {

            URL.revokeObjectURL(
                fileEvent.detail.url
            );

        }, 60000);

    }

    function handleIntegrityError(event: Event) {
        const fileEvent = event as CustomEvent<{ name?: string }>;
        downloadingItemRef.current = null;
        activeTransferItemRef.current = null;
        setDownloadItemId(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        recordActivity(`La descarga de ${fileEvent.detail?.name || "un archivo"} fue rechazada por integridad`);
    }

    window.addEventListener(
        "file-ready",
        handleFileReady
    );
    window.addEventListener("file-integrity-error", handleIntegrityError);

    return () => {

        PeerManager.setOnReceiveProgress(
            () => {}
        );

        window.removeEventListener(
            "file-ready",
            handleFileReady
        );
        window.removeEventListener("file-integrity-error", handleIntegrityError);

    };

}, []);


    useEffect(() => {

    if (!file) return;

    if (hasRoom) return;

    handleCreateRoom();

}, [file, hasRoom]);

    if (!isOpen) return null;

    return (

        <div className="shared-table-overlay">

            <div className="shared-table-window">

                <TopBar
    onMenu={() => setShowMenu((current) => !current)}
    connected={socketConnected}
/>

               <Workspace
    hasRoom={hasRoom}
    creatingRoom={creatingRoom}
    roomCode={roomCode}
    showMenu={showMenu}
    devices={devices}
    items={items}
    downloadItemId={downloadItemId}
    downloadProgress={downloadProgress}
    downloadComplete={downloadComplete}
    onCreateRoom={handleCreateRoom}
    onAddFile={addTableItem}
    onDownload={handleDownload}
    onMoveItem={handleMoveItem}
    onCancelDownload={handleCancelDownload}
    messages={messages}
    onSendMessage={handleSendMessage}
    onCreateWorkspaceItem={addWorkspaceItem}
    activity={activity}
    canUndo={Boolean(undoRef.current)}
    onUndo={handleUndo}
    onRenameItem={handleRenameItem}
    onDeleteItem={handleDeleteItem}
    onRestoreItem={handleRestoreItem}
/>
                <button

                    className="shared-table-close"

                    onClick={onClose}

                >

                    ✕

                </button>

            </div>

        </div>

    );

}
