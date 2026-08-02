import { useEffect, useRef, useState } from "react";
import { ExternalLink, GripHorizontal, X } from "lucide-react";
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
};

export default function SharedYouTube({ media, scale, onControl, onMove, onRemove }: Props) {
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
        let active = true;
        setIsReady(false);
        void loadApi().then(() => {
            const global = window as YouTubeWindow;
            if (!active || !mountRef.current || !global.YT) return;
            playerRef.current = new global.YT.Player(mountRef.current, {
                videoId: media.videoId,
                width: "100%",
                height: "100%",
                playerVars: { playsinline: 1, rel: 0 },
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

    return <section ref={cardRef} className="shared-youtube" style={{ left: position.x, top: position.y }}>
        <header
            onPointerDown={event => {
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
                const start = dragRef.current;
                if (!start) return;
                start.nextX = Math.max(0, Math.min(4700, start.x + (event.clientX - start.clientX) / scale));
                start.nextY = Math.max(0, Math.min(3300, start.y + (event.clientY - start.clientY) / scale));
                if (cardRef.current) {
                    cardRef.current.style.translate = `${start.nextX - start.x}px ${start.nextY - start.y}px`;
                }
            }}
            onPointerUp={() => {
                const completed = dragRef.current;
                if (!completed) return;
                setPosition({ x: completed.nextX, y: completed.nextY });
                onMove(completed.nextX, completed.nextY);
                if (cardRef.current) {
                    cardRef.current.style.translate = "";
                    cardRef.current.classList.remove("is-dragging");
                }
                dragRef.current = null;
            }}
        >
            <GripHorizontal size={17}/><span>YouTube compartido</span>
            <a href={`https://youtu.be/${media.videoId}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a>
            <button onClick={onRemove}><X size={16}/></button>
        </header>
        <div className="shared-youtube-player" ref={mountRef}/>
        <footer><span>{isReady ? (media.playing ? "Reproduciendo" : "En pausa") : "Preparando video…"}</span><small>Último control: {media.updatedBy}</small></footer>
    </section>;
}
