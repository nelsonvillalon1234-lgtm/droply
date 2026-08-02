type Device = {

    id: string;

    name: string;

    type: "pc" | "laptop" | "phone" | "tablet";

};

export default function useDeviceLayout(
    devices: Device[]
) {

    const centerX = 520;

    const centerY = 300;

    const radius = 230;

    return devices.map((device, index) => {

        const angle =

            (Math.PI * 2 * index) /

            devices.length;

        return {

            ...device,

            x:

                centerX +

                radius *

                    Math.cos(angle),

            y:

                centerY +

                radius *

                    Math.sin(angle)

        };

    });

}