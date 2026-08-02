import "./../styles/device.css";

import {

    Monitor,

    Laptop,

    Smartphone,

    Tablet

} from "lucide-react";

type Props = {

    name: string;

    type: "pc" | "laptop" | "phone" | "tablet";

    connected?: boolean;

    x?: number;

    y?: number;

    inPanel?: boolean;

};

export default function Device({

    name,

    type,

    connected = true,

    x = 0,

    y = 0,

    inPanel = false,

}: Props) {

    function renderIcon() {

        switch (type) {

            case "pc":

                return <Monitor size={34} />;

            case "laptop":

                return <Laptop size={34} />;

            case "phone":

                return <Smartphone size={34} />;

            case "tablet":

                return <Tablet size={34} />;

        }

    }

    return (

        <div
    className={inPanel ? "panel-device" : "device"}
    style={
        inPanel
            ? undefined
            : {
                  left: x,
                  top: y,
              }
    }
>

            <div className="device-avatar">

                {renderIcon()}

            </div>

            <div className="device-name">

                {name}

            </div>

            <div className="device-status">

                <span

                    className={

                        connected

                            ? "device-dot online"

                            : "device-dot offline"

                    }

                />

                {

                    connected

                        ? "Conectado"

                        : "Desconectado"

                }

            </div>

        </div>

    );

}