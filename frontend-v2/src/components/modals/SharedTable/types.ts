export type DeviceType = {
    id: string;
    name: string;
    type: "pc" | "phone" | "tablet" | "laptop";
};

export type TableItem = {
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

export type ActivityItem = { id: string; text: string; createdAt: number };
export type TransferPhase = "idle" | "searching" | "connecting" | "receiving" | "verifying" | "complete";

export type SharedMedia = {
    id: string;
    videoId: string;
    x: number;
    y: number;
    playing: boolean;
    currentTime: number;
    updatedAt: number;
    updatedBy: string;
};

export type ChatMessage = {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: number;
};
