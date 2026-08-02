export type PersistedFileHandle = {
    getFile: () => Promise<File>;
    queryPermission: (options?: { mode: "read" }) => Promise<PermissionState>;
    requestPermission: (options?: { mode: "read" }) => Promise<PermissionState>;
};

const DATABASE = "droply-local-sources";
const STORE = "handles";

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveFileHandle(itemId: string, handle: PersistedFileHandle) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).put(handle, itemId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
}

export async function getFileHandle(itemId: string): Promise<PersistedFileHandle | null> {
    const database = await openDatabase();
    const handle = await new Promise<PersistedFileHandle | null>((resolve, reject) => {
        const request = database.transaction(STORE).objectStore(STORE).get(itemId);
        request.onsuccess = () => resolve((request.result as PersistedFileHandle | undefined) ?? null);
        request.onerror = () => reject(request.error);
    });
    database.close();
    return handle;
}
