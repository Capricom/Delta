import Store from "electron-store";

interface ApiKeys {
    openAI?: string;
    anthropic?: string;
    [key: string]: string | undefined;
}

const store = new Store<ApiKeys>({
    name: "delta-app-api-keys",
    encryptionKey: process.env.ENCRYPTION_KEY || "your-secure-key",
});

export const apiKeys = {
    set: (key: keyof ApiKeys, value: string) => {
        (store as any).set(key, value);
    },
    get: (key: keyof ApiKeys) => {
        return (store as any).get(key);
    },
    delete: (key: keyof ApiKeys) => {
        (store as any).delete(key);
    },
};
