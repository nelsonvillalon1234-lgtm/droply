import { CheckCircle2, LoaderCircle } from "lucide-react";
import "./../styles/status.css";

type Props = { connected: boolean; peerName?: string };

export default function ConnectionStatus({ connected, peerName }: Props) {
    return (
        <div className={`connection-status ${connected ? "connected" : "waiting"}`}>
            <div className="status-icon">
                {connected ? <CheckCircle2 size={22} /> : <LoaderCircle size={22} className="status-spin" />}
            </div>
            <div className="status-text">
                <h4>{connected ? `${peerName || "Dispositivo"} conectado` : "Esperando conexión"}</h4>
                <p>{connected ? "Identidad confirmada. Preparando conexión directa segura." : "Escanea el QR o ingresa el código de un solo uso."}</p>
            </div>
        </div>
    );
}
