import { useEffect, useRef, useState } from "react";
import "../styles/clipboard.css";
import ClipboardManager from "../core/ClipboardManager";
import PeerManager from "../core/PeerManager";


function ClipboardPanel() {

    const [text, setText] = useState("");
    const [autoSync, setAutoSync] = useState(false);
    const lastClipboard = useRef("");

    useEffect(() => {

    PeerManager.setOnClipboard(

        (value) => {

            lastClipboard.current = value;

            setText(value);

        }

    );

}, []);

    useEffect(() => {

    if (!autoSync)
        return;

    const interval = setInterval(

        async () => {

            const current = await ClipboardManager.readText();

            if (

                current &&
                current !== lastClipboard.current

            ) {

                lastClipboard.current = current;

                setText(current);

                PeerManager.sendClipboard(

                    current

                );

                console.log(

                    "🔄 Sincronizado:",

                    current

                );

            }

        },

        1000

    );

    return () => {

        clearInterval(interval);

    };

}, [autoSync]);

    async function handleReadClipboard() {

        const value = await ClipboardManager.readText();

        setText(value);

    }

    async function handleCopyClipboard() {

        await ClipboardManager.writeText(text);

    }

    return (

        <div className="clipboard-panel">

            <h2>

                📋 Portapapeles

            </h2>

            <textarea
            

                className="clipboard-input"

                value={text}

                onChange={(e) =>

                    setText(e.target.value)

                }

                placeholder="Copia algo y aparecerá aquí"

            />
            <label className="clipboard-switch">

    <input
        type="checkbox"
        checked={autoSync}
        onChange={(e) => {

            setAutoSync(
                e.target.checked
            );

        }}
    />

    Sincronizar automáticamente

</label>
            

            <div className="clipboard-actions">

    <button
        className="primary-btn"
        onClick={handleReadClipboard}
    >
        📋 Pegar
    </button>

    <button
        className="primary-btn"
        onClick={() => {

            PeerManager.sendClipboard(
                text
            );

        }}
    >
        📤 Enviar
    </button>

    <button
        className="primary-btn"
        onClick={handleCopyClipboard}
    >
        📥 Copiar
    </button>

</div>

        </div>

    );

}

export default ClipboardPanel;