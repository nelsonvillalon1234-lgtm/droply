import { Socket } from "socket.io";
import RoomManager from "../services/RoomManager.js";
import DeviceManager from "../services/DeviceManager.js";
import { LIMITS, cleanText, createRateLimiter, finiteNumber, isSafeId } from "../security.js";

type DeviceKind = "pc" | "phone" | "tablet" | "laptop";
type RoomDevice = { id: string; name: string; type: DeviceKind };
type TableItem = {
    id: string;
    type: "file" | "folder" | "note";
    ownerId: string;
    ownerName: string;
    name: string;
    size: number;
    extension: string;
    x: number;
    y: number;
    available: boolean;
    content?: string;
    parentId?: string | null;
    deleted?: boolean;
};
type SharedMedia = { id: string; videoId: string; x: number; y: number; playing: boolean; currentTime: number; updatedAt: number; updatedBy: string };
type DrawingKind = "pencil" | "line" | "rectangle" | "ellipse" | "text";
type DrawingFontFamily = "Arial" | "Georgia" | "Trebuchet MS" | "Times New Roman" | "Courier New";
type DrawingPoint = { x: number; y: number };
type DrawingElement = {
    id: string;
    type: DrawingKind;
    ownerId: string;
    ownerName: string;
    stroke: string;
    fill: string;
    strokeWidth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    points?: DrawingPoint[];
    text?: string;
    fontFamily?: DrawingFontFamily;
    fontSize?: number;
    locked: boolean;
    lockedBy?: string | null;
    lockedByName?: string | null;
    createdAt: number;
    updatedAt: number;
};

const roomDevices = new Map<string, Map<string, RoomDevice>>();
const roomItems = new Map<string, Map<string, TableItem>>();
const roomMedia = new Map<string, SharedMedia>();
const roomDrawings = new Map<string, Map<string, DrawingElement>>();
const cleanupTimer = setInterval(() => {
    for (const code of RoomManager.pruneExpiredRooms()) {
        roomDevices.delete(code);
        roomItems.delete(code);
        roomMedia.delete(code);
        roomDrawings.delete(code);
    }
}, 10 * 60_000);
cleanupTimer.unref();
const allowMutation = createRateLimiter(180, 60_000);
const allowChat = createRateLimiter(40, 60_000);

function pauseRoomMedia(code: string) {
    const media = roomMedia.get(code);
    if (!media?.playing) return;
    const elapsed = Math.max(0, Math.min((Date.now() - media.updatedAt) / 1000, 2 * 60 * 60));
    roomMedia.set(code, {
        ...media,
        playing: false,
        currentTime: media.currentTime + elapsed,
        updatedAt: Date.now(),
    });
}

function sanitizeDevice(socket: Socket, input: unknown): RoomDevice | null {
    if (!input || typeof input !== "object") return null;
    const value = input as Record<string, unknown>;
    const id = isSafeId(value.id) ? value.id as string : null;
    const name = cleanText(value.name, LIMITS.deviceNameLength);
    const type = ["pc", "phone", "tablet", "laptop"].includes(String(value.type))
        ? value.type as DeviceKind
        : null;
    if (!id || !name || !type || !DeviceManager.ownsSocket(id, socket.id)) return null;
    return { id, name, type };
}

function sanitizeItem(input: unknown, owner: RoomDevice): TableItem | null {
    if (!input || typeof input !== "object") return null;
    const value = input as Record<string, unknown>;
    if (!isSafeId(value.id) || !["file", "folder", "note"].includes(String(value.type))) return null;
    const type = value.type as TableItem["type"];
    const name = cleanText(value.name, type === "note" ? LIMITS.noteNameLength : LIMITS.fileNameLength);
    const x = finiteNumber(value.x, -20_000, 20_000);
    const y = finiteNumber(value.y, -20_000, 20_000);
    const size = finiteNumber(value.size, 0, Number.MAX_SAFE_INTEGER);
    if (!name || x === null || y === null || size === null) return null;
    const content = type === "note" ? cleanText(value.content ?? name, LIMITS.noteNameLength) ?? "" : undefined;
    return {
        id: value.id as string,
        type,
        ownerId: owner.id,
        ownerName: owner.name,
        name,
        size,
        extension: cleanText(value.extension ?? "", 20) ?? "",
        x,
        y,
        available: Boolean(value.available),
        content,
        parentId: isSafeId(value.parentId) ? value.parentId as string : null,
        deleted: Boolean(value.deleted),
    };
}

const DRAWING_TYPES: DrawingKind[] = ["pencil", "line", "rectangle", "ellipse", "text"];
const DRAWING_FONTS: DrawingFontFamily[] = ["Arial", "Georgia", "Trebuchet MS", "Times New Roman", "Courier New"];

function sanitizeDrawingColor(value: unknown, fallback: string) {
    if (value === "transparent") return "transparent";
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function sanitizeDrawingPoints(value: unknown, required: boolean) {
    if (!Array.isArray(value)) return required ? null : undefined;
    const points: DrawingPoint[] = [];
    for (const rawPoint of value.slice(0, 1500)) {
        if (!rawPoint || typeof rawPoint !== "object") return null;
        const point = rawPoint as Record<string, unknown>;
        const x = finiteNumber(point.x, 0, 1);
        const y = finiteNumber(point.y, 0, 1);
        if (x === null || y === null) return null;
        points.push({ x, y });
    }
    return points;
}

function sanitizeDrawing(input: unknown, owner: RoomDevice, previous?: DrawingElement): DrawingElement | null {
    if (!input || typeof input !== "object") return null;
    const value = input as Record<string, unknown>;
    if (!isSafeId(value.id) || !DRAWING_TYPES.includes(value.type as DrawingKind)) return null;

    const type = value.type as DrawingKind;
    const x = finiteNumber(value.x, 0, 5200);
    const y = finiteNumber(value.y, 0, 3600);
    const width = finiteNumber(value.width, 1, 5200);
    const height = finiteNumber(value.height, 1, 3600);
    const strokeWidth = finiteNumber(value.strokeWidth, 1, 14);
    if (x === null || y === null || width === null || height === null || strokeWidth === null) return null;

    const points = sanitizeDrawingPoints(value.points, type === "pencil" || type === "line");
    if ((type === "pencil" || type === "line") && (!points || points.length < 2)) return null;

    const text = type === "text" ? cleanText(value.text, 300) : undefined;
    if (type === "text" && !text) return null;

    const fontFamily = DRAWING_FONTS.includes(value.fontFamily as DrawingFontFamily)
        ? value.fontFamily as DrawingFontFamily
        : "Arial";
    const fontSize = finiteNumber(value.fontSize ?? 28, 12, 180);
    if (type === "text" && fontSize === null) return null;

    return {
        id: value.id as string,
        type,
        ownerId: previous?.ownerId ?? owner.id,
        ownerName: previous?.ownerName ?? owner.name,
        stroke: sanitizeDrawingColor(value.stroke, "#111827"),
        fill: sanitizeDrawingColor(value.fill, "transparent"),
        strokeWidth,
        x,
        y,
        width,
        height,
        points: points ?? undefined,
        text: text ?? undefined,
        fontFamily: type === "text" ? fontFamily : undefined,
        fontSize: type === "text" ? fontSize ?? 28 : undefined,
        locked: previous?.locked ?? false,
        lockedBy: previous?.lockedBy ?? null,
        lockedByName: previous?.lockedByName ?? null,
        createdAt: previous?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };
}

export default function registerRoomEvents(socket: Socket) {
    socket.on("create-room", (deviceInput?: unknown) => {
        const wrapper = deviceInput && typeof deviceInput === "object" && "device" in deviceInput
            ? deviceInput as { device?: unknown; purpose?: unknown }
            : null;
        const rawDevice = wrapper ? wrapper.device : deviceInput;
        const purpose = wrapper?.purpose === "transfer" ? "transfer" : "table";
        const device = rawDevice ? sanitizeDevice(socket, rawDevice) : null;
        if (rawDevice && !device) return socket.emit("security-error", "Dispositivo invalido");
        const code = RoomManager.createRoom(socket.id, purpose);
        socket.join(code);
        socket.data.roomCode = code;
        roomItems.set(code, new Map());
        roomDrawings.set(code, new Map());
        if (device) {
            socket.data.roomDevice = device;
            roomDevices.set(code, new Map([[socket.id, device]]));
            socket.emit("room-devices", [device]);
        }
        socket.emit("room-created", code);
        const room = RoomManager.getRoom(code);
        if (room?.expiresAt) socket.emit("room-expires-at", room.expiresAt);
    });

    socket.on("join-room", (payload: unknown) => {
        const rawCode = typeof payload === "string" ? payload : (payload as { code?: unknown } | null)?.code;
        const code = cleanText(rawCode, 6)?.toUpperCase();
        if (!code || !/^[A-Z2-9]{6}$/.test(code)) return socket.emit("join-error");
        const rawDevice = typeof payload === "object" && payload ? (payload as { device?: unknown }).device : undefined;
        const device = rawDevice ? sanitizeDevice(socket, rawDevice) : null;
        if (rawDevice && !device) return socket.emit("security-error", "Dispositivo invalido");

        const requestedRoom = RoomManager.getRoom(code);

if (!requestedRoom) {
    roomDevices.delete(code);
    roomItems.delete(code);
    roomMedia.delete(code);
    roomDrawings.delete(code);
}

if (requestedRoom?.purpose === "table") {
    const connectedDevices = roomDevices.get(code);

    if (!connectedDevices || connectedDevices.size === 0) {
        pauseRoomMedia(code);
        RoomManager.resetRoomMembers(code);
    }
}

let restoredExistingDevice = false;
        if (requestedRoom?.purpose === "table" && device) {
            const members = roomDevices.get(code);
            const previousConnection = [...(members?.entries() ?? [])]
                .find(([socketId, member]) => socketId !== socket.id && member.id === device.id);
            if (previousConnection) {
                const [previousSocketId] = previousConnection;
                members?.delete(previousSocketId);
                requestedRoom.members.delete(previousSocketId);
                requestedRoom.members.add(socket.id);
                if (requestedRoom.host === previousSocketId) requestedRoom.host = socket.id;
                requestedRoom.expiresAt = null;
                socket.nsp.sockets.get(previousSocketId)?.leave(code);
                restoredExistingDevice = true;
            }
        }

        if (!restoredExistingDevice && !RoomManager.joinRoom(code, socket.id)) {
            const unavailableRoom = RoomManager.getRoom(code);
            socket.emit(unavailableRoom?.purpose === "transfer" ? "transfer-code-used" : unavailableRoom ? "room-full" : "join-error");
            return;
        }
        socket.join(code);
        socket.data.roomCode = code;
        if (device) {
            socket.data.roomDevice = device;
            const members = roomDevices.get(code) ?? new Map<string, RoomDevice>();
            members.set(socket.id, device);
            roomDevices.set(code, members);
            socket.nsp.to(code).emit("room-devices", [...members.values()]);
        }
        socket.emit("joined-room", code);
        const joinedRoom = RoomManager.getRoom(code);
        if (joinedRoom?.expiresAt) socket.emit("room-expires-at", joinedRoom.expiresAt);
        socket.emit("room-items", [...(roomItems.get(code)?.values() ?? [])]);
        socket.emit("room-media", roomMedia.get(code) ?? null);
        socket.emit("room-drawings", [...(roomDrawings.get(code)?.values() ?? [])]);
        socket.to(code).emit("receiver-connected");
    });

    socket.on("table-item-added", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const owner = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !owner || !allowMutation(socket, "item")) return;
        const items = roomItems.get(room) ?? new Map<string, TableItem>();
        if (items.size >= LIMITS.itemCount) return socket.emit("security-error", "La mesa alcanzo su limite de elementos");
        const item = sanitizeItem(input, owner);
        if (!item || items.has(item.id)) return;
        if (item.parentId && roomItems.get(room)?.get(item.parentId)?.type !== "folder") item.parentId = null;
        items.set(item.id, item);
        roomItems.set(room, items);
        socket.to(room).emit("table-item-added", item);
    });

    socket.on("table-item-moved", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        if (!room || !input || typeof input !== "object" || !allowMutation(socket, "move")) return;
        const value = input as Record<string, unknown>;
        const x = finiteNumber(value.x, -20_000, 20_000);
        const y = finiteNumber(value.y, -20_000, 20_000);
        if (!isSafeId(value.itemId) || x === null || y === null) return;
        const items = roomItems.get(room);
        const saved = items?.get(value.itemId as string);
        if (!saved) return;
        let parentId = isSafeId(value.parentId) ? value.parentId as string : null;
        if (parentId === saved.id || (parentId && items?.get(parentId)?.type !== "folder")) parentId = null;
        const update = { itemId: saved.id, x, y, parentId };
        items?.set(saved.id, { ...saved, x, y, parentId });
        socket.to(room).emit("table-item-moved", update);
    });

    socket.on("table-item-updated", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const owner = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !owner || !input || typeof input !== "object" || !allowMutation(socket, "update")) return;
        const id = (input as { id?: unknown }).id;
        if (!isSafeId(id)) return;
        const previous = roomItems.get(room)?.get(id as string);
        if (!previous) return;
        const item = sanitizeItem({ ...previous, ...(input as object), id: previous.id }, { id: previous.ownerId, name: previous.ownerName, type: owner.type });
        if (!item) return;
        roomItems.get(room)?.set(item.id, item);
        socket.to(room).emit("table-item-updated", item);
    });

    socket.on("drawing-added", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const owner = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !owner || !allowMutation(socket, "drawing-add")) return;

        const drawings = roomDrawings.get(room) ?? new Map<string, DrawingElement>();
        if (drawings.size >= 750) return socket.emit("security-error", "La pizarra alcanzo su limite de elementos");

        const drawing = sanitizeDrawing(input, owner);
        if (!drawing || drawings.has(drawing.id)) return;

        drawings.set(drawing.id, drawing);
        roomDrawings.set(room, drawings);
        socket.nsp.to(room).emit("drawing-added", drawing);
    });

    socket.on("drawing-updated", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const sender = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !sender || !input || typeof input !== "object" || !allowMutation(socket, "drawing-update")) return;

        const value = input as Record<string, unknown>;
        if (!isSafeId(value.id)) return;

        const drawings = roomDrawings.get(room);
        const previous = drawings?.get(value.id as string);
        if (!drawings || !previous || previous.locked) return;

        const drawing = sanitizeDrawing({ ...previous, ...value, id: previous.id, type: previous.type }, sender, previous);
        if (!drawing) return;

        drawings.set(drawing.id, drawing);
        socket.nsp.to(room).emit("drawing-updated", drawing);
    });

    socket.on("drawing-lock", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const sender = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !sender || !input || typeof input !== "object" || !allowMutation(socket, "drawing-lock")) return;

        const value = input as Record<string, unknown>;
        if (!isSafeId(value.id) || typeof value.locked !== "boolean") return;

        const drawings = roomDrawings.get(room);
        const previous = drawings?.get(value.id as string);
        if (!drawings || !previous) return;

        if (!value.locked && previous.lockedBy !== sender.id) {
            socket.emit("drawing-updated", previous);
            return;
        }

        if (value.locked && previous.locked) {
            socket.emit("drawing-updated", previous);
            return;
        }

        const drawing: DrawingElement = {
            ...previous,
            locked: value.locked,
            lockedBy: value.locked ? sender.id : null,
            lockedByName: value.locked ? sender.name : null,
            updatedAt: Date.now(),
        };

        drawings.set(drawing.id, drawing);
        socket.nsp.to(room).emit("drawing-updated", drawing);
    });

    socket.on("drawing-removed", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        if (!room || !input || typeof input !== "object" || !allowMutation(socket, "drawing-remove")) return;

        const id = (input as { id?: unknown }).id;
        if (!isSafeId(id)) return;

        const drawings = roomDrawings.get(room);
        const drawing = drawings?.get(id as string);
        if (!drawings || !drawing || drawing.locked) return;

        drawings.delete(drawing.id);
        socket.nsp.to(room).emit("drawing-removed", { id: drawing.id });
    });

    socket.on("chat-message", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const sender = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !sender || !input || typeof input !== "object" || !allowChat(socket, "chat")) return;
        const value = input as Record<string, unknown>;
        const text = cleanText(value.text, LIMITS.chatLength);
        if (!text) return;
        socket.to(room).emit("chat-message", {
            id: isSafeId(value.id) ? value.id : `${socket.id}:${Date.now()}`,
            senderId: sender.id,
            senderName: sender.name,
            text,
            createdAt: Date.now(),
        });
    });

    socket.on("cancel-transfer", () => {
        const room = socket.data.roomCode as string | undefined;
        if (room) socket.to(room).emit("cancel-transfer");
    });

    socket.on("media-create", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const sender = socket.data.roomDevice as RoomDevice | undefined;
        if (!room || !sender || !input || typeof input !== "object" || !allowMutation(socket, "media")) return;
        const value = input as Record<string, unknown>;
        const x = finiteNumber(value.x, 0, 5020);
        const y = finiteNumber(value.y, 0, 3420);
        const videoId = typeof value.videoId === "string" && /^[\w-]{11}$/.test(value.videoId) ? value.videoId : null;
        if (!isSafeId(value.id) || !videoId || x === null || y === null) return;
        const media: SharedMedia = { id: value.id as string, videoId, x, y, playing: false, currentTime: 0, updatedAt: Date.now(), updatedBy: sender.name };
        roomMedia.set(room, media);
        socket.nsp.to(room).emit("room-media", media);
    });

    socket.on("media-control", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const sender = socket.data.roomDevice as RoomDevice | undefined;
        const previous = room ? roomMedia.get(room) : undefined;
        if (!room || !sender || !previous || !input || typeof input !== "object" || !allowMutation(socket, "media-control")) return;
        const value = input as Record<string, unknown>;
        const currentTime = finiteNumber(value.currentTime, 0, 7 * 24 * 60 * 60);
        if (currentTime === null || typeof value.playing !== "boolean") return;
        const media = { ...previous, playing: value.playing, currentTime, updatedAt: Date.now(), updatedBy: sender.name };
        roomMedia.set(room, media);
        socket.nsp.to(room).emit("room-media", media);
    });

    socket.on("media-moved", (input: unknown) => {
        const room = socket.data.roomCode as string | undefined;
        const previous = room ? roomMedia.get(room) : undefined;
        if (!room || !previous || !input || typeof input !== "object" || !allowMutation(socket, "media-move")) return;
        const value = input as Record<string, unknown>;
        const x = finiteNumber(value.x, 0, 5020);
        const y = finiteNumber(value.y, 0, 3420);
        if (x === null || y === null) return;
        const media = { ...previous, x, y };
        roomMedia.set(room, media);
        socket.nsp.to(room).emit("room-media", media);
    });

    socket.on("media-remove", () => {
        const room = socket.data.roomCode as string | undefined;
        if (!room || !allowMutation(socket, "media-remove")) return;
        roomMedia.delete(room);
        socket.nsp.to(room).emit("room-media", null);
    });

    socket.on("leave-room", () => {
        const code = socket.data.roomCode as string | undefined;
        if (!code) return;
        const members = roomDevices.get(code);
        members?.delete(socket.id);
        if (!members?.size) pauseRoomMedia(code);
        RoomManager.leaveRoom(code, socket.id);
        socket.leave(code);
        socket.data.roomCode = undefined;
        socket.data.roomDevice = undefined;
        socket.to(code).emit("room-devices", [...(members?.values() ?? [])]);
        if (!members?.size && !RoomManager.getRoom(code)) {
            roomDevices.delete(code);
            roomItems.delete(code);
            roomMedia.delete(code);
            roomDrawings.delete(code);
        }
    });

    socket.on("disconnect", () => {
        const code = socket.data.roomCode as string | undefined;
        if (!code) return;
        const members = roomDevices.get(code);
        members?.delete(socket.id);
        if (!members?.size) pauseRoomMedia(code);
        RoomManager.leaveRoom(code, socket.id);
        socket.to(code).emit("room-devices", [...(members?.values() ?? [])]);
        if (!members?.size && !RoomManager.getRoom(code)) {
            roomDevices.delete(code);
            roomItems.delete(code);
            roomMedia.delete(code);
            roomDrawings.delete(code);
        }
    });
}
