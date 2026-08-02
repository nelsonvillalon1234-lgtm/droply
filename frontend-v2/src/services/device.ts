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

export const deviceType: "pc" | "phone" | "tablet" | "laptop" = (() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/ipad|tablet/.test(userAgent)) return "tablet";
    if (/iphone|android|mobile/.test(userAgent)) return "phone";
    return "pc";
})();

export default deviceId;
