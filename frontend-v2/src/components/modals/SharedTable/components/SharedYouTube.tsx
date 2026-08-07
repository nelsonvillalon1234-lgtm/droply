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

    apiPromise = new Promise((resolve, reject) => {
        let completed = false;
        const finish = () => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timeout);
            resolve();
        };
        const fail = () => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timeout);
            apiPromise = null;
            reject(new Error("No se pudo cargar YouTube"));
        };
        const timeout = window.setTimeout(fail, 15_000);
        const previous = global.onYouTubeIframeAPIReady;

        global.onYouTubeIframeAPIReady = () => {
            previous?.();
            finish();
        };

        const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
        if (existing) {
            existing.addEventListener("error", fail, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.addEventListener("error", fail, { once: true });
        document.head.appendChild(script);
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

function projectedTime(media: SharedMedia) {
    if (!media.playing) return media.currentTime;
    const elapsed = Math.max(0, Math.min((Date.now() - media.updatedAt) / 1000, 2 * 60 * 60));
    return media.currentTime + elapsed;
}

export default function SharedYouTube({ media, scale, onControl, onMove, onRemove, theater = false, onToggleTheater }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const mediaRef = useRef(media);
    const remoteRef = useRef(false);
    const activatedRef = useRef(false);
    const cardRef = useRef<HTMLElement>(null);
    const dragRef = useRef<{ clientX: number; clientY: number; x: number; y: number; nextX: number; nextY: number } | null>(null);
    const [position, setPosition] = useState({ x: media.x, y: media.y });
    const [isReady, setIsReady] = useState(false);
    const [needsActivation, setNeedsActivation] = useState(media.playing);
    const [loadError, setLoadError] = useState(false);
    const playerKey = `${media.id}:${media.videoId}:${media.instanceId ?? 0}`;

    useEffect(() => {
        mediaRef.current = media;
    }, [media]);

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
        setLoadError(false);
        setNeedsActivation(media.playing);
        activatedRef.current = false;

        void loadApi().then(() => {
            const global = window as YouTubeWindow;
            if (!active || !mountRef.current || !global.YT) return;

            playerRef.current = new global.YT.Player(mountRef.current, {
                videoId: media.videoId,
                width: "100%",
                height: "100%",
                playerVars: {
                    playsinline: 1,
                    rel: 0,
                    controls: 1,
                    disablekb: 0,
                    enablejsapi: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: (event: { target: Player }) => {
                        if (!active) return;
                        playerRef.current = event.target;
                        const current = mediaRef.current;
                        const expected = projectedTime(current);
                        event.target.seekTo?.(expected, true);
                        if (!current.playing) event.target.pauseVideo?.();
                        setNeedsActivation(current.playing);
                        setIsReady(true);
                    },
                    onStateChange: (event: PlayerEvent) => {
                        if (!active) return;
                        playerRef.current = event.target;
                        if (event.data === 1) {
                            activatedRef.current = true;
                            setNeedsActivation(false);
                        }
                        if (remoteRef.current) return;
                        if (event.data === 1 || event.data === 2) {
                            onControl(event.data === 1, event.target.getCurrentTime?.() ?? 0);
                        }
                    },
                    onError: () => {
                        if (!active) return;
                        setLoadError(true);
                        setIsReady(false);
                    },
                },
            });
        }).catch(() => {
            if (!active) return;
            setLoadError(true);
            setIsReady(false);
        });

        return () => {
            active = false;
            setIsReady(false);
            playerRef.current?.destroy?.();
            playerRef.current = null;
        };
    }, [media.id, media.videoId, media.instanceId]);

    useEffect(() => {
        const player = playerRef.current;
        if (!isReady || !player) return;

        remoteRef.current = true;
        const current = mediaRef.current;
        const expected = projectedTime(current);
        const actual = player.getCurrentTime?.() ?? 0;

        if (Math.abs(actual - expected) > 1.5) player.seekTo?.(expected, true);

        if (current.playing) {
            if (activatedRef.current) {
                player.playVideo?.();
                setNeedsActivation(false);
            } else {
                setNeedsActivation(true);
            }
        } else {
            player.pauseVideo?.();
            setNeedsActivation(false);
        }

        const timer = window.setTimeout(() => { remoteRef.current = false; }, 650);
        return () => window.clearTimeout(timer);
    }, [isReady, media.playing, media.currentTime, media.updatedAt]);

    function togglePlayback() {
        const player = playerRef.current;
        if (!isReady || !player) return;

        const current = mediaRef.current;
        const shouldPlay = needsActivation || !current.playing;
        const expected = projectedTime(current);
        const actual = player.getCurrentTime?.() ?? expected;
        const time = shouldPlay ? expected : actual;

        activatedRef.current = true;
        remoteRef.current = true;
        setNeedsActivation(false);

        if (shouldPlay) {
            if (Math.abs(actual - expected) > 1.5) player.seekTo?.(expected, true);
            player.playVideo?.();
        } else {
            player.pauseVideo?.();
        }

        onControl(shouldPlay, time);
        window.setTimeout(() => { remoteRef.current = false; }, 650);
    }

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
            <div key={playerKey} className="shared-youtube-player" ref={mountRef}/>
            {!loadError && <button
                type="button"
                className={`shared-youtube-toggle ${needsActivation ? "needs-activation" : media.playing ? "is-playing" : ""}`}
                onClick={togglePlayback}
                disabled={!isReady}
                aria-label={needsActivation ? "Reanudar video" : media.playing ? "Pausar video" : "Reproducir video"}
            >
                {needsActivation ? <><Play size={18}/><span>Reanudar video</span></> : media.playing ? <Pause size={22}/> : <Play size={22}/>}
            </button>}
        </div>
        <footer>
            <span>{loadError ? "YouTube fue bloqueado o no pudo cargar" : isReady ? (media.playing && !needsActivation ? "Reproduciendo" : "En pausa") : "Preparando video…"}</span>
            <small>Último control: {media.updatedBy}</small>
        </footer>
    </section>;
}
