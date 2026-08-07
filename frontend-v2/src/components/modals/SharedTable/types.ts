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

export type ActivityItem = {
    id: string;
    text: string;
    createdAt: number;
};

export type TransferPhase =
    | "idle"
    | "searching"
    | "connecting"
    | "receiving"
    | "verifying"
    | "complete";

export type SharedMedia = {
    id: string;
    videoId: string;
    x: number;
    y: number;
    playing: boolean;
    currentTime: number;
    updatedAt: number;
    updatedBy: string;
    instanceId?: number;
};

export type ChatMessage = {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: number;
};

export type DrawingKind =
    | "pencil"
    | "line"
    | "rectangle"
    | "ellipse"
    | "text";

export type DrawingTool =
    | "select"
    | DrawingKind
    | "eraser";

export type DrawingPoint = {
    x: number;
    y: number;
};

export type DrawingFontFamily =
    | "Arial"
    | "Georgia"
    | "Trebuchet MS"
    | "Times New Roman"
    | "Courier New";

export type DrawingElement = {
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

export type DrawingDraft = Omit<
    DrawingElement,
    | "id"
    | "ownerId"
    | "ownerName"
    | "locked"
    | "lockedBy"
    | "lockedByName"
    | "createdAt"
    | "updatedAt"
>;

export type DrawingUpdate = Partial<
    Pick<
        DrawingElement,
        | "x"
        | "y"
        | "width"
        | "height"
        | "points"
        | "stroke"
        | "fill"
        | "strokeWidth"
        | "text"
        | "fontFamily"
        | "fontSize"
    >
> & {
    id: string;
};
