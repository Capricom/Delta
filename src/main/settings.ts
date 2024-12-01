import path from "path";
import fs from "fs";
import { app, ipcMain, safeStorage } from "electron";

type Provider = "openai" | "anthropic" | "google";

interface ApiKeys {
    openAI?: string;
    anthropic?: string;
    google?: string;
    [key: string]: string | undefined;
}

export const PROVIDERS: Provider[] = ["openai", "anthropic", "google"];

const encryptKey = (key: string, value: string): Buffer => {
    return safeStorage.encryptString(JSON.stringify({ [key]: value }));
};

const decryptKey = (encrypted: Buffer): { key: string; value: string } => {
    const decrypted = JSON.parse(safeStorage.decryptString(encrypted));
    const key = Object.keys(decrypted)[0];
    return { key, value: decrypted[key] };
};

const KEYS_FILE = path.join(
    app.getPath("userData"),
    "delta_data",
    "encrypted-keys.json",
);

function loadKeys(): Record<string, string> {
    if (fs.existsSync(KEYS_FILE)) {
        return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
    }
    fs.writeFileSync(KEYS_FILE, JSON.stringify({}));
    return {};
}

function saveKeys(data: Record<string, string>) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(data));
}

export const apiKeys = {
    set: (key: keyof ApiKeys, value: string) => {
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error("Encryption is not available");
        }
        const encrypted = encryptKey(key.toString(), value);
        const data = loadKeys();
        data[`api_keys.${key.toString()}`] = encrypted.toString("base64");
        saveKeys(data);
    },
    get: (key: keyof ApiKeys) => {
        const data = loadKeys();
        const encrypted = data[`api_keys.${key.toString()}`] ||
            data[key.toString()];
        if (!encrypted) return undefined;
        return decryptKey(Buffer.from(encrypted, "base64")).value;
    },
    delete: (key: keyof ApiKeys) => {
        const data = loadKeys();
        delete data[`api_keys.${key.toString()}`];
        saveKeys(data);
    },
};

function getSettingsHandler(_event: any) {
    try {
        const data = loadKeys();
        const providers = PROVIDERS.map((name) => ({
            name,
            apiKey: data[`api_keys.${name}`]
                ? decryptKey(Buffer.from(data[`api_keys.${name}`], "base64"))
                    .value
                : "",
        }));
        return { providers };
    } catch (error) {
        console.error("Error loading settings:", error);
        return { providers: PROVIDERS.map((name) => ({ name, apiKey: "" })) };
    }
}

async function saveSettingsHandler(
    _event: any,
    settings: { providers: { name: string; apiKey: string }[] },
) {
    try {
        const data = loadKeys();
        settings.providers.forEach(({ name, apiKey }) => {
            const key = `api_keys.${name}`;
            if (apiKey) {
                const encrypted = encryptKey(name, apiKey);
                data[key] = encrypted.toString("base64");
            } else {
                delete data[key];
            }
        });
        saveKeys(data);
        return true;
    } catch (error) {
        console.error("Main: Error saving settings:", error);
        throw error;
    }
}

export function setupSettingsHandlers() {
    ipcMain.handle("settings:get", getSettingsHandler);
    ipcMain.handle("settings:save", saveSettingsHandler);
}
