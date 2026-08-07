import { useEffect, useMemo, useRef, useState } from "react";

import {
    Check,
    Circle,
    Eraser,
    Lock,
    Minus,
    MousePointer2,
    Pencil,
    Square,
    Trash2,
    Type,
    Unlock,
    X,
} from "lucide-react";

import type {
    DrawingDraft,
    DrawingElement,
    DrawingFontFamily,
    DrawingPoint,
    DrawingTool,
    DrawingUpdate,
} from "../types";

import "../styles/drawingBoard.css";

const WORLD_WIDTH = 5200;
const WORLD_HEIGHT = 3600;
const TRANSPARENT = "transparent";
const MIN_SIZE = 12;
const MAX_PENCIL_POINTS = 1500;

const FONT_OPTIONS: DrawingFontFamily[] = [
    "Arial",
    "Georgia",
    "Trebuchet MS",
    "Times New Roman",
    "Courier New",
];

type ResizeHandle = "nw" | "ne" | "sw" | "se";

type Interaction = {
    mode: "move" | "resize";
    pointerId: number;
    start: DrawingPoint;
    original: DrawingElement;
    handle?: ResizeHandle;
};

type DraftState = {
    type: Exclude<DrawingTool, "select" | "eraser" | "text">;
    start: DrawingPoint;
    current: DrawingPoint;
    points: DrawingPoint[];
};

type TextEditorState = {
    x: number;
    y: number;
    value: string;
};

type DrawingBoardProps = {
    drawings: DrawingElement[];
    active: boolean;
    tool: DrawingTool;
    stroke: string;
    fill: string;
    strokeWidth: number;
    fontFamily: DrawingFontFamily;
    fontSize: number;
    scale: number;
    selectedId: string | null;

    onSelect: (drawingId: string | null) => void;
    onCreate: (drawing: DrawingDraft) => void;
    onUpdate: (drawing: DrawingUpdate) => void;
    onDelete: (drawingId: string) => void;
};

type DrawingToolbarProps = {
    
    tool: DrawingTool;
    stroke: string;
    fill: string;
    strokeWidth: number;
    fontFamily: DrawingFontFamily;
    fontSize: number;
    selected: DrawingElement | null;
    currentUserId: string;


    onToolChange: (tool: DrawingTool) => void;
    onStrokeChange: (color: string) => void;
    onFillChange: (color: string) => void;
    onStrokeWidthChange: (width: number) => void;
    onFontFamilyChange: (font: DrawingFontFamily) => void;
    onFontSizeChange: (size: number) => void;
    onToggleLock: (drawing: DrawingElement) => void;
    onDeleteSelected: (drawing: DrawingElement) => void;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number, scale: number): DrawingPoint {
    const rect = svg.getBoundingClientRect();
    return {
        x: clamp((clientX - rect.left) / scale, 0, WORLD_WIDTH),
        y: clamp((clientY - rect.top) / scale, 0, WORLD_HEIGHT),
    };
}

function boundsFromPoints(points: DrawingPoint[]) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

function normalizePoints(points: DrawingPoint[], bounds: { x: number; y: number; width: number; height: number }) {
    return points.map(point => ({
        x: clamp((point.x - bounds.x) / bounds.width, 0, 1),
        y: clamp((point.y - bounds.y) / bounds.height, 0, 1),
    }));
}

function shapePoints(drawing: DrawingElement) {
    return (drawing.points ?? []).map(point => ({
        x: point.x * drawing.width,
        y: point.y * drawing.height,
    }));
}

function DrawingShape({ drawing, preview = false }: { drawing: DrawingElement; preview?: boolean }) {
    const common = {
        stroke: drawing.stroke,
        strokeWidth: drawing.strokeWidth,
        fill: drawing.fill,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        opacity: preview ? 0.78 : 1,
        vectorEffect: "non-scaling-stroke" as const,
        className: "drawing-shape",
    };

    const points = shapePoints(drawing);

    if (drawing.type === "pencil") {
        return (
            <polyline
                {...common}
                fill="none"
                points={points.map(point => `${point.x},${point.y}`).join(" ")}
            />
        );
    }

    if (drawing.type === "line") {
        const [start = { x: 0, y: 0 }, end = { x: drawing.width, y: drawing.height }] = points;
        return (
            <line
                {...common}
                fill="none"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
            />
        );
    }

    if (drawing.type === "rectangle") {
        return (
            <rect
                {...common}
                width={drawing.width}
                height={drawing.height}
                rx={Math.min(10, drawing.width / 4, drawing.height / 4)}
            />
        );
    }

    if (drawing.type === "ellipse") {
        return (
            <ellipse
                {...common}
                cx={drawing.width / 2}
                cy={drawing.height / 2}
                rx={drawing.width / 2}
                ry={drawing.height / 2}
            />
        );
    }

    const fontSize = drawing.fontSize ?? 28;

    return (
        <text
            x={0}
            y={fontSize}
            fill={drawing.stroke}
            stroke="none"
            fontSize={fontSize}
            fontFamily={drawing.fontFamily ?? "Arial"}
            fontWeight={600}
            className="drawing-text"
        >
            {drawing.text}
        </text>
    );
}

function DraftShape({ draft, stroke, fill, strokeWidth }: {
    draft: DraftState;
    stroke: string;
    fill: string;
    strokeWidth: number;
}) {
    const common = {
        stroke,
        strokeWidth,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        vectorEffect: "non-scaling-stroke" as const,
        opacity: 0.72,
    };

    if (draft.type === "pencil") {
        return (
            <polyline
                {...common}
                fill="none"
                points={draft.points.map(point => `${point.x},${point.y}`).join(" ")}
            />
        );
    }

    if (draft.type === "line") {
        return (
            <line
                {...common}
                fill="none"
                x1={draft.start.x}
                y1={draft.start.y}
                x2={draft.current.x}
                y2={draft.current.y}
            />
        );
    }

    const x = Math.min(draft.start.x, draft.current.x);
    const y = Math.min(draft.start.y, draft.current.y);
    const width = Math.abs(draft.current.x - draft.start.x);
    const height = Math.abs(draft.current.y - draft.start.y);

    if (draft.type === "rectangle") {
        return <rect {...common} x={x} y={y} width={width} height={height} fill={fill} rx={8} />;
    }

    return (
        <ellipse
            {...common}
            cx={x + width / 2}
            cy={y + height / 2}
            rx={width / 2}
            ry={height / 2}
            fill={fill}
        />
    );
}

function resizeDrawing(original: DrawingElement, point: DrawingPoint, handle: ResizeHandle) {
    let left = original.x;
    let top = original.y;
    let right = original.x + original.width;
    let bottom = original.y + original.height;

    if (handle.includes("w")) left = clamp(point.x, 0, right - MIN_SIZE);
    if (handle.includes("e")) right = clamp(point.x, left + MIN_SIZE, WORLD_WIDTH);
    if (handle.includes("n")) top = clamp(point.y, 0, bottom - MIN_SIZE);
    if (handle.includes("s")) bottom = clamp(point.y, top + MIN_SIZE, WORLD_HEIGHT);

    const height = bottom - top;
    const next: DrawingElement = {
        ...original,
        x: left,
        y: top,
        width: right - left,
        height,
    };

    if (original.type === "text") {
        const ratio = height / Math.max(1, original.height);
        next.fontSize = clamp(Math.round((original.fontSize ?? 28) * ratio), 12, 180);
    }

    return next;
}

export function DrawingToolbar({
    
    tool,
    stroke,
    fill,
    strokeWidth,
    fontFamily,
    fontSize,
    selected,
    currentUserId,
    onToolChange,
    onStrokeChange,
    onFillChange,
    onStrokeWidthChange,
    onFontFamilyChange,
    onFontSizeChange,
    onToggleLock,
    onDeleteSelected,
}: DrawingToolbarProps) {
    const tools = useMemo<Array<{ value: DrawingTool; label: string; icon: React.ReactNode }>>(
        () => [
            { value: "select", label: "Seleccionar", icon: <MousePointer2 size={17} /> },
            { value: "pencil", label: "Lápiz", icon: <Pencil size={17} /> },
            { value: "line", label: "Línea", icon: <Minus size={18} /> },
            { value: "rectangle", label: "Rectángulo", icon: <Square size={17} /> },
            { value: "ellipse", label: "Círculo", icon: <Circle size={17} /> },
            { value: "text", label: "Texto", icon: <Type size={17} /> },
            { value: "eraser", label: "Borrador", icon: <Eraser size={17} /> },
        ],
        [],
    );

    

    const selectedLockedByOther = Boolean(
        selected?.locked && selected.lockedBy && selected.lockedBy !== currentUserId,
    );
    const showTextControls = tool === "text" || selected?.type === "text";

    return (
        <div
            className="drawing-toolbar"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
        >
            <div className="drawing-toolbar-scroll">
                <div className="drawing-toolbar-tools">
                    {tools.map(entry => (
                        <button
                            key={entry.value}
                            type="button"
                            className={tool === entry.value ? "is-active" : ""}
                            title={entry.label}
                            aria-label={entry.label}
                            onClick={() => onToolChange(entry.value)}
                        >
                            {entry.icon}
                        </button>
                    ))}
                </div>

                <span className="drawing-toolbar-separator" />

                <label className="drawing-color-control" title="Color del trazo">
                    <span style={{ background: stroke }} />
                    <input
                        type="color"
                        value={stroke}
                        onChange={event => onStrokeChange(event.target.value)}
                    />
                </label>

                <label className="drawing-color-control drawing-fill-control" title="Color de relleno">
                    <span
                        style={{
                            background:
                                fill === TRANSPARENT
                                    ? "conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0) 0 / 8px 8px"
                                    : fill,
                        }}
                    />
                    <input
                        type="color"
                        value={fill === TRANSPARENT ? "#ffffff" : fill}
                        onChange={event => onFillChange(event.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className={`drawing-transparent-button ${fill === TRANSPARENT ? "is-active" : ""}`}
                    title="Sin relleno"
                    onClick={() => onFillChange(TRANSPARENT)}
                >
                    Sin relleno
                </button>

                <label className="drawing-width-control" title="Grosor del trazo">
                    <input
                        type="range"
                        min="1"
                        max="14"
                        step="1"
                        value={strokeWidth}
                        onChange={event => onStrokeWidthChange(Number(event.target.value))}
                    />
                    <strong>{strokeWidth}</strong>
                </label>

                {showTextControls && (
                    <>
                        <span className="drawing-toolbar-separator" />
                        <select
                            className="drawing-font-select"
                            value={fontFamily}
                            aria-label="Tipografía"
                            onChange={event => onFontFamilyChange(event.target.value as DrawingFontFamily)}
                        >
                            {FONT_OPTIONS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                </option>
                            ))}
                        </select>
                        <label className="drawing-font-size" title="Tamaño del texto">
                            <input
                                type="number"
                                min="12"
                                max="180"
                                value={fontSize}
                                onChange={event => onFontSizeChange(clamp(Number(event.target.value) || 12, 12, 180))}
                            />
                            <span>px</span>
                        </label>
                    </>
                )}

                {selected && (
                    <>
                        <span className="drawing-toolbar-separator" />
                        <button
                            type="button"
                            className={`drawing-lock-button ${selected.locked ? "is-locked" : ""}`}
                            title={
                                selectedLockedByOther
                                    ? `Bloqueado por ${selected.lockedByName ?? "otra persona"}`
                                    : selected.locked
                                      ? "Desbloquear elemento"
                                      : "Bloquear elemento"
                            }
                            disabled={selectedLockedByOther}
                            onClick={() => onToggleLock(selected)}
                        >
                            {selected.locked ? <Lock size={17} /> : <Unlock size={17} />}
                        </button>
                        <button
                            type="button"
                            className="drawing-delete-button"
                            title={selected.locked ? "Desbloquea el elemento para eliminarlo" : "Eliminar elemento"}
                            disabled={selected.locked}
                            onClick={() => onDeleteSelected(selected)}
                        >
                            <Trash2 size={17} />
                        </button>
                    </>
                )}
            </div>

            
        </div>
    );
}

export default function DrawingBoard({
    drawings,
    active,
    tool,
    stroke,
    fill,
    strokeWidth,
    fontFamily,
    fontSize,
    scale,
    selectedId,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
}: DrawingBoardProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const interactionRef = useRef<Interaction | null>(null);

    const [draft, setDraft] =
        useState<DraftState | null>(null);

    const [preview, setPreview] =
        useState<DrawingElement | null>(null);

    const textInputRef =
        useRef<HTMLInputElement>(null);

    const [textEditor, setTextEditor] =
        useState<TextEditorState | null>(null);

    const selected =
        drawings.find(
            drawing => drawing.id === selectedId,
        ) ?? null;

    useEffect(() => {
        if (selectedId && !drawings.some(drawing => drawing.id === selectedId)) {
            onSelect(null);
        }
    }, [drawings, onSelect, selectedId]);

    useEffect(() => {
    setDraft(null);
    setPreview(null);
    interactionRef.current = null;

    if (!active || tool !== "text") {
        setTextEditor(null);
    }
}, [active, tool]);

    useEffect(() => {
    if (!textEditor) {
        return;
    }

    const frame = window.requestAnimationFrame(() => {
        textInputRef.current?.focus();
    });

    return () => {
        window.cancelAnimationFrame(frame);
    };
}, [textEditor]);

useEffect(() => {
    if (!active || tool !== "select" || !selected) {
        return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;

        if (
            target?.matches(
                "input, textarea, select, [contenteditable='true']",
            )
        ) {
            return;
        }

        if (event.key === "Escape") {
            onSelect(null);
            return;
        }

        if (
            (event.key === "Delete" ||
                event.key === "Backspace") &&
            !selected.locked
        ) {
            event.preventDefault();
            onDelete(selected.id);
            onSelect(null);
        }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
        window.removeEventListener(
            "keydown",
            handleKeyDown,
        );
    };
}, [
    active,
    onDelete,
    onSelect,
    selected,
    tool,
]);

    function pointFromEvent(event: React.PointerEvent<SVGElement>) {
        if (!svgRef.current) return null;
        return getSvgPoint(svgRef.current, event.clientX, event.clientY, scale);
    }
    function captureDrawingPointer(pointerId: number) {
    const svg = svgRef.current;

    if (!svg || !svg.isConnected) {
        return;
    }

    try {
        svg.setPointerCapture(pointerId);
    } catch {
        // Algunos navegadores pueden rechazar la captura sobre SVG.
        // El elemento seguirá pudiendo seleccionarse sin cerrar la aplicación.
    }
}

function releaseDrawingPointer(pointerId: number) {
    const svg = svgRef.current;

    if (!svg || !svg.isConnected) {
        return;
    }

    try {
        if (svg.hasPointerCapture(pointerId)) {
            svg.releasePointerCapture(pointerId);
        }
    } catch {
        // Evita que un fallo del navegador deje la pantalla en blanco.
    }
}

    function confirmTextEditor() {
    if (!textEditor) return;

    const cleanText = textEditor.value
        .trim()
        .slice(0, 300);

    if (!cleanText) {
        setTextEditor(null);
        return;
    }

    const width = clamp(
        cleanText.length * fontSize * 0.62,
        50,
        1200,
    );

    const height = Math.max(
        MIN_SIZE,
        fontSize * 1.35,
    );

    onCreate({
        type: "text",
        x: clamp(
            textEditor.x,
            0,
            WORLD_WIDTH - width,
        ),
        y: clamp(
            textEditor.y,
            0,
            WORLD_HEIGHT - height,
        ),
        width,
        height,
        stroke,
        fill: TRANSPARENT,
        strokeWidth,
        text: cleanText,
        fontFamily,
        fontSize,
    });

    setTextEditor(null);
    onSelect(null);
}

function cancelTextEditor() {
    setTextEditor(null);
}

    function beginCanvasAction(
    event: React.PointerEvent<SVGSVGElement>,
) {
    if (!active || event.button !== 0) {
        return;
    }

    const target = event.target as SVGElement;

    if (
        target.closest("[data-drawing-id]") ||
        target.closest("[data-resize-handle]")
    ) {
        return;
    }

    /*
     * Con la herramienta seleccionar, el evento debe seguir
     * hasta Workspace para poder mover la mesa con clic izquierdo.
     */
    if (tool === "select") {
        onSelect(null);
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (tool === "eraser") {
        onSelect(null);
        return;
    }

    const point = pointFromEvent(event);

    if (!point) {
        return;
    }

    if (tool === "text") {
        setTextEditor({
            x: point.x,
            y: point.y,
            value: "",
        });

        onSelect(null);
        return;
    }

    event.currentTarget.setPointerCapture(
        event.pointerId,
    );

    setDraft({
        type: tool,
        start: point,
        current: point,
        points: [point],
    });
}

    function beginElementAction(
    event: React.PointerEvent<SVGGElement>,
    drawing: DrawingElement,
) {
    if (!active || event.button !== 0) {
        return;
    }

    if (tool !== "select" && tool !== "eraser") {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    onSelect(drawing.id);

    if (tool === "eraser") {
        if (!drawing.locked) {
            onDelete(drawing.id);
        }

        return;
    }

    if (drawing.locked) {
        return;
    }

    const point = pointFromEvent(event);

    if (!point) {
        return;
    }

    interactionRef.current = {
        mode: "move",
        pointerId: event.pointerId,
        start: point,
        original: {
            ...drawing,
            x: Number.isFinite(drawing.x) ? drawing.x : 0,
            y: Number.isFinite(drawing.y) ? drawing.y : 0,
            width:
                Number.isFinite(drawing.width) &&
                drawing.width > 0
                    ? drawing.width
                    : MIN_SIZE,
            height:
                Number.isFinite(drawing.height) &&
                drawing.height > 0
                    ? drawing.height
                    : MIN_SIZE,
        },
    };

    setPreview(interactionRef.current.original);
    captureDrawingPointer(event.pointerId);
}

    function beginResize(
    event: React.PointerEvent<SVGCircleElement>,
    drawing: DrawingElement,
    handle: ResizeHandle,
) {
    if (
        !active ||
        tool !== "select" ||
        drawing.locked ||
        event.button !== 0
    ) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const point = pointFromEvent(event);

    if (!point) {
        return;
    }

    const safeDrawing: DrawingElement = {
        ...drawing,
        x: Number.isFinite(drawing.x) ? drawing.x : 0,
        y: Number.isFinite(drawing.y) ? drawing.y : 0,
        width:
            Number.isFinite(drawing.width) &&
            drawing.width > 0
                ? drawing.width
                : MIN_SIZE,
        height:
            Number.isFinite(drawing.height) &&
            drawing.height > 0
                ? drawing.height
                : MIN_SIZE,
    };

    interactionRef.current = {
        mode: "resize",
        pointerId: event.pointerId,
        start: point,
        original: safeDrawing,
        handle,
    };

    setPreview(safeDrawing);
    captureDrawingPointer(event.pointerId);
}

    function continueAction(event: React.PointerEvent<SVGSVGElement>) {
        const point = pointFromEvent(event);
        if (!point) return;

        if (draft && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.preventDefault();
            event.stopPropagation();

            if (draft.type === "pencil") {
                const last = draft.points[draft.points.length - 1];
                if (draft.points.length >= MAX_PENCIL_POINTS || Math.hypot(point.x - last.x, point.y - last.y) < 3) {
                    return;
                }
                setDraft(current => current ? { ...current, current: point, points: [...current.points, point] } : null);
            } else {
                setDraft(current => current ? { ...current, current: point } : null);
            }
            return;
        }

        const interaction = interactionRef.current;
        if (!interaction || interaction.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        if (interaction.mode === "move") {
            const dx = point.x - interaction.start.x;
            const dy = point.y - interaction.start.y;
            setPreview({
                ...interaction.original,
                x: clamp(interaction.original.x + dx, 0, WORLD_WIDTH - interaction.original.width),
                y: clamp(interaction.original.y + dy, 0, WORLD_HEIGHT - interaction.original.height),
            });
            return;
        }

        setPreview(resizeDrawing(interaction.original, point, interaction.handle ?? "se"));
    }

    function finishAction(event: React.PointerEvent<SVGSVGElement>) {
        releaseDrawingPointer(event.pointerId);

        if (draft) {
            event.preventDefault();
            event.stopPropagation();

            if (draft.type === "pencil" && draft.points.length > 1) {
                const bounds = boundsFromPoints(draft.points);
                onCreate({
                    type: "pencil",
                    ...bounds,
                    points: normalizePoints(draft.points, bounds),
                    stroke,
                    fill: TRANSPARENT,
                    strokeWidth,
                });
            } else if (draft.type === "line") {
                const points = [draft.start, draft.current];
                const bounds = boundsFromPoints(points);
                if (Math.hypot(draft.current.x - draft.start.x, draft.current.y - draft.start.y) >= 5) {
                    onCreate({
                        type: "line",
                        ...bounds,
                        points: normalizePoints(points, bounds),
                        stroke,
                        fill: TRANSPARENT,
                        strokeWidth,
                    });
                }
            } else {
                const x = Math.min(draft.start.x, draft.current.x);
                const y = Math.min(draft.start.y, draft.current.y);
                const width = Math.abs(draft.current.x - draft.start.x);
                const height = Math.abs(draft.current.y - draft.start.y);

                if (width >= 5 && height >= 5) {
                    onCreate({
                        type: draft.type,
                        x,
                        y,
                        width,
                        height,
                        stroke,
                        fill,
                        strokeWidth,
                    });
                }
            }

            setDraft(null);
            return;
        }

        const interaction = interactionRef.current;
        if (!interaction || interaction.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        if (preview) {
            onUpdate({
                id: preview.id,
                x: preview.x,
                y: preview.y,
                width: preview.width,
                height: preview.height,
                fontSize: preview.fontSize,
            });
        }

        interactionRef.current = null;
        setPreview(null);
    }

    const renderDrawings = drawings.map(drawing =>
        preview?.id === drawing.id ? preview : drawing,
    );

    return (
        <svg
            ref={svgRef}
            className={`drawing-board ${active ? "is-active" : ""} is-tool-${tool}`}
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            onPointerDown={beginCanvasAction}
            onPointerMove={continueAction}
            onPointerUp={finishAction}
            onPointerCancel={finishAction}
        >
            {textEditor && (
    <foreignObject
        className="drawing-text-editor-object"
        x={textEditor.x}
        y={textEditor.y}
        width={Math.min(
            440,
            Math.max(
                220,
                WORLD_WIDTH - textEditor.x - 12,
            ),
        )}
        height={Math.max(58, fontSize * 1.8)}
    >
        <form
            className="drawing-inline-editor"
            onSubmit={event => {
                event.preventDefault();
                confirmTextEditor();
            }}
            onPointerDown={event =>
                event.stopPropagation()
            }
            onClick={event =>
                event.stopPropagation()
            }
        >
            <input
                ref={textInputRef}
                type="text"
                value={textEditor.value}
                placeholder="Escribe directamente aquí…"
                maxLength={300}
                style={{
                    fontFamily,
                    fontSize,
                    color: stroke,
                }}
                onChange={event =>
                    setTextEditor(current =>
                        current
                            ? {
                                  ...current,
                                  value: event.target.value,
                              }
                            : null,
                    )
                }
                onKeyDown={event => {
                    event.stopPropagation();

                    if (event.key === "Escape") {
                        event.preventDefault();
                        cancelTextEditor();
                    }
                }}
            />

            <button
                type="submit"
                className="drawing-text-confirm"
                title="Crear texto"
            >
                <Check size={17} />
            </button>

            <button
                type="button"
                className="drawing-text-cancel"
                title="Cancelar"
                onClick={cancelTextEditor}
            >
                <X size={17} />
            </button>
        </form>
    </foreignObject>
)}

            {renderDrawings.map(drawing => {
                const interactive = active && (tool === "select" || tool === "eraser");
                const isSelected = selectedId === drawing.id;

                return (
                    <g
                        key={drawing.id}
                        data-drawing-id={drawing.id}
                        transform={`translate(${drawing.x} ${drawing.y})`}
                        className={`${isSelected ? "is-selected" : ""} ${drawing.locked ? "is-locked" : ""}`}
                        style={{ pointerEvents: interactive ? "visiblePainted" : "none" }}
                        onPointerDown={event => beginElementAction(event, drawing)}
                    >
                        <DrawingShape drawing={drawing} preview={preview?.id === drawing.id} />

                        {isSelected && active && tool === "select" && (
                            <>
                                <rect
                                    className="drawing-selection-box"
                                    x={-5 / scale}
                                    y={-5 / scale}
                                    width={drawing.width + 10 / scale}
                                    height={drawing.height + 10 / scale}
                                    rx={4 / scale}
                                    vectorEffect="non-scaling-stroke"
                                />

                                {!drawing.locked && ([
                                    ["nw", 0, 0],
                                    ["ne", drawing.width, 0],
                                    ["sw", 0, drawing.height],
                                    ["se", drawing.width, drawing.height],
                                ] as Array<[ResizeHandle, number, number]>).map(([handle, cx, cy]) => (
                                    <circle
                                        key={handle}
                                        data-resize-handle={handle}
                                        className="drawing-resize-handle"
                                        cx={cx}
                                        cy={cy}
                                        r={7 / scale}
                                        vectorEffect="non-scaling-stroke"
                                        onPointerDown={event => beginResize(event, drawing, handle)}
                                    />
                                ))}

                                {drawing.locked && (
                                    <g className="drawing-lock-badge" transform={`translate(${drawing.width / 2} ${-18 / scale})`}>
                                        <circle r={11 / scale} />
                                        <path
                                            d={`M ${-4 / scale} ${-1 / scale} h ${8 / scale} v ${7 / scale} h ${-8 / scale} z M ${-2.8 / scale} ${-1 / scale} v ${-2.5 / scale} a ${2.8 / scale} ${2.8 / scale} 0 0 1 ${5.6 / scale} 0 v ${2.5 / scale}`}
                                        />
                                    </g>
                                )}
                            </>
                        )}
                    </g>
                );
            })}

            {draft && (
                <DraftShape
                    draft={draft}
                    stroke={stroke}
                    fill={draft.type === "pencil" || draft.type === "line" ? TRANSPARENT : fill}
                    strokeWidth={strokeWidth}
                />
            )}
        </svg>
    );
}
