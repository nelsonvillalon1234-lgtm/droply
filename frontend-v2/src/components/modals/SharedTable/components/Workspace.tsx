import { useEffect, useRef, useState } from "react";
import {
    Activity, ChevronLeft, FilePlus2, Files, Folder, FolderPlus,
    MessageCircle, Minus, Plus, RotateCcw, Search, Send, Trash2, Undo2, Users, X
} from "lucide-react";
import "./../styles/workspace.css";
import CenterAction from "./CenterAction";
import RoomPanel from "./RoomPanel";
import Device from "./Device";
import TableItem from "./TableItem";
import type { ActivityItem, ChatMessage, DeviceType, TableItem as TableItemType } from "../types";
import deviceId from "../../../../services/device";

type Props = {
    hasRoom: boolean; creatingRoom: boolean; roomCode: string; devices: DeviceType[];
    items: TableItemType[]; showMenu: boolean; downloadItemId: string | null;
    downloadProgress: number; downloadComplete: boolean; messages: ChatMessage[];
    onCancelDownload: () => void;
    onMoveItem: (item: TableItemType, x: number, y: number, parentId?: string | null) => void;
    onCreateRoom: () => void; onAddFile: (file: File, x: number, y: number, parentId?: string | null) => void;
    onDownload: (item: TableItemType) => void; onSendMessage: (text: string) => void;
    onCreateWorkspaceItem: (type: "folder" | "note", name: string, x: number, y: number, content?: string, parentId?: string | null) => void;
    activity: ActivityItem[]; canUndo: boolean; onUndo: () => void;
    onRenameItem: (item: TableItemType, name: string) => void;
    onDeleteItem: (item: TableItemType) => void;
    onRestoreItem: (item: TableItemType) => void;
};

type Camera = { x: number; y: number; zoom: number };
type ContextMenu = { clientX: number; clientY: number; x: number; y: number } | null;
type Creator = { type: "folder" | "note"; clientX: number; clientY: number; x: number; y: number } | null;

export default function Workspace(props: Props) {
    const { hasRoom, creatingRoom, roomCode, showMenu, devices, items, downloadItemId,
        downloadProgress, downloadComplete, messages, onCreateRoom, onAddFile, onDownload,
        onMoveItem, onCancelDownload, onSendMessage, onCreateWorkspaceItem,
        activity, canUndo, onUndo, onRenameItem, onDeleteItem, onRestoreItem } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const panRef = useRef<{ x: number; y: number; cameraX: number; cameraY: number } | null>(null);
    const [camera, setCamera] = useState<Camera>({ x: 220, y: 140, zoom: 1 });
    const [query, setQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
    const [creator, setCreator] = useState<Creator>(null);
    const [creatorValue, setCreatorValue] = useState("");
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [view, setView] = useState<"files" | "folders" | "shared" | "activity" | "trash">("files");

    const currentItems = items.filter(item => !item.deleted && (item.parentId ?? null) === currentFolder);
    const displayedItems = view === "folders" ? currentItems.filter(item => item.type === "folder") : view === "shared" ? currentItems.filter(item => item.ownerId !== deviceId) : currentItems;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const results = normalizedQuery ? items.filter(item => !item.deleted && item.name.toLocaleLowerCase().includes(normalizedQuery)) : [];
    const folder = currentFolder ? items.find(item => item.id === currentFolder) : null;

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
        const handleWheel = (event: WheelEvent) => {
            if (!event.ctrlKey || !viewport.contains(event.target as Node)) return;
            event.preventDefault();
            event.stopPropagation();
            const rect = viewport.getBoundingClientRect();
            setCamera(current => {
                const zoom = Math.max(.35, Math.min(2.2, current.zoom * (event.deltaY > 0 ? .9 : 1.1)));
                const worldX = (event.clientX - rect.left - current.x) / current.zoom;
                const worldY = (event.clientY - rect.top - current.y) / current.zoom;
                return clampCamera({ zoom, x: event.clientX - rect.left - worldX * zoom, y: event.clientY - rect.top - worldY * zoom });
            });
        };
        window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
        return () => window.removeEventListener("wheel", handleWheel, { capture: true });
    }, [hasRoom]);

    function screenToWorld(clientX: number, clientY: number) {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: (clientX - rect.left - camera.x) / camera.zoom, y: (clientY - rect.top - camera.y) / camera.zoom };
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

    function openCreator(type: "folder" | "note") {
        if (!contextMenu) return;
        setCreator({ type, ...contextMenu });
        setCreatorValue(type === "folder" ? "Nueva carpeta" : "");
        setContextMenu(null);
    }

    function confirmCreator() {
        if (!creator) return;
        const value = creatorValue.trim();
        if (creator.type === "folder" && value) onCreateWorkspaceItem("folder", value, creator.x, creator.y, "", currentFolder);
        if (creator.type === "note") onCreateWorkspaceItem("note", value.slice(0, 28) || "Nueva nota", creator.x, creator.y, value, currentFolder);
        setCreator(null);
    }

    function moveItem(item: TableItemType, x: number, y: number) {
        const target = currentItems.find(candidate => candidate.type === "folder" && candidate.id !== item.id && Math.hypot(candidate.x - x, candidate.y - y) < 145);
        onMoveItem(item, target ? 120 : x, target ? 120 : y, target?.id ?? currentFolder);
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

    return <main className="workspace" onClick={() => setContextMenu(null)}>
        <div className="workspace-background" />
        {!hasRoom && <CenterAction creating={creatingRoom} onCreateRoom={onCreateRoom} />}
        {hasRoom && <>
            <aside className="workspace-sidebar">
                <div className="workspace-project"><span>✦</span><div><strong>Mesa {roomCode}</strong><small>{devices.length} conectado{devices.length === 1 ? "" : "s"}</small></div></div>
                <section><h3>Integrantes ({devices.length}/4)</h3>{devices.map(device => <div className="sidebar-device" key={device.id}><Device name={device.name} type={device.type} inPanel /></div>)}</section>
                <nav>
                    <button className={view==="files"?"is-active":""} onClick={()=>setView("files")}><Files size={17}/>Todos los archivos</button>
                    <button className={view==="folders"?"is-active":""} onClick={()=>setView("folders")}><Folder size={17}/>Carpetas</button>
                    <button className={view==="shared"?"is-active":""} onClick={()=>setView("shared")}><Users size={17}/>Compartidos</button>
                    <button className={view==="activity"?"is-active":""} onClick={()=>setView("activity")}><Activity size={17}/>Actividad</button>
                    <button className={view==="trash"?"is-active":""} onClick={()=>setView("trash")}><Trash2 size={17}/>Papelera</button>
                </nav>
                <div className="space-health"><strong>Disponibilidad</strong><span>● {Math.round((devices.length / 4) * 100)}% de la mesa conectada</span></div>
            </aside>

            <div className="workspace-search">
                <Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en la mesa" />
                {query && <button onClick={() => setQuery("")}><X size={17}/></button>}
                {normalizedQuery && <div className="search-results">{results.length ? results.map(item => <button key={item.id} onClick={() => focusItem(item)}><span>{item.type === "folder" ? "📁" : "📄"}</span><div><strong>{item.name}</strong><small>{item.ownerName}</small></div></button>) : <p>No encontramos “{query}”</p>}</div>}
            </div>
            {showMenu && <RoomPanel roomCode={roomCode}/>} 

            <div className="canvas-breadcrumb">{folder && <button onClick={() => setCurrentFolder(folder.parentId ?? null)}><ChevronLeft size={16}/>Atrás</button>}<strong>{view==="activity"?"Actividad":view==="trash"?"Papelera":view==="folders"?"Carpetas":view==="shared"?"Compartidos conmigo":folder?.name ?? "Todos los archivos"}</strong>{canUndo&&<button className="undo-button" onClick={onUndo}><Undo2 size={15}/>Deshacer</button>}</div>
            <div ref={viewportRef} className={`workspace-viewport ${panRef.current ? "is-panning" : ""}`}
                onWheel={e => { if (!e.ctrlKey) setCamera(c => clampCamera({...c, x:c.x-e.deltaX, y:c.y-e.deltaY})); }}
                onPointerDown={e => { const target=e.target as HTMLElement; if (e.button === 1 || !target.closest(".table-item, button, input, textarea")) { e.currentTarget.setPointerCapture(e.pointerId); panRef.current = { x:e.clientX, y:e.clientY, cameraX:camera.x, cameraY:camera.y }; } }}
                onPointerMove={e => { const p=panRef.current; if(p) setCamera(c=>clampCamera({...c,x:p.cameraX+e.clientX-p.x,y:p.cameraY+e.clientY-p.y})); }}
                onPointerUp={() => { panRef.current=null; }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file=e.dataTransfer.files[0]; if(file){ const p=screenToWorld(e.clientX,e.clientY); onAddFile(file,p.x,p.y,currentFolder); } }}
                onContextMenu={e => { e.preventDefault(); const p=screenToWorld(e.clientX,e.clientY); setContextMenu({clientX:e.clientX,clientY:e.clientY,...p}); }}>
                <div className="workspace-world" style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`}}>
                    {(view==="files"||view==="folders"||view==="shared")&&displayedItems.map(item => <TableItem key={item.id} item={item} scale={camera.zoom} onDownload={onDownload} onMove={moveItem}
                        onOpenFolder={id => setCurrentFolder(id)} onCancelDownload={onCancelDownload}
                        selected={selectedId===item.id} onSelect={entry=>setSelectedId(entry.id)} onDelete={onDeleteItem} onRename={onRenameItem}
                        downloadProgress={downloadItemId===item.id ? downloadProgress : undefined}
                        downloadComplete={downloadItemId===item.id && downloadComplete}/>) }
                </div>
            </div>

            {view==="activity"&&<aside className="workspace-data-panel"><header><Activity size={18}/><strong>Actividad reciente</strong></header>{activity.length?activity.map(entry=><div className="activity-row" key={entry.id}><span>{entry.text}</span><small>{new Date(entry.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div>):<p>Aún no hay actividad en esta mesa.</p>}</aside>}
            {view==="trash"&&<aside className="workspace-data-panel"><header><Trash2 size={18}/><strong>Papelera</strong></header>{items.filter(item=>item.deleted).length?items.filter(item=>item.deleted).map(item=><div className="trash-row" key={item.id}><div><strong>{item.name}</strong><small>{item.type}</small></div><button onClick={()=>onRestoreItem(item)}><RotateCcw size={15}/>Restaurar</button></div>):<p>La papelera está vacía.</p>}</aside>}

            <div className="canvas-controls"><button onClick={() => zoomAt(innerWidth/2,innerHeight/2,camera.zoom-.1)}><Minus/></button><span>{Math.round(camera.zoom*100)}%</span><button onClick={() => zoomAt(innerWidth/2,innerHeight/2,camera.zoom+.1)}><Plus/></button><button onClick={() => setCamera({x:220,y:140,zoom:1})}>Centrar</button></div>
            {contextMenu && <div className="workspace-context-menu" style={{left:contextMenu.clientX,top:contextMenu.clientY}} onClick={e=>e.stopPropagation()}><button onClick={()=>openCreator("folder")}><FolderPlus size={18}/>Nueva carpeta</button><button onClick={()=>openCreator("note")}><FilePlus2 size={18}/>Nueva nota de texto</button></div>}
            {creator && <form className="workspace-creator" style={{left:creator.clientX,top:creator.clientY}} onSubmit={e=>{e.preventDefault();confirmCreator();}} onClick={e=>e.stopPropagation()}><label>{creator.type==="folder"?"Nombre de la carpeta":"Escribe tu nota"}</label>{creator.type==="folder"?<input autoFocus value={creatorValue} onChange={e=>setCreatorValue(e.target.value)} onFocus={e=>e.currentTarget.select()}/>:<textarea autoFocus value={creatorValue} onChange={e=>setCreatorValue(e.target.value)}/>}<div><button type="button" onClick={()=>setCreator(null)}>Cancelar</button><button type="submit">Crear</button></div></form>}

            <div className="workspace-chat">{chatOpen ? <div className="chat-panel"><header><strong>Chat de la mesa</strong><button onClick={()=>setChatOpen(false)}><X size={17}/></button></header><div className="chat-messages">{messages.length===0&&<p>Coordina aquí sin salir de la mesa.</p>}{messages.map(item=><div className={`chat-message ${item.senderId===deviceId?"is-own":""}`} key={item.id}><strong>{item.senderName}</strong><span>{item.text}</span></div>)}</div><div className="chat-compose"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitMessage();}} placeholder="Escribe un mensaje"/><button onClick={submitMessage}><Send size={17}/></button></div></div> : <button className="chat-toggle" onClick={()=>setChatOpen(true)}><MessageCircle size={22}/>{messages.length>0&&<span>{messages.length}</span>}</button>}</div>
        </>}
    </main>;
}
