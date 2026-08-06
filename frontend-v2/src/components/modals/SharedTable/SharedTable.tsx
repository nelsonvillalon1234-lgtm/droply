
import { useEffect, useState } from "react";
import type { ActivityItem, ChatMessage, DeviceType, SharedMedia, TableItem, TransferPhase } from "./types";



import "./styles/sharedTable.css";
import socket from "../../../services/socket";
import { ensureDeviceRegistered } from "../../../services/socket";
import deviceId, {
    deviceName,
    deviceType
} from "../../../services/device";
import TopBar from "./components/TopBar";
import Workspace from "./components/Workspace";
import MediaPreview, { type MediaPreviewFile } from "./components/MediaPreview";
import LargeFilePrompt from "./components/LargeFilePrompt";
import { useRef } from "react";
import PeerManager from "../../../core/PeerManager";
import type { RecentRoom } from "./components/CenterAction";
import { getFileHandle, saveFileHandle, type PersistedFileHandle } from "../../../services/fileSourceStore";


const RECENT_TABLES_KEY = "droply-recent-tables";
const RECENT_TABLE_TTL = 24 * 60 * 60 * 1000;
const LARGE_FILE_WARNING_SIZE = 500 * 1024 * 1024;
const KEEP_RECEIVED_FILE_IN_MEMORY_LIMIT = 500 * 1024 * 1024;

type WritableFileHandle = {
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
};
type DownloadDirectoryHandle = {
    name: string;
    getFileHandle: (name: string, options: { create: true }) => Promise<WritableFileHandle>;
};
type DirectoryPickerWindow = Window & {
    showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<DownloadDirectoryHandle>;
};

function readRecentRooms(): RecentRoom[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_TABLES_KEY) ?? "[]") as RecentRoom[];
        const now = Date.now();
        const active = parsed.filter(room => room.code?.length === 6 && room.expiresAt > now).slice(0, 2);
        localStorage.setItem(RECENT_TABLES_KEY, JSON.stringify(active));
        return active;
    } catch {
        return [];
    }
}



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
    const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(readRecentRooms);
    const [downloadFolderName, setDownloadFolderName] = useState<string | null>(null);
    const [showDownloadFolderPrompt, setShowDownloadFolderPrompt] = useState(true);
    const downloadDirectoryRef = useRef<DownloadDirectoryHandle | null>(null);
    const canChooseDownloadFolder = typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";

    const roomRef = useRef(sessionStorage.getItem("droply-active-table") ?? "");
    const reconnectPendingRef = useRef(Boolean(roomRef.current));
    const joiningCodeRef = useRef("");

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
const [downloadPhase, setDownloadPhase] = useState<TransferPhase>("idle");

const downloadingItemRef =
    useRef<string | null>(null);

const activeTransferItemRef =
    useRef<string | null>(null);

const pendingPreviewItemRef = useRef<string | null>(null);
const itemsRef = useRef<TableItem[]>([]);

const [devices, setDevices] = useState<DeviceType[]>([
    {
        id: deviceId,
        name: deviceName,
        type: deviceType,
    },
]);

const files = useRef(new Map<string, File>());

const [items, setItems] = useState<TableItem[]>([]);
const [hasSourcesToRestore, setHasSourcesToRestore] = useState(false);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [activity, setActivity] = useState<ActivityItem[]>([]);
const [sharedMedia, setSharedMedia] = useState<SharedMedia | null>(null);
const [mediaPreview, setMediaPreview] = useState<MediaPreviewFile | null>(null);
const [largeFilePromptItem, setLargeFilePromptItem] = useState<TableItem | null>(null);
const undoRef = useRef<TableItem | null>(null);
const knownDevicesRef = useRef<DeviceType[]>([]);
useEffect(() => {
    itemsRef.current = items;
}, [items]);

async function chooseDownloadFolder() {
    try {
        const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
        if (!picker) return;
        const directory = await picker({ mode: "readwrite" });
        downloadDirectoryRef.current = directory;
        setDownloadFolderName(directory.name);
        setShowDownloadFolderPrompt(true);
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: `Las descargas se guardarán en ${directory.name}` }));
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: "No pudimos usar esa carpeta. Las descargas seguirán funcionando normalmente." }));
    }
}

function downloadWithBrowser(url: string, name: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function saveReceivedFile(url: string, name: string) {
    const directory = downloadDirectoryRef.current;
    if (!directory) {
        downloadWithBrowser(url, name);
        return;
    }
    const safeName = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_") || "archivo";
    try {
        const blob = await fetch(url).then(response => response.blob());
        const fileHandle = await directory.getFileHandle(safeName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: `Guardado en ${directory.name}` }));
    } catch {
        downloadDirectoryRef.current = null;
        setDownloadFolderName(null);
        downloadWithBrowser(url, name);
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: "La carpeta ya no estaba disponible. Guardamos el archivo en Descargas." }));
    }
}

function rememberRoom(code: string) {
    const now = Date.now();
    setRecentRooms(current => {
        const next = [{ code, openedAt: now, expiresAt: now + RECENT_TABLE_TTL }, ...current.filter(room => room.code !== code)].slice(0, 2);
        localStorage.setItem(RECENT_TABLES_KEY, JSON.stringify(next));
        return next;
    });
}

function forgetRoom(code: string) {
    setRecentRooms(current => {
        const next = current.filter(room => room.code !== code);
        localStorage.setItem(RECENT_TABLES_KEY, JSON.stringify(next));
        return next;
    });
}

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

    socket.emit("create-room", { id: deviceId, name: deviceName, type: deviceType });

    setTimeout(() => {

        setHasRoom(true);

        setCreatingRoom(false);

    }, 700);

}

function handleJoinRoom(code: string) {
    if (creatingRoom) return;
    setCreatingRoom(true);
    joiningCodeRef.current = code;
    socket.emit("join-room", {
        code,
        device: { id: deviceId, name: deviceName, type: deviceType },
    });
}

function handleCloseTable() {
    if (roomRef.current) socket.emit("leave-room");
    sessionStorage.removeItem("droply-active-table");
    roomRef.current = "";
    reconnectPendingRef.current = false;
    PeerManager.reset();
    setHasRoom(false);
    setRoomCode("");
    onClose();
}

function handleLeaveTable() {
    handleCloseTable();
}

function addTableItem(file: File, x: number, y: number, parentId: string | null = null, handle: PersistedFileHandle | null = null) {

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
    if (handle) void saveFileHandle(item.id, handle);

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

function handleRelinkFile(item: TableItem, file: File, handle: PersistedFileHandle | null = null) {
    if (file.name !== item.name || file.size !== item.size) {
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: "Selecciona el mismo archivo: el nombre y el tamaño deben coincidir." }));
        return;
    }
    files.current.set(item.id, file);
    if (handle) void saveFileHandle(item.id, handle);
    const updated = { ...item, available: true };
    setItems(current => current.map(entry => entry.id === item.id ? updated : entry));
    socket.emit("table-item-updated", updated);
    window.dispatchEvent(new CustomEvent("droply-toast", { detail: `${item.name} vuelve a estar disponible.` }));
}

async function restoreOwnedSources(roomItems: TableItem[], requestPermission = false) {
    let needsPermission = false;
    let restoredCount = 0;
    for (const item of roomItems) {
        if (item.type !== "file" || item.ownerId !== deviceId || files.current.has(item.id)) continue;
        try {
            const handle = await getFileHandle(item.id);
            if (!handle) continue;
            let permission = await handle.queryPermission({ mode: "read" });
            if (permission === "prompt" && requestPermission) permission = await handle.requestPermission({ mode: "read" });
            if (permission !== "granted") { needsPermission = true; continue; }
            const source = await handle.getFile();
            if (source.name !== item.name || source.size !== item.size) continue;
            files.current.set(item.id, source);
            restoredCount += 1;
        } catch {
            // A moved or deleted source remains available for manual relinking.
        }
    }
    const normalized = roomItems.map(item => item.type === "file" && item.ownerId === deviceId
        ? { ...item, available: files.current.has(item.id) }
        : item);
    setItems(normalized);
    setHasSourcesToRestore(needsPermission);
    normalized.forEach(item => {
        if (item.type === "file" && item.ownerId === deviceId) socket.emit("table-item-updated", item);
        if (item.type === "file" && files.current.has(item.id)) {
            socket.emit("download-source-added", { itemId: item.id });
        }
    });
    if (requestPermission && restoredCount) {
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: `${restoredCount} archivo${restoredCount === 1 ? " restaurado" : "s restaurados"}.` }));
    }
}

function handleRestoreSources() {
    void restoreOwnedSources(items, true);
}

function handleCreateMedia(url: string, x: number, y: number) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/i);
    if (!match) return window.dispatchEvent(new CustomEvent("droply-toast", { detail: "Ese enlace de YouTube no es válido." }));
    const media: SharedMedia = { id: crypto.randomUUID(), videoId: match[1], x, y, playing: false, currentTime: 0, updatedAt: Date.now(), updatedBy: deviceName };
    setSharedMedia(media); socket.emit("media-create", media); recordActivity(`${deviceName} agregó un video compartido`);
}
function handleMediaControl(playing: boolean, currentTime: number) { socket.emit("media-control", { playing, currentTime }); }
function handleMediaMove(x: number, y: number) { setSharedMedia(current=>current?{...current,x,y}:null);socket.emit("media-moved",{x,y}); }
function handleMediaRemove() { setSharedMedia(null);socket.emit("media-remove");recordActivity(`${deviceName} quitó el video compartido`); }

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

    pendingPreviewItemRef.current = null;

    setDownloadProgress(0);

    setDownloadComplete(false);
    setDownloadPhase("idle");

}

function getPreviewKind(item: TableItem, file: File): MediaPreviewFile["kind"] | null {
    const extension = item.extension.toLowerCase();
    const mimeType = file.type.toLowerCase();

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"];
    const videoExtensions = ["mp4", "webm", "m4v"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac"];

    if (extension === "pdf" || mimeType === "application/pdf") return "pdf";
    if (imageExtensions.includes(extension) || mimeType.startsWith("image/")) return "image";
    if (videoExtensions.includes(extension) || mimeType.startsWith("video/")) return "video";
    if (audioExtensions.includes(extension) || mimeType.startsWith("audio/")) return "audio";

    return null;
}

function closeMediaPreview() {
    if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview.url);
    }

    setMediaPreview(null);
}

function openLocalPreview(item: TableItem, file: File) {
    const kind = getPreviewKind(item, file);

    if (!kind) {
        window.dispatchEvent(
            new CustomEvent("droply-toast", {
                detail: "Este tipo de archivo todavía no tiene vista previa.",
            })
        );

        return;
    }

    if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview.url);
    }

    setMediaPreview({
        itemId: item.id,
        url: URL.createObjectURL(file),
        name: item.name,
        extension: item.extension || "archivo",
        mimeType: file.type,
        kind,
    });
}

function getPreviewableItems() {
    return items.filter((item) => {
        if (item.type !== "file") return false;
        if (item.deleted) return false;

        const file = files.current.get(item.id);
        if (!file) return false;

        return Boolean(getPreviewKind(item, file));
    });
}

function shouldPromptLargeFileDownload(item: TableItem) {
    return item.type === "file" && item.size >= LARGE_FILE_WARNING_SIZE;
}

function openLargeFilePrompt(item: TableItem) {
    setLargeFilePromptItem(item);
}

function closeLargeFilePrompt() {
    setLargeFilePromptItem(null);
    pendingPreviewItemRef.current = null;
}

function handlePreviewItem(item: TableItem) {
    if (item.type !== "file") return;

    const file = files.current.get(item.id);

    if (!file) {
    pendingPreviewItemRef.current = item.id;

    window.dispatchEvent(
        new CustomEvent("droply-toast", {
            detail: "Descargando para abrir vista previa.",
        })
    );

    handleDownload(item);
    return;
}

    openLocalPreview(item, file);
}

function handlePreviewNavigation(direction: "previous" | "next") {
    if (!mediaPreview) return;

    const previewableItems = getPreviewableItems();

    if (previewableItems.length <= 1) return;

    const currentIndex = previewableItems.findIndex(
        (item) => item.id === mediaPreview.itemId
    );

    if (currentIndex === -1) return;

    const nextIndex =
        direction === "next"
            ? (currentIndex + 1) % previewableItems.length
            : (currentIndex - 1 + previewableItems.length) % previewableItems.length;

    const nextItem = previewableItems[nextIndex];
    const nextFile = files.current.get(nextItem.id);

    if (!nextFile) return;

    openLocalPreview(nextItem, nextFile);
}

function startDownload(item: TableItem) {
    if (item.type !== "file") return;

    downloadingItemRef.current = item.id;
    activeTransferItemRef.current = item.id;

    setDownloadItemId(item.id);
    setDownloadProgress(0);
    setDownloadComplete(false);
    setDownloadPhase("searching");

    console.log("📥 Solicitando descarga");

    socket.emit("download-request", {
        itemId: item.id,
        ownerId: item.ownerId,
    });
}

function handleConfirmLargeFileDownload() {
    const item = largeFilePromptItem;
    setLargeFilePromptItem(null);

    if (!item) return;

    startDownload(item);
}

function handleDownload(item: TableItem) {
    if (item.type !== "file") return;

    const file = files.current.get(item.id);

    if (file) {
        console.log("💾 Archivo disponible localmente, guardando otra vez:", file.name);

        const url = URL.createObjectURL(file);

        void saveReceivedFile(url, file.name).finally(() => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);
        });

        return;
    }

    if (shouldPromptLargeFileDownload(item)) {
        openLargeFilePrompt(item);
        return;
    }

    startDownload(item);
}



    useEffect(() => {

    const restoreRoom = async () => {
        const code = roomRef.current;
        if (!code || !reconnectPendingRef.current) return;
        try {
            await ensureDeviceRegistered();
            socket.emit("join-room", {
                code,
                device: { id: deviceId, name: deviceName, type: deviceType },
            });
        } catch {
            setSocketConnected(false);
        }
    };
    const handleConnect = () => {
        setSocketConnected(true);
        void restoreRoom();
    };
    const handleDisconnect = () => {
        setSocketConnected(false);
        reconnectPendingRef.current = Boolean(roomRef.current);
        PeerManager.reset();
    };
    const handleVisibilityChange = () => {
        if (document.visibilityState !== "visible" || !roomRef.current) return;
        reconnectPendingRef.current = true;
        if (!socket.connected) socket.connect();
        else void restoreRoom();
    };
    const handleNetworkReturn = () => {
        if (!roomRef.current) return;
        reconnectPendingRef.current = true;
        if (!socket.connected) socket.connect();
        else void restoreRoom();
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleNetworkReturn);

    socket.on("room-created", (code: string) => {

    console.log("✅ Sala creada:", code);

    setRoomCode(code);

    rememberRoom(code);

    roomRef.current = code;

    sessionStorage.setItem("droply-active-table", code);

});
    socket.on("joined-room", (code: string) => {

    console.log("✅ Unido a la sala:", code);

    setRoomCode(code);

    rememberRoom(code);

    roomRef.current = code;

    sessionStorage.setItem("droply-active-table", code);

    reconnectPendingRef.current = false;
    joiningCodeRef.current = "";

    setHasRoom(true);

    setCreatingRoom(false);

});

    socket.on("join-error", () => {
        setCreatingRoom(false);
        const failedCode = joiningCodeRef.current || (reconnectPendingRef.current ? roomRef.current : "");
        joiningCodeRef.current = "";
        if (reconnectPendingRef.current) {
            sessionStorage.removeItem("droply-active-table");
            roomRef.current = "";
            reconnectPendingRef.current = false;
        }
        if (failedCode) forgetRoom(failedCode);
        window.dispatchEvent(new CustomEvent("droply-toast", { detail: "No encontramos esa mesa. Revisa el código." }));
    });



    socket.on("receiver-connected", () => {});

    socket.on("room-devices", (roomDevices: DeviceType[]) => {
        const previous = knownDevicesRef.current;
        const joined = roomDevices.find(device => !previous.some(entry => entry.id === device.id));
        const left = previous.find(device => !roomDevices.some(entry => entry.id === device.id));
        if (previous.length && joined) {
            recordActivity(`${joined.name} entró a la mesa`);
            window.dispatchEvent(new CustomEvent("droply-toast", { detail: `${joined.name} se conectó` }));
        }
        if (left) {
            recordActivity(`${left.name} salió de la mesa`);
            window.dispatchEvent(new CustomEvent("droply-toast", { detail: `${left.name} se desconectó` }));
        }
        knownDevicesRef.current = roomDevices;
        setDevices(roomDevices);
    });
    socket.on("room-items", (roomItems: TableItem[]) => { void restoreOwnedSources(roomItems); });
    socket.on("room-media", (media: SharedMedia | null) => setSharedMedia(media));

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
socket.on("table-item-source-available", ({ itemId }: { itemId: string }) => {
    setItems(current => current.map(item => item.id === itemId
        ? { ...item, available: true }
        : item));
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

        if (!file) {
            socket.emit("download-source-missing", { itemId, requesterSocketId });
            return;
        }

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
    setDownloadPhase("connecting");

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

socket.on("download-unavailable", ({ itemId, reason }: { itemId: string; reason?: string }) => {
    if (downloadingItemRef.current !== itemId) return;
    PeerManager.reset();
    downloadingItemRef.current = null;
    activeTransferItemRef.current = null;
    setDownloadItemId(null);
    pendingPreviewItemRef.current = null;
    setDownloadProgress(0);
    setDownloadComplete(false);
    setDownloadPhase("idle");
    window.dispatchEvent(new CustomEvent("droply-toast", { detail: reason === "source-missing" ? "El propietario debe volver a vincular este archivo." : "El dispositivo que tiene este archivo está desconectado." }));
});

    if (socket.connected && roomRef.current) void restoreRoom();

    return () => {

        socket.off("room-created");

        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("online", handleNetworkReturn);

        socket.off("joined-room");

        socket.off("join-error");

        socket.off("receiver-connected");
        socket.off("room-devices");
        socket.off("room-items");
        socket.off("room-media");

        socket.off("table-item-added");
        socket.off("table-item-updated");

        socket.off("table-item-source-available");

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
            setDownloadPhase(progress > 0 ? "receiving" : "connecting");

        }
    );

    async function handleFileReady(
        event: Event
    ) {

        const fileEvent =
            event as CustomEvent<{
                url: string;
                name: string;
                blob: Blob;
            }>;

        const completedItemId = downloadingItemRef.current;
        if (!completedItemId)
            return;

        setDownloadProgress(100);
        setDownloadPhase("verifying");

        activeTransferItemRef.current = null;

        await saveReceivedFile(fileEvent.detail.url, fileEvent.detail.name);

        const receivedBlob = fileEvent.detail.blob;
const shouldKeepInMemory =
    receivedBlob.size <= KEEP_RECEIVED_FILE_IN_MEMORY_LIMIT;

let receivedFile: File | null = null;

if (shouldKeepInMemory) {
    receivedFile = new File([receivedBlob], fileEvent.detail.name, {
        type: receivedBlob.type || "application/octet-stream",
        lastModified: Date.now(),
    });

    files.current.set(completedItemId, receivedFile);
} else {
    files.current.delete(completedItemId);

    window.dispatchEvent(
        new CustomEvent("droply-toast", {
            detail: "Archivo grande guardado. Liberamos memoria para evitar que el navegador se sature.",
        })
    );
}

if (pendingPreviewItemRef.current === completedItemId) {
    const previewItem = itemsRef.current.find(
        (item) => item.id === completedItemId
    );

    if (previewItem && receivedFile) {
        openLocalPreview(
            { ...previewItem, available: true },
            receivedFile
        );
    } else if (previewItem && !receivedFile) {
        window.dispatchEvent(
            new CustomEvent("droply-toast", {
                detail: "Archivo grande guardado. No se abrió preview automático para proteger la memoria.",
            })
        );
    }

    pendingPreviewItemRef.current = null;
}
        setItems(current => current.map(item => item.id === completedItemId
    ? { ...item, available: true }
    : item));

if (fileEvent.detail.blob.size <= KEEP_RECEIVED_FILE_IN_MEMORY_LIMIT) {
    socket.emit("download-source-added", { itemId: completedItemId });
}

        setDownloadComplete(true);
        setDownloadPhase("complete");

        downloadingItemRef.current = null;
        PeerManager.reset();

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
        pendingPreviewItemRef.current = null;
        PeerManager.reset();
        setDownloadItemId(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setDownloadPhase("idle");
        recordActivity(`La descarga de ${fileEvent.detail?.name || "un archivo"} fue rechazada por integridad`);
    }

    function handleConnectionFailure(event: Event) {
        const detail = (event as CustomEvent<{ relayAvailable?: boolean }>).detail;
        downloadingItemRef.current = null;
        activeTransferItemRef.current = null;
        pendingPreviewItemRef.current = null;
        PeerManager.reset();
        setDownloadItemId(null);
        setDownloadProgress(0);
        setDownloadComplete(false);
        setDownloadPhase("idle");
        window.dispatchEvent(new CustomEvent("droply-toast", {
            detail: detail?.relayAvailable
                ? "No pudimos establecer la conexión directa. Intenta nuevamente."
                : "Esta red necesita el servidor TURN para descargar. Falta configurarlo en Droply.",
        }));
    }

    window.addEventListener(
        "file-ready",
        handleFileReady
    );
    window.addEventListener("file-integrity-error", handleIntegrityError);
    window.addEventListener("peer-connection-failed", handleConnectionFailure);

    return () => {

        PeerManager.setOnReceiveProgress(
            () => {}
        );

        window.removeEventListener(
            "file-ready",
            handleFileReady
        );
        window.removeEventListener("file-integrity-error", handleIntegrityError);
        window.removeEventListener("peer-connection-failed", handleConnectionFailure);

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
    downloadPhase={downloadPhase}
    onCreateRoom={handleCreateRoom}
    onJoinRoom={handleJoinRoom}
    onAddFile={addTableItem}
    onDownload={handleDownload}
    onPreviewItem={handlePreviewItem}
    onRelinkFile={handleRelinkFile}
    hasSourcesToRestore={hasSourcesToRestore}
    onRestoreSources={handleRestoreSources}
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
    onDisconnect={handleLeaveTable}
    recentRooms={recentRooms}
    sharedMedia={sharedMedia}
    onCreateMedia={handleCreateMedia}
    onMediaControl={handleMediaControl}
    onMediaMove={handleMediaMove}
    onMediaRemove={handleMediaRemove}
    canChooseDownloadFolder={canChooseDownloadFolder}
    downloadFolderName={downloadFolderName}
    showDownloadFolderPrompt={showDownloadFolderPrompt}
    onChooseDownloadFolder={chooseDownloadFolder}
    onDismissDownloadFolder={() => setShowDownloadFolderPrompt(false)}
/>
<LargeFilePrompt
    item={largeFilePromptItem}
    onConfirm={handleConfirmLargeFileDownload}
    onCancel={closeLargeFilePrompt}
/>


{mediaPreview && (
    <MediaPreview
        preview={mediaPreview}
        onClose={closeMediaPreview}
        onPrevious={() => handlePreviewNavigation("previous")}
        onNext={() => handlePreviewNavigation("next")}
        canGoPrevious={getPreviewableItems().length > 1}
        canGoNext={getPreviewableItems().length > 1}
    />
)}

                <button

                    className="shared-table-close"

                    onClick={handleCloseTable}

                >

                    ✕

                </button>

            </div>

        </div>

    );

}
