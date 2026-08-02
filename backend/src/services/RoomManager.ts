type Room = {
    id: string;
    host: string;
    members: Set<string>;
    purpose: "transfer" | "table";
    maxMembers: number;
    expiresAt: number | null;
    locked: boolean;
};
import { randomInt } from "node:crypto";

const TABLE_RETENTION_MS = 24 * 60 * 60 * 1000;

class RoomManager {

    private rooms = new Map<string, Room>();

    generateCode(): string {

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        do {

            code = "";

            for (let i = 0; i < 6; i++) {
                code += chars[randomInt(chars.length)];
            }

        } while (this.rooms.has(code));

        return code;
    }

    createRoom(hostSocketId: string, purpose: "transfer" | "table" = "table") {

        const code = this.generateCode();

        this.rooms.set(code, {
            id: code,
            host: hostSocketId,
            members: new Set([hostSocketId]),
            purpose,
            maxMembers: purpose === "transfer" ? 2 : 4,
            expiresAt: purpose === "transfer" ? Date.now() + 5 * 60_000 : null,
            locked: false,
        });

        return code;
    }

    joinRoom(code: string, guestSocketId: string) {

        const room = this.getRoom(code);

        if (!room) return false;

        if (room.locked || room.members.size >= room.maxMembers) return false;
        room.members.add(guestSocketId);
        if (room.purpose === "table") room.expiresAt = null;
        if (room.purpose === "transfer") room.locked = true;

        return true;
    }

    getRoom(code: string) {
        const room = this.rooms.get(code);
        if (room?.expiresAt && Date.now() >= room.expiresAt) {
            this.rooms.delete(code);
            return undefined;
        }
        return room;
    }

    pruneExpiredRooms(now = Date.now()) {
        const expired: string[] = [];
        for (const [code, room] of this.rooms) {
            if (room.expiresAt && now >= room.expiresAt) {
                this.rooms.delete(code);
                expired.push(code);
            }
        }
        return expired;
    }

    leaveRoom(code: string, socketId: string) {
        const room = this.rooms.get(code);
        if (!room) return;
        room.members.delete(socketId);
        if (room.members.size !== 0) return;
        if (room.purpose === "table") {
            room.expiresAt = Date.now() + TABLE_RETENTION_MS;
            return;
        }
        this.rooms.delete(code);
    }

}

export default new RoomManager();
