import { useEffect, useRef, useState } from "react";
import { ExternalLink, GripHorizontal, Maximize2, Minimize2, Pause, Play, X } from "lucide-react";
import type { SharedMedia } from "../types";

type Player = {
    playVideo?: () => void;
    pauseVideo?: () => void;
    seekTo?: (time: number, allowSeekAhead: boolean) => void;
    getCurrentTime?: () => number;
    destroy?: () => void;
};
type PlayerEvent = { data: number; target: Player };
type YouTubeWindow = Window & {
    YT?: { Player: new (element: HTMLElement, options: object) => Player };
    onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<void> | null = null;

function loadApi() {
    const global = window as YouTubeWindow;
    if (global.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
        const previous = global.onYouTubeIframeAPIReady;
        global.onYouTubeIframeAPIReady = () => {
            previous?.();
            resolve();
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(script);
        }
    });
    return apiPromise;
}

type Props = {
    media: SharedMedia;
    scale: number;
    onControl: (playing: boolean, time: number) => void;
    onMove: (x: number, y: number) => void;
    onRemove: () => void;
    theater?: boolean;
    onToggleTheater?: () => void;
};

export default function SharedYouTube({ media, scale, onControl, onMove, onRemove, theater = false, onToggleTheater }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const mediaRef = useRef(media);
    const remoteRef = useRef(false);
    const cardRef = useRef<HTMLElement>(null);
    const dragRef = useRef<{ clientX: number; clientY: number; x: number; y: number; nextX: number; nextY: number } | null>(null);
    const [position, setPosition] = useState({ x: media.x, y: media.y });
    const [isReady, setIsReady] = useState(false);
    mediaRef.current = media;

    useEffect(() => {
        if (!dragRef.current) setPosition({ x: media.x, y: media.y });
    }, [media.x, media.y]);

    useEffect(() => {
        const card = cardRef.current;
        const releaseZoom = () => card?.classList.remove("is-canvas-zooming");
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Control" || event.ctrlKey) card?.classList.add("is-canvas-zooming");
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === "Control" || !event.ctrlKey) releaseZoom();
        };
        const recoverFocus = () => {
            const active = document.activeElement;
            if (active instanceof HTMLIFrameElement && card?.contains(active)) {
                window.setTimeout(() => card.focus({ preventScroll: true }), 0);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("blur", recoverFocus);
        window.addEventListener("pointerup", releaseZoom);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("blur", recoverFocus);
            window.removeEventListener("pointerup", releaseZoom);
        };
    }, []);

    useEffect(() => {
        let active = true;
        setIsReady(false);
        void loadApi().then(() => {
            const global = window as YouTubeWindow;
            if (!active || !mountRef.current || !global.YT) return;
            playerRef.current = new global.YT.Player(mountRef.current, {
                videoId: media.videoId,
                width: "100%",
                height: "100%",
                playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1 },
                events: {
                    onReady: (event: { target: Player }) => {
                        if (!active) return;
                        playerRef.current = event.target;
                        setIsReady(true);
                    },
                    onStateChange: (event: PlayerEvent) => {
                        if (!active || remoteRef.current) return;
                        playerRef.current = event.target;
                        if (event.data === 1 || event.data === 2) {
                            onControl(event.data === 1, event.target.getCurrentTime?.() ?? 0);
                        }
                    },
                },
            });
        });
        return () => {
            active = false;
            setIsReady(false);
            playerRef.current?.destroy?.();
            playerRef.current = null;
        };
    }, [media.id, media.videoId]);

    useEffect(() => {
        const player = playerRef.current;
        if (!isReady || !player) return;
        remoteRef.current = true;
        const current = mediaRef.current;
        const expected = current.currentTime + (current.playing ? (Date.now() - current.updatedAt) / 1000 : 0);
        const actual = player.getCurrentTime?.() ?? 0;
        if (Math.abs(actual - expected) > 1.5) player.seekTo?.(expected, true);
        if (current.playing) player.playVideo?.();
        else player.pauseVideo?.();
        const timer = window.setTimeout(() => { remoteRef.current = false; }, 650);
        return () => window.clearTimeout(timer);
    }, [isReady, media.playing, media.currentTime, media.updatedAt]);

    function finishDrag() {
        const completed = dragRef.current;
        if (!completed) return;
        setPosition({ x: completed.nextX, y: completed.nextY });
        onMove(completed.nextX, completed.nextY);
        if (cardRef.current) {
            cardRef.current.style.translate = "";
            cardRef.current.classList.remove("is-dragging");
        }
        dragRef.current = null;
    }

    function togglePlayback() {
        if (!isReady) return;
        const currentTime = playerRef.current?.getCurrentTime?.() ?? media.currentTime;
        onControl(!media.playing, currentTime);
    }

    return <section ref={cardRef} tabIndex={-1} className={`shared-youtube ${theater ? "is-theater" : ""}`} style={theater ? undefined : { left: position.x, top: position.y }}>
        <header
            onPointerDown={event => {
                event.stopPropagation();
                if (theater) return;
                if ((event.target as HTMLElement).closest("button,a")) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    x: position.x,
                    y: position.y,
                    nextX: position.x,
                    nextY: position.y,
                };
                cardRef.current?.classList.add("is-dragging");
            }}
            onPointerMove={event => {
                event.stopPropagation();
                const start = dragRef.current;
                if (!start) return;
                if (event.pointerType === "mouse" && event.buttons === 0) {
                    finishDrag();
                    return;
                }
                start.nextX = Math.max(0, Math.min(4700, start.x + (event.clientX - start.clientX) / scale));
                start.nextY = Math.max(0, Math.min(3300, start.y + (event.clientY - start.clientY) / scale));
                if (cardRef.current) {
                    cardRef.current.style.translate = `${start.nextX - start.x}px ${start.nextY - start.y}px`;
                }
            }}
            onPointerUp={event => { event.stopPropagation(); finishDrag(); }}
            onPointerCancel={event => { event.stopPropagation(); finishDrag(); }}
            onLostPointerCapture={finishDrag}
        >
            <GripHorizontal size={17}/><span>YouTube compartido</span>
            <button onClick={onToggleTheater} aria-label={theater ? "Salir de pantalla completa" : "Ver en pantalla completa"}>{theater ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}</button>
            <a href={`https://youtu.be/${media.videoId}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a>
            <button onClick={onRemove}><X size={16}/></button>
        </header>
        <div className="shared-youtube-stage">
            <div className="shared-youtube-player" ref={mountRef}/>
            <button className="shared-youtube-toggle" onClick={togglePlayback} disabled={!isReady} aria-label={media.playing ? "Pausar video" : "Reproducir video"}>
                {media.playing ? <Pause size={25} fill="currentColor"/> : <Play size={25} fill="currentColor"/>}
            </button>
        </div>
        <footer><span>{isReady ? (media.playing ? "Reproduciendo" : "En pausa") : "Preparando video…"}</span><small>Último control: {media.updatedBy}</small></footer>
    </section>;
}
