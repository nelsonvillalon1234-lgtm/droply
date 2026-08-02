import { useEffect, useState } from "react";
import { Check, Clock3, Link2, ScanLine, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import "./../styles/qr.css";

type Props = { roomCode: string; expiresAt: number | null; connected: boolean };

export default function QRSection({ roomCode, expiresAt, connected }: Props) {
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        const update = () => setSecondsLeft(expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0);
        update();
        const timer = window.setInterval(update, 1_000);
        return () => window.clearInterval(timer);
    }, [expiresAt]);

    if (!roomCode) return null;
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, "0");
    const pairingUrl = `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`;
    const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share;

    async function sharePairingLink() {
        try {
            if (nativeShare) {
                await nativeShare.call(navigator, { title: "Recibir archivos con Droply", text: `Usa el código ${roomCode}`, url: pairingUrl });
                return;
            }
            await navigator.clipboard.writeText(pairingUrl);
            window.dispatchEvent(new CustomEvent("droply-toast", { detail: "Enlace copiado" }));
        } catch (error) {
            if ((error as DOMException)?.name !== "AbortError") {
                window.dispatchEvent(new CustomEvent("droply-toast", { detail: "No pudimos compartir el enlace" }));
            }
        }
    }

    return (
        <div className={`qr-section${connected ? " qr-section--connected" : ""}`}>
            <div className="qr-nearby-icon">{connected ? <Check size={26} /> : <ScanLine size={26} />}</div>
            <strong className="qr-heading">{connected ? "Dispositivo encontrado" : "Acerca tu teléfono"}</strong>
            <span className="qr-subheading">{connected ? "Código utilizado y conexión confirmada" : "Escanea para conectar sin escribir el código"}</span>
            <div className="qr-wrapper">
                <QRCodeSVG value={pairingUrl} size={166} level="M" />
            </div>
            <div className="room-code">{roomCode}</div>
            <button className="qr-share-link" type="button" onClick={sharePairingLink}>
                {nativeShare ? <Share2 size={17} /> : <Link2 size={17} />}
                {nativeShare ? "Compartir enlace" : "Copiar enlace"}
            </button>
            {!connected && expiresAt && (
                <div className={`qr-expiry${secondsLeft === 0 ? " is-expired" : ""}`}>
                    <Clock3 size={14} /> {secondsLeft ? `Vence en ${minutes}:${seconds}` : "Código vencido"}
                </div>
            )}
        </div>
    );
}
