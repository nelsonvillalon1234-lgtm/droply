import "./../styles/centerAction.css";

import {
    LoaderCircle,
    Plus
} from "lucide-react";

type Props = {

    creating: boolean;

    onCreateRoom: () => void;

};

export default function CenterAction({

    creating,

    onCreateRoom,

}: Props) {

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

            <span className="create-room-label">

                Crear Sala

            </span>

        </div>

    );

}