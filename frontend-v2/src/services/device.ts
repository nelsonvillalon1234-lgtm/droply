const storedId =
    localStorage.getItem("droply-device-id");

const deviceId: string =
    storedId ?? crypto.randomUUID();

if (!storedId) {

    localStorage.setItem(
        "droply-device-id",
        deviceId
    );

}

const storedName =
    localStorage.getItem("droply-device-name");

export const deviceName =
    storedName ?? "";

export default deviceId;
