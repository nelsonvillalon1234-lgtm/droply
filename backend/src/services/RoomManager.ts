type Room = {
    id: string;
    host: string;
    guest?: string;
};

class RoomManager {

    private rooms = new Map<string, Room>();

    generateCode(): string {

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        do {

            code = "";

            for (let i = 0; i < 6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }

        } while (this.rooms.has(code));

        return code;
    }

    createRoom(hostSocketId: string) {

        const code = this.generateCode();

        this.rooms.set(code, {
            id: code,
            host: hostSocketId
        });

        return code;
    }

    joinRoom(code: string, guestSocketId: string) {

        const room = this.rooms.get(code);

        if (!room) return false;

        room.guest = guestSocketId;

        return true;
    }

    getRoom(code: string) {
        return this.rooms.get(code);
    }

}

export default new RoomManager();