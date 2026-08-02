import { useRef, useState } from "react";

import socket from "../../../../services/socket";

import type {

    DeviceType,

    TableItem,

} from "../types";

export default function useSharedTable() {

    const [hasRoom, setHasRoom] = useState(false);

    const [creatingRoom, setCreatingRoom] = useState(false);

    const [roomCode, setRoomCode] = useState("");

    const [devices, setDevices] = useState<DeviceType[]>([
        {
            id: crypto.randomUUID(),
            name: "Mi PC",
            type: "pc",
        },
    ]);

    const [items, setItems] = useState<TableItem[]>([]);

    const files = useRef(new Map<string, File>());

    function createRoom() {

        if (creatingRoom) return;

        setCreatingRoom(true);

        socket.emit("create-room");

    }

    function addItem(
        file: File,
        x: number,
        y: number
    ) {

        const item: TableItem = {

            id: crypto.randomUUID(),

            ownerId: "local",
            ownerName: "Mi PC",

            type: "file",

            name: file.name,

            size: file.size,

            extension: file.name.split(".").pop() ?? "",

            x,

            y,

            available: true,

        };

        files.current.set(item.id, file);

        socket.emit("table-item-added", item);

        setItems(current => [

            ...current,

            item,

        ]);

    }

    return {

        hasRoom,

        setHasRoom,

        creatingRoom,

        setCreatingRoom,

        roomCode,

        setRoomCode,

        devices,

        setDevices,

        items,

        setItems,

        files,

        createRoom,

        addItem,

    };

}
