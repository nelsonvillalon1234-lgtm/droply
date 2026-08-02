import "./../styles/centerAction.css";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Clock3, LoaderCircle, Plus } from "lucide-react";

export type RecentRoom = { code: string; openedAt: number; expiresAt: number };

type Props = {

    creating: boolean;

    onCreateRoom: () => void;

    onJoinRoom: (code: string) => void;

    recentRooms: RecentRoom[];

};

export default function CenterAction({

    creating,

    onCreateRoom,

    onJoinRoom,

    recentRooms,

}: Props) {

    const [joinCode, setJoinCode] = useState("");

    function submitJoin(event: FormEvent) {
        event.preventDefault();
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) return;
        onJoinRoom(code);
    }

    return (

        <div className="center-action">

            <button

                className="center-action-circle"

                onClick={onCreateRoom}

                disabled={creating}

            >

                {

                    creating

                        ? <LoaderCircle className="spin" size={38} />

                        : <Plus size={42} strokeWidth={2.5} />

                }

            </button>

            <span className="create-room-label">Crear una mesa</span>

            <span className="center-action-divider">o únete con un código</span>

            <form className="join-room-form" onSubmit={submitJoin}>
                <input
                    aria-label="Código de la mesa"
                    inputMode="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.replace(/[^a-zA-Z2-9]/g, "").toUpperCase())}
                    placeholder="ABC234"
                />
                <button type="submit" disabled={joinCode.length !== 6 || creating} aria-label="Unirse a la mesa">
                    <ArrowRight size={20} />
                </button>
            </form>

            {recentRooms.length > 0 && (
                <section className="recent-rooms" aria-label="Mesas recientes">
                    <div className="recent-rooms-title"><Clock3 size={14} /> Mesas recientes</div>
                    {recentRooms.map(room => (
                        <button key={room.code} type="button" onClick={() => onJoinRoom(room.code)} disabled={creating}>
                            <span><strong>Mesa {room.code}</strong><small>Abierta recientemente</small></span>
                            <ArrowRight size={17} />
                        </button>
                    ))}
                </section>
            )}

        </div>

    );

}
