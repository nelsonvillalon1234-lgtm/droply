import { useEffect, useRef, useState } from "react";
import { ExternalLink, GripHorizontal, X } from "lucide-react";
import type { SharedMedia } from "../types";

type Player = { playVideo:()=>void; pauseVideo:()=>void; seekTo:(time:number,ahead:boolean)=>void; getCurrentTime:()=>number; destroy:()=>void };
type YouTubeWindow = Window & { YT?: { Player: new (element:HTMLElement, options:object)=>Player }; onYouTubeIframeAPIReady?:()=>void };
let apiPromise: Promise<void> | null = null;
function loadApi() {
    const global = window as YouTubeWindow;
    if (global.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
        const previous = global.onYouTubeIframeAPIReady;
        global.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const script=document.createElement("script"); script.src="https://www.youtube.com/iframe_api"; document.head.appendChild(script);
        }
    });
    return apiPromise;
}

type Props={media:SharedMedia;scale:number;onControl:(playing:boolean,time:number)=>void;onMove:(x:number,y:number)=>void;onRemove:()=>void};
export default function SharedYouTube({media,scale,onControl,onMove,onRemove}:Props){
    const mountRef=useRef<HTMLDivElement>(null); const playerRef=useRef<Player|null>(null); const remoteRef=useRef(false);
    const dragRef=useRef<{clientX:number;clientY:number;x:number;y:number}|null>(null); const [drag,setDrag]=useState<{x:number;y:number}|null>(null);
    useEffect(()=>{let active=true;void loadApi().then(()=>{const global=window as YouTubeWindow;if(!active||!mountRef.current||!global.YT)return;playerRef.current=new global.YT.Player(mountRef.current,{videoId:media.videoId,width:"100%",height:"100%",playerVars:{playsinline:1,rel:0},events:{onReady:()=>{const expected=media.currentTime+(media.playing?(Date.now()-media.updatedAt)/1000:0);playerRef.current?.seekTo(expected,true);},onStateChange:(event:{data:number})=>{if(remoteRef.current)return;if(event.data===1||event.data===2)onControl(event.data===1,playerRef.current?.getCurrentTime()??0);}}});});return()=>{active=false;playerRef.current?.destroy();playerRef.current=null;};},[media.id,media.videoId]);
    useEffect(()=>{const player=playerRef.current;if(!player)return;remoteRef.current=true;const expected=media.currentTime+(media.playing?(Date.now()-media.updatedAt)/1000:0);if(Math.abs((player.getCurrentTime?.()??0)-expected)>1.5)player.seekTo(expected,true);if(media.playing)player.playVideo();else player.pauseVideo();const timer=window.setTimeout(()=>{remoteRef.current=false;},650);return()=>clearTimeout(timer);},[media.playing,media.currentTime,media.updatedAt]);
    return <section className="shared-youtube" style={{left:drag?.x??media.x,top:drag?.y??media.y}}>
        <header onPointerDown={e=>{if((e.target as HTMLElement).closest("button,a"))return;e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={clientX:e.clientX,clientY:e.clientY,x:media.x,y:media.y};}} onPointerMove={e=>{const d=dragRef.current;if(!d)return;setDrag({x:Math.max(0,Math.min(4700,d.x+(e.clientX-d.clientX)/scale)),y:Math.max(0,Math.min(3300,d.y+(e.clientY-d.clientY)/scale))});}} onPointerUp={()=>{if(drag)onMove(drag.x,drag.y);dragRef.current=null;setDrag(null);}}><GripHorizontal size={17}/><span>YouTube compartido</span><a href={`https://youtu.be/${media.videoId}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a><button onClick={onRemove}><X size={16}/></button></header>
        <div className="shared-youtube-player" ref={mountRef}/><footer><span>{media.playing?"Reproduciendo":"En pausa"}</span><small>Último control: {media.updatedBy}</small></footer>
    </section>;
}
