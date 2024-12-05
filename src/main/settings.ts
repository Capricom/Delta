import path from "path";
import fs from "fs";
import { app, ipcMain } from "electron";

type Provider = "openai" | "anthropic" | "google";

interface ApiKeys {
    openAI?: string;
    anthropic?: string;
    google?: string;
    [key: string]: string | undefined;
}

export const PROVIDERS: Provider[] = ["openai", "anthropic", "google"];

const KEYS_FILE = path.join(
    app.getPath("userData"),
    "delta_data",
    "config.json",
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
        const data = loadKeys();
        data[key.toString()] = value;
        saveKeys(data);
    },
    get: (key: keyof ApiKeys) => {
        const data = loadKeys();
        return data[key.toString()];
    },
    delete: (key: keyof ApiKeys) => {
        const data = loadKeys();
        delete data[key.toString()];
        saveKeys(data);
    },
};

function getSettingsHandler(_event: any) {
    try {
        const data = loadKeys();
        const providers = PROVIDERS.map((name) => ({
            name,
            apiKey: data[name] || "",
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
            if (apiKey) {
                data[name] = apiKey;
            } else {
                delete data[name];
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
