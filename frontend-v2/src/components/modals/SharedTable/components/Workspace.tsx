import { useEffect, useRef, useState } from "react";
import {
    Activity, ExternalLink, FilePlus2, FileText, Files, Folder, FolderDown, FolderPlus, LogOut,
    Map, MessageCircle, Minus, Plus, RotateCcw, Search, Send, StickyNote, Trash2, Undo2, Upload, Users, X
} from "lucide-react";
import "./../styles/workspace.css";
import CenterAction from "./CenterAction";
import type { RecentRoom } from "./CenterAction";
import RoomPanel from "./RoomPanel";
import Device from "./Device";
import TableItem from "./TableItem";
import SharedYouTube from "./SharedYouTube";
import type { ActivityItem, ChatMessage, DeviceType, SharedMedia, TableItem as TableItemType, TransferPhase } from "../types";
import deviceId from "../../../../services/device";

type Props = {
    hasRoom: boolean; creatingRoom: boolean; roomCode: string; devices: DeviceType[];
    items: TableItemType[]; showMenu: boolean; downloadItemId: string | null;
    downloadProgress: number; downloadComplete: boolean; downloadPhase: TransferPhase; messages: ChatMessage[];
    onCancelDownload: () => void;
    onMoveItem: (item: TableItemType, x: number, y: number, parentId?: string | null) => void;
    onCreateRoom: () => void; onJoinRoom: (code: string) => void; onAddFile: (file: File, x: number, y: number, parentId?: string | null) => void;
    onDownload: (item: TableItemType) => void; onSendMessage: (text: string) => void;
    onRelinkFile: (item: TableItemType, file: File) => void;
    onCreateWorkspaceItem: (type: "folder" | "note", name: string, x: number, y: number, content?: string, parentId?: string | null) => void;
    activity: ActivityItem[]; canUndo: boolean; onUndo: () => void;
    onRenameItem: (item: TableItemType, name: string) => void;
    onDeleteItem: (item: TableItemType) => void;
    onRestoreItem: (item: TableItemType) => void;
    onDisconnect: () => void;
    recentRooms: RecentRoom[];
    sharedMedia: SharedMedia | null;
    onCreateMedia: (url: string, x: number, y: number) => void;
    onMediaControl: (playing: boolean, currentTime: number) => void;
    onMediaMove: (x: number, y: number) => void;
    onMediaRemove: () => void;
    canChooseDownloadFolder: boolean;
    downloadFolderName: string | null;
    showDownloadFolderPrompt: boolean;
    onChooseDownloadFolder: () => void;
    onDismissDownloadFolder: () => void;
};

type Camera = { x: number; y: number; zoom: number };
type ContextMenu = { clientX: number; clientY: number; x: number; y: number } | null;
type Creator = { type: "folder" | "note" | "youtube"; clientX: number; clientY: number; x: number; y: number } | null;
const WORLD_WIDTH = 5200;
const WORLD_HEIGHT = 3600;
const ITEM_MAX_X = WORLD_WIDTH - 180;
const ITEM_MAX_Y = WORLD_HEIGHT - 180;
const MINIMAP_WIDTH = 190;
const MINIMAP_HEIGHT = 132;

export default function Workspace(props: Props) {
    const { hasRoom, creatingRoom, roomCode, showMenu, devices, items, downloadItemId,
        downloadProgress, downloadComplete, downloadPhase, messages, onCreateRoom, onJoinRoom, onAddFile, onDownload, onRelinkFile,
        onMoveItem, onCancelDownload, onSendMessage, onCreateWorkspaceItem,
        activity, canUndo, onUndo, onRenameItem, onDeleteItem, onRestoreItem, onDisconnect, recentRooms,
        sharedMedia, onCreateMedia, onMediaControl, onMediaMove, onMediaRemove,
        canChooseDownloadFolder, downloadFolderName, showDownloadFolderPrompt,
        onChooseDownloadFolder, onDismissDownloadFolder } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const relinkInputRef = useRef<HTMLInputElement>(null);
    const relinkItemRef = useRef<TableItemType | null>(null);
    const filePlacementRef = useRef<{ x: number; y: number } | null>(null);
    const panRef = useRef<{ x: number; y: number; cameraX: number; cameraY: number } | null>(null);
    const pinchRef = useRef<{ distance: number; zoom: number; worldX: number; worldY: number } | null>(null);
    const longPressRef = useRef<{ timer: number; startX: number; startY: number } | null>(null);
    const touchTapRef = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
    const suppressNextCanvasClickRef = useRef(false);
    const touchPointersRef = useRef(new Set<number>());
    const multitouchGestureRef = useRef(false);
    const [camera, setCamera] = useState<Camera>({ x: 220, y: 140, zoom: 1 });
    const [query, setQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
    const [creator, setCreator] = useState<Creator>(null);
    const [creatorValue, setCreatorValue] = useState("");
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [theater, setTheater] = useState(false);
    const workspaceRef = useRef<HTMLElement>(null);
    const previousDevicesRef = useRef<DeviceType[]>(devices);
    const [departingDevices, setDepartingDevices] = useState<DeviceType[]>([]);

    useEffect(() => {
        const currentIds = new Set(devices.map(device => device.id));
        const departing = previousDevicesRef.current.filter(device => !currentIds.has(device.id));
        previousDevicesRef.current = devices;
        if (!departing.length) return;
        setDepartingDevices(departing);
        const timer = window.setTimeout(() => setDepartingDevices([]), 340);
        return () => window.clearTimeout(timer);
    }, [devices]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) setTheater(false);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [view, setView] = useState<"files" | "folders" | "shared" | "activity" | "trash">("files");
    const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

    const canvasItems = items.filter(item => !item.deleted && (item.parentId ?? null) === null);
    const displayedItems = view === "folders" ? canvasItems.filter(item => item.type === "folder") : view === "shared" ? canvasItems.filter(item => item.ownerId !== deviceId) : canvasItems;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const results = normalizedQuery ? items.filter(item => !item.deleted && item.name.toLocaleLowerCase().includes(normalizedQuery)) : [];
    const folder = currentFolder ? items.find(item => item.id === currentFolder) : null;
    const folderItems = currentFolder ? items.filter(item => !item.deleted && item.parentId === currentFolder) : [];
    const minimapViewport = {
        left: Math.max(0, Math.min(MINIMAP_WIDTH, (-camera.x / camera.zoom) * MINIMAP_WIDTH / WORLD_WIDTH)),
        top: Math.max(0, Math.min(MINIMAP_HEIGHT, (-camera.y / camera.zoom) * MINIMAP_HEIGHT / WORLD_HEIGHT)),
        width: Math.min(MINIMAP_WIDTH, viewportSize.width / camera.zoom * MINIMAP_WIDTH / WORLD_WIDTH),
        height: Math.min(MINIMAP_HEIGHT, viewportSize.height / camera.zoom * MINIMAP_HEIGHT / WORLD_HEIGHT),
    };

    function clampWorldPoint(point: { x: number; y: number }) {
        return { x: Math.max(0, Math.min(ITEM_MAX_X, point.x)), y: Math.max(0, Math.min(ITEM_MAX_Y, point.y)) };
    }

    function clampCamera(next: Camera): Camera {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return next;
        const margin = 240;
        return {
            ...next,
            x: Math.min(margin, Math.max(rect.width - 5200 * next.zoom - margin, next.x)),
            y: Math.min(margin, Math.max(rect.height - 3600 * next.zoom - margin, next.y)),
        };
    }

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!hasRoom || !viewport) return;
        const observer = new ResizeObserver(([entry]) => setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
        observer.observe(viewport);
        setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
        return () => observer.disconnect();
    }, [hasRoom]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!hasRoom || !viewport) return;
        const workspace = viewport.closest(".workspace");
        const handleWheel = (event: WheelEvent) => {
            if (!event.ctrlKey) return;
            const target = event.target as Node;
            if (!workspace?.contains(target)) return;
            event.preventDefault();
            event.stopPropagation();
            if (!viewport.contains(target)) return;
            const rect = viewport.getBoundingClientRect();
            setCamera(current => {
                const zoom = Math.max(.35, Math.min(2.2, current.zoom * (event.deltaY > 0 ? .9 : 1.1)));
                const worldX = (event.clientX - rect.left - current.x) / current.zoom;
                const worldY = (event.clientY - rect.top - current.y) / current.zoom;
                return clampCamera({ zoom, x: event.clientX - rect.left - worldX * zoom, y: event.clientY - rect.top - worldY * zoom });
            });
        };
        const blockBrowserZoomKeys = (event: KeyboardEvent) => {
            if (!event.ctrlKey || !["+", "-", "=", "0"].includes(event.key)) return;
            event.preventDefault();
        };
        window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
        window.addEventListener("keydown", blockBrowserZoomKeys, true);
        return () => {
            window.removeEventListener("wheel", handleWheel, { capture: true });
            window.removeEventListener("keydown", blockBrowserZoomKeys, true);
        };
    }, [hasRoom]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!hasRoom || !viewport) return;

        const distance = (touches: TouchList) => Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
        const midpoint = (touches: TouchList) => ({
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        });
        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 2) return;
            event.preventDefault();
            multitouchGestureRef.current = true;
            if (longPressRef.current) {
                clearTimeout(longPressRef.current.timer);
                longPressRef.current = null;
            }
            panRef.current = null;
            const rect = viewport.getBoundingClientRect();
            const point = midpoint(event.touches);
            setCamera(current => {
                pinchRef.current = {
                    distance: distance(event.touches),
                    zoom: current.zoom,
                    worldX: (point.x - rect.left - current.x) / current.zoom,
                    worldY: (point.y - rect.top - current.y) / current.zoom,
                };
                return current;
            });
        };
        const handleTouchMove = (event: TouchEvent) => {
            const pinch = pinchRef.current;
            if (!pinch || event.touches.length !== 2) return;
            event.preventDefault();
            const rect = viewport.getBoundingClientRect();
            const point = midpoint(event.touches);
            const zoom = Math.max(.35, Math.min(2.2, pinch.zoom * distance(event.touches) / Math.max(1, pinch.distance)));
            setCamera(clampCamera({
                zoom,
                x: point.x - rect.left - pinch.worldX * zoom,
                y: point.y - rect.top - pinch.worldY * zoom,
            }));
        };
        const handleTouchEnd = (event: TouchEvent) => {
            if (event.touches.length < 2) pinchRef.current = null;
        };

        viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
        viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
        viewport.addEventListener("touchend", handleTouchEnd);
        viewport.addEventListener("touchcancel", handleTouchEnd);
        return () => {
            viewport.removeEventListener("touchstart", handleTouchStart);
            viewport.removeEventListener("touchmove", handleTouchMove);
            viewport.removeEventListener("touchend", handleTouchEnd);
            viewport.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [hasRoom]);

    function screenToWorld(clientX: number, clientY: number) {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return clampWorldPoint({ x: (clientX - rect.left - camera.x) / camera.zoom, y: (clientY - rect.top - camera.y) / camera.zoom });
    }

    function zoomAt(clientX: number, clientY: number, nextZoom: number) {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const zoom = Math.max(.35, Math.min(2.2, nextZoom));
        setCamera(current => {
            const worldX = (clientX - rect.left - current.x) / current.zoom;
            const worldY = (clientY - rect.top - current.y) / current.zoom;
            return clampCamera({ zoom, x: clientX - rect.left - worldX * zoom, y: clientY - rect.top - worldY * zoom });
        });
    }

    function openCreator(type: "folder" | "note" | "youtube") {
        if (!contextMenu) return;
        setCreator({ type, ...contextMenu });
        setCreatorValue(type === "folder" ? "Nueva carpeta" : "");
        setContextMenu(null);
    }

    function chooseWorkspaceFile() {
        if (!contextMenu) return;
        filePlacementRef.current = { x: contextMenu.x, y: contextMenu.y };
        setContextMenu(null);
        fileInputRef.current?.click();
    }

    function chooseFolderFile() {
        if (!folder) return;
        filePlacementRef.current = { x: 120, y: 120 };
        fileInputRef.current?.click();
    }

    function confirmCreator() {
        if (!creator) return;
        const value = creatorValue.trim();
        if (creator.type === "folder" && value) onCreateWorkspaceItem("folder", value, creator.x, creator.y, "", currentFolder);
        if (creator.type === "note") onCreateWorkspaceItem("note", value.slice(0, 28) || "Nueva nota", creator.x, creator.y, value, currentFolder);
        if (creator.type === "youtube" && value) onCreateMedia(value, creator.x, creator.y);
        setCreator(null);
    }

    function moveItem(item: TableItemType, x: number, y: number) {
        const bounded = clampWorldPoint({ x, y });
        const target = canvasItems.find(candidate => candidate.type === "folder" && candidate.id !== item.id && Math.hypot(candidate.x - bounded.x, candidate.y - bounded.y) < 145);
        onMoveItem(item, target ? 120 : bounded.x, target ? 120 : bounded.y, target?.id ?? null);
    }

    function moveFromMinimap(clientX: number, clientY: number) {
        const map = document.querySelector(".workspace-minimap-track")?.getBoundingClientRect();
        const viewport = viewportRef.current?.getBoundingClientRect();
        if (!map || !viewport) return;
        const worldX = Math.max(0, Math.min(WORLD_WIDTH, (clientX - map.left) / map.width * WORLD_WIDTH));
        const worldY = Math.max(0, Math.min(WORLD_HEIGHT, (clientY - map.top) / map.height * WORLD_HEIGHT));
        setCamera(current => clampCamera({ ...current, x: viewport.width / 2 - worldX * current.zoom, y: viewport.height / 2 - worldY * current.zoom }));
    }

    function focusItem(item: TableItemType) {
        setCurrentFolder(item.parentId ?? null);
        const rect = viewportRef.current?.getBoundingClientRect();
        setCamera(current => ({ ...current, x: (rect?.width ?? 900) / 2 - item.x * current.zoom, y: (rect?.height ?? 600) / 2 - item.y * current.zoom }));
        setQuery("");
    }

    function submitMessage() {
        const value = message.trim(); if (!value) return;
        onSendMessage(value); setMessage("");
    }

    function enterTheater() {
        setTheater(true);
        if (!document.fullscreenElement) void workspaceRef.current?.requestFullscreen?.().catch(() => undefined);
    }

    function leaveTheater() {
        setTheater(false);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    }

    return <main ref={workspaceRef} className="workspace" onClick={() => setContextMenu(null)}>
        <div className="workspace-background" />
        {!hasRoom && <CenterAction creating={creatingRoom} onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} recentRooms={recentRooms} />}
        {hasRoom && <>
            <aside className="workspace-sidebar">
                <div className="workspace-project"><span>✦</span><div><strong>Mesa {roomCode}</strong><small>{devices.length} conectado{devices.length === 1 ? "" : "s"}</small></div></div>
                <section><h3>Integrantes ({devices.length}/4)</h3>{devices.map((device,index) => <div className="sidebar-device" style={{animationDelay:`${index*45}ms`}} key={device.id}><Device name={device.name} type={device.type} inPanel /></div>)}{departingDevices.map(device=><div className="sidebar-device is-leaving" key={`leaving-${device.id}`}><Device name={device.name} type={device.type} inPanel /></div>)}</section>
                <nav>
                    <button className={view==="files"?"is-active":""} onClick={()=>setView("files")}><Files size={17}/>Todos los archivos</button>
                    <button className={view==="folders"?"is-active":""} onClick={()=>setView("folders")}><Folder size={17}/>Carpetas</button>
                    <button className={view==="shared"?"is-active":""} onClick={()=>setView("shared")}><Users size={17}/>Compartidos</button>
                    <button className={view==="activity"?"is-active":""} onClick={()=>setView("activity")}><Activity size={17}/>Actividad</button>
                    <button className={view==="trash"?"is-active":""} onClick={()=>setView("trash")}><Trash2 size={17}/>Papelera</button>
                    <button className="workspace-disconnect" onClick={onDisconnect}><LogOut size={17}/>Desconectar</button>
                </nav>
                {canChooseDownloadFolder && showDownloadFolderPrompt && <div className="download-destination-card">
                    <button className="download-destination-close" onClick={onDismissDownloadFolder} aria-label="Cerrar"><X size={13}/></button>
                    <span><FolderDown size={17}/></span>
                    <div><strong>{downloadFolderName ? "Descargas preparadas" : "Dónde guardar"}</strong><small>{downloadFolderName ?? "Elige una carpeta para esta mesa"}</small></div>
                    <button className="download-destination-action" onClick={onChooseDownloadFolder}>{downloadFolderName ? "Cambiar" : "Elegir carpeta"}</button>
                </div>}
                <div className="space-health"><strong>Disponibilidad</strong><span>● {Math.round((devices.length / 4) * 100)}% de la mesa conectada</span></div>
                <small className="workspace-version">Droply beta · v0.6.0</small>
            </aside>

            <div className="workspace-search">
                <Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en la mesa" />
                {query && <button onClick={() => setQuery("")}><X size={17}/></button>}
                {normalizedQuery && <div className="search-results">{results.length ? results.map(item => <button key={item.id} onClick={() => focusItem(item)}><span>{item.type === "folder" ? "📁" : "📄"}</span><div><strong>{item.name}</strong><small>{item.ownerName}</small></div></button>) : <p>No encontramos “{query}”</p>}</div>}
            </div>
            {showMenu && <RoomPanel roomCode={roomCode}/>} 

            <div className="canvas-breadcrumb"><strong>{view==="activity"?"Actividad":view==="trash"?"Papelera":view==="folders"?"Carpetas":view==="shared"?"Compartidos conmigo":"Todos los archivos"}</strong>{canUndo&&<button className="undo-button" onClick={onUndo}><Undo2 size={15}/>Deshacer</button>}</div>
            <div ref={viewportRef} className={`workspace-viewport ${panRef.current ? "is-panning" : ""}`}
                onClick={e => { e.stopPropagation(); if(suppressNextCanvasClickRef.current){suppressNextCanvasClickRef.current=false;return;} if (contextMenu) setContextMenu(null); }}
                onWheel={e => { if (!e.ctrlKey) setCamera(c => clampCamera({...c, x:c.x-e.deltaX, y:c.y-e.deltaY})); }}
                onPointerDown={e => { const target=e.target as HTMLElement; if(target.closest(".shared-youtube"))return; if(e.pointerType==="touch"){touchPointersRef.current.add(e.pointerId);if(touchPointersRef.current.size>1){multitouchGestureRef.current=true;touchTapRef.current=null;if(longPressRef.current){clearTimeout(longPressRef.current.timer);longPressRef.current=null;}panRef.current=null;return;}} if (e.button === 1 || !target.closest(".table-item, button, input, textarea")) { e.currentTarget.setPointerCapture(e.pointerId); panRef.current = { x:e.clientX, y:e.clientY, cameraX:camera.x, cameraY:camera.y }; if(e.pointerType==="touch"&&!multitouchGestureRef.current)touchTapRef.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false}; } }}
                onPointerMove={e => { const tap=touchTapRef.current;if(tap?.pointerId===e.pointerId&&Math.hypot(e.clientX-tap.startX,e.clientY-tap.startY)>14)tap.moved=true; const p=panRef.current; if(p) setCamera(c=>clampCamera({...c,x:p.cameraX+e.clientX-p.x,y:p.cameraY+e.clientY-p.y})); }}
                onPointerUp={e => { const wasMultitouch=multitouchGestureRef.current;const tap=touchTapRef.current;if(e.pointerType==="touch"&&tap?.pointerId===e.pointerId&&!tap.moved&&!wasMultitouch){const p=screenToWorld(e.clientX,e.clientY);suppressNextCanvasClickRef.current=true;setContextMenu({clientX:e.clientX,clientY:e.clientY,...p});}touchTapRef.current=null;if(e.pointerType==="touch"){touchPointersRef.current.delete(e.pointerId);if(touchPointersRef.current.size===0)multitouchGestureRef.current=false;} panRef.current=null; }}
                onPointerCancel={e => { touchTapRef.current=null;if(longPressRef.current){clearTimeout(longPressRef.current.timer);longPressRef.current=null;} if(e.pointerType==="touch"){touchPointersRef.current.delete(e.pointerId);if(touchPointersRef.current.size===0)multitouchGestureRef.current=false;} panRef.current=null; }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file=e.dataTransfer.files[0]; if(file){ const p=screenToWorld(e.clientX,e.clientY); onAddFile(file,p.x,p.y,currentFolder); } }}
                onContextMenu={e => { e.preventDefault(); const p=screenToWorld(e.clientX,e.clientY); setContextMenu({clientX:e.clientX,clientY:e.clientY,...p}); }}>
                <div className="workspace-world" style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`}}>
                    {(view==="files"||view==="folders"||view==="shared")&&displayedItems.map(item => { const boundedItem={...item,...clampWorldPoint(item)}; return <TableItem key={item.id} item={boundedItem} scale={camera.zoom} onDownload={onDownload} onMove={moveItem}
                        onOpenFolder={id => setCurrentFolder(id)} onCancelDownload={onCancelDownload}
                        selected={selectedId===item.id} onSelect={entry=>setSelectedId(entry.id)} onDelete={onDeleteItem} onRename={onRenameItem}
                        canRelink={item.type==="file"&&item.ownerId===deviceId&&!item.available} onRelink={entry=>{relinkItemRef.current=entry;relinkInputRef.current?.click();}}
                        downloadProgress={downloadItemId===item.id ? downloadProgress : undefined}
                        transferPhase={downloadItemId===item.id ? downloadPhase : "idle"}
                        downloadComplete={downloadItemId===item.id && downloadComplete}/>}) }
                    {sharedMedia&&!theater&&<SharedYouTube media={sharedMedia} scale={camera.zoom} onControl={onMediaControl} onMove={onMediaMove} onRemove={onMediaRemove} onToggleTheater={enterTheater}/>}
                </div>
            </div>

            {view==="activity"&&<aside className="workspace-data-panel"><header><Activity size={18}/><strong>Actividad reciente</strong></header>{activity.length?activity.map(entry=><div className="activity-row" key={entry.id}><span>{entry.text}</span><small>{new Date(entry.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div>):<p>Aún no hay actividad en esta mesa.</p>}</aside>}
            {view==="trash"&&<aside className="workspace-data-panel"><header><Trash2 size={18}/><strong>Papelera</strong></header>{items.filter(item=>item.deleted).length?items.filter(item=>item.deleted).map(item=><div className="trash-row" key={item.id}><div><strong>{item.name}</strong><small>{item.type}</small></div><button onClick={()=>onRestoreItem(item)}><RotateCcw size={15}/>Restaurar</button></div>):<p>La papelera está vacía.</p>}</aside>}

            {folder&&<aside className="workspace-folder-window" onPointerDown={e=>e.stopPropagation()}>
                <header><div><Folder size={19}/><span><strong>{folder.name}</strong><small>{folderItems.length} elemento{folderItems.length===1?"":"s"}</small></span></div><button onClick={()=>setCurrentFolder(folder.parentId ?? null)} aria-label="Cerrar carpeta"><X size={18}/></button></header>
                <div className="folder-window-grid">
                    {folderItems.map((item,index)=>{const Icon=item.type==="folder"?Folder:item.type==="note"?StickyNote:FileText;return <div className="folder-window-item" style={{animationDelay:`${Math.min(index,8)*35}ms`}} key={item.id}><button onDoubleClick={()=>item.type==="folder"?setCurrentFolder(item.id):onDownload(item)} onClick={()=>setSelectedId(item.id)}><Icon size={25}/><strong>{item.name}</strong><small>{item.ownerName}</small></button>{item.type==="file"&&<button className="folder-item-download" onClick={()=>onDownload(item)}>Descargar</button>}<button className="folder-item-eject" onClick={()=>onMoveItem(item,Math.min(ITEM_MAX_X,folder.x+190),Math.min(ITEM_MAX_Y,folder.y+30),null)}>Sacar a la mesa</button></div>})}
                    <button className="folder-window-add" onClick={chooseFolderFile}><Plus size={24}/><strong>Agregar archivo</strong><small>Desde este dispositivo</small></button>
                </div>
                {folderItems.length===0&&<p>Esta carpeta está vacía. Agrega el primer archivo.</p>}
            </aside>}

            <div className="canvas-controls"><button onClick={() => zoomAt(innerWidth/2,innerHeight/2,camera.zoom-.1)}><Minus/></button><span>{Math.round(camera.zoom*100)}%</span><button onClick={() => zoomAt(innerWidth/2,innerHeight/2,camera.zoom+.1)}><Plus/></button><button onClick={() => setCamera({x:220,y:140,zoom:1})}>Centrar</button></div>
            <div className="workspace-minimap" onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);moveFromMinimap(e.clientX,e.clientY);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))moveFromMinimap(e.clientX,e.clientY);}}>
                <header><Map size={14}/><span>Mapa</span></header>
                <div className="workspace-minimap-track">
                    {items.filter(item=>!item.deleted).map(item=><i key={item.id} className={`is-${item.type}`} style={{left:`${Math.max(0,Math.min(ITEM_MAX_X,item.x))*100/WORLD_WIDTH}%`,top:`${Math.max(0,Math.min(ITEM_MAX_Y,item.y))*100/WORLD_HEIGHT}%`}} />)}
                    <b style={{left:minimapViewport.left,top:minimapViewport.top,width:Math.max(12,minimapViewport.width),height:Math.max(10,minimapViewport.height)}} />
                </div>
            </div>
            <input ref={fileInputRef} className="workspace-file-input" type="file" onChange={event=>{const file=event.target.files?.[0];const placement=filePlacementRef.current;if(file&&placement)onAddFile(file,placement.x,placement.y,currentFolder);filePlacementRef.current=null;event.currentTarget.value="";setContextMenu(null);}} />
            <input ref={relinkInputRef} className="workspace-file-input" type="file" onChange={event=>{const file=event.target.files?.[0];const item=relinkItemRef.current;if(file&&item)onRelinkFile(item,file);relinkItemRef.current=null;event.currentTarget.value="";}} />
            {contextMenu && <div className="workspace-context-menu" style={{left:Math.max(8,Math.min(contextMenu.clientX,window.innerWidth-232)),top:Math.max(8,Math.min(contextMenu.clientY,window.innerHeight-205))}} onClick={e=>e.stopPropagation()}><button onClick={chooseWorkspaceFile}><Upload size={18}/>Agregar archivo</button><button onClick={()=>openCreator("folder")}><FolderPlus size={18}/>Nueva carpeta</button><button onClick={()=>openCreator("note")}><FilePlus2 size={18}/>Nueva nota de texto</button><button onClick={()=>openCreator("youtube")}><ExternalLink size={18}/>Video de YouTube</button></div>}
            {creator && <div className="workspace-creator-backdrop" onPointerDown={()=>setCreator(null)}><form className="workspace-creator" onSubmit={e=>{e.preventDefault();confirmCreator();}} onPointerDown={e=>e.stopPropagation()}><label>{creator.type==="folder"?"Nombre de la carpeta":creator.type==="youtube"?"Enlace de YouTube":"Escribe tu nota"}</label>{creator.type==="folder"||creator.type==="youtube"?<input type={creator.type==="youtube"?"url":"text"} placeholder={creator.type==="youtube"?"https://youtube.com/watch?v=...":""} autoFocus value={creatorValue} onChange={e=>setCreatorValue(e.target.value)} onFocus={e=>e.currentTarget.select()}/>:<textarea autoFocus value={creatorValue} onChange={e=>setCreatorValue(e.target.value)}/>}<div><button type="button" onClick={()=>setCreator(null)}>Cancelar</button><button type="submit">{creator.type==="youtube"?"Agregar":"Crear"}</button></div></form></div>}

            {theater&&sharedMedia&&<div className="workspace-theater" onClick={event=>event.stopPropagation()}>
                <div className="theater-video"><SharedYouTube media={sharedMedia} scale={1} onControl={onMediaControl} onMove={onMediaMove} onRemove={onMediaRemove} theater onToggleTheater={leaveTheater}/></div>
                <aside className="theater-chat"><header><div><strong>Chat de la mesa</strong><small>{devices.length} conectado{devices.length===1?"":"s"}</small></div><button onClick={leaveTheater}><X size={18}/></button></header><div className="chat-messages">{messages.length===0&&<p>Conversen mientras ven el video.</p>}{messages.map(item=><div className={`chat-message ${item.senderId===deviceId?"is-own":""}`} key={item.id}><strong>{item.senderName}</strong><span>{item.text}</span></div>)}</div><div className="chat-compose"><input value={message} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==="Enter")submitMessage();}} placeholder="Escribe un mensaje"/><button onClick={submitMessage}><Send size={17}/></button></div></aside>
            </div>}
            {!theater&&<div className="workspace-chat">{chatOpen ? <div className="chat-panel"><header><strong>Chat de la mesa</strong><button onClick={()=>setChatOpen(false)}><X size={17}/></button></header><div className="chat-messages">{messages.length===0&&<p>Coordina aquí sin salir de la mesa.</p>}{messages.map(item=><div className={`chat-message ${item.senderId===deviceId?"is-own":""}`} key={item.id}><strong>{item.senderName}</strong><span>{item.text}</span></div>)}</div><div className="chat-compose"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitMessage();}} placeholder="Escribe un mensaje"/><button onClick={submitMessage}><Send size={17}/></button></div></div> : <button className="chat-toggle" onClick={()=>setChatOpen(true)}><MessageCircle size={22}/>{messages.length>0&&<span>{messages.length}</span>}</button>}</div>}
        </>}
    </main>;
}
