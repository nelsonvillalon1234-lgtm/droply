class DeviceManager {

    private devices = new Map<string, string>();

    register(deviceId: string, socketId: string) {
        for (const [storedDeviceId, storedSocketId] of this.devices) {
            if (storedSocketId === socketId || (storedDeviceId === deviceId && storedSocketId !== socketId)) {
                this.devices.delete(storedDeviceId);
            }
        }
        this.devices.set(deviceId, socketId);

    }

    unregister(socketId: string) {

        for (const [deviceId, id] of this.devices) {

            if (id === socketId) {

                this.devices.delete(deviceId);

                break;

            }

        }

    }

    getSocket(deviceId: string) {

        return this.devices.get(deviceId);

    }

    getSocketByDevice(deviceId: string) {

    return this.devices.get(deviceId);

}

    ownsSocket(deviceId: string, socketId: string) {
        return this.devices.get(deviceId) === socketId;
    }

}

export default new DeviceManager();
