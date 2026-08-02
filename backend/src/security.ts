import type { Socket } from "socket.io";

export const LIMITS = {
    chatLength: 2_000,
    deviceIdLength: 128,
    deviceNameLength: 60,
    fileNameLength: 255,
    itemCount: 2_000,
    noteNameLength: 10_000,
    payloadBytes: 1_000_000,
} as const;

export function cleanText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return null;
    const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if (!normalized || normalized.length > maxLength) return null;
    return normalized;
}

export function finiteNumber(value: unknown, min: number, max: number) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.min(max, Math.max(min, value))
        : null;
}

export function isSafeId(value: unknown) {
    return typeof value === "string" && /^[A-Za-z0-9:_-]{1,128}$/.test(value);
}

export function isRoomMember(socket: Socket, requestedRoom?: unknown) {
    const currentRoom = socket.data.roomCode as string | undefined;
    return Boolean(currentRoom && (!requestedRoom || requestedRoom === currentRoom));
}

export function createRateLimiter(limit: number, windowMs: number) {
    const hits = new Map<string, { count: number; resetAt: number }>();
    return (socket: Socket, action: string) => {
        const now = Date.now();
        const key = `${socket.id}:${action}`;
        const state = hits.get(key);
        if (!state || now >= state.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return true;
        }
        if (state.count >= limit) return false;
        state.count += 1;
        return true;
    };
}

