import "./../styles/topbar.css";
import { Clock3, Globe, Menu, Settings2, Wifi } from "lucide-react";

type Props = { onMenu: () => void; connected: boolean };

export default function TopBar({ onMenu, connected }: Props) {
    const hour = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="topbar-title"><Globe size={18} /><span>Mesa Compartida</span></div>
            </div>
            <div className="topbar-center">
                <div className={`status ${connected ? "is-connected" : ""}`}>
                    <div className="status-dot" />{connected ? "Conectado" : "Sin conexión"}
                </div>
            </div>
            <div className="topbar-right">
                <div className="topbar-clock"><Clock3 size={17} />{hour}</div>
                <span className="topbar-icon"><Wifi size={18} /></span>
                <button className="topbar-icon" onClick={onMenu}><Menu size={18} /></button>
                <span className="topbar-icon"><Settings2 size={18} /></span>
            </div>
        </header>
    );
}
