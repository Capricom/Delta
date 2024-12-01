import { ipcMain } from "electron";
import { ollama } from "ollama-ai-provider";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { apiKeys } from "./settings";

const getAnthropicProvider = () =>
    apiKeys.get("anthropic")
        ? createAnthropic({ apiKey: apiKeys.get("anthropic") })
        : anthropic;

const getGoogleProvider = () =>
    apiKeys.get("google")
        ? createGoogleGenerativeAI({ apiKey: apiKeys.get("google") })
        : google;

const getOpenAIProvider = () =>
    apiKeys.get("openai")
        ? createOpenAI({ apiKey: apiKeys.get("openai") })
        : openai;

export const modelProviders = {
    "llama3.2": { provider: ollama, providerName: "ollama" },
    "hermes3": { provider: ollama, providerName: "ollama" },
    "qwen2.5": { provider: ollama, providerName: "ollama" },
    "gemma2": { provider: ollama, providerName: "ollama" },
    "mistral": { provider: ollama, providerName: "ollama" },

    "gemini-1.5-flash-latest": {
        get provider() {
            return getGoogleProvider();
        },
        providerName: "google",
    },
    "gemini-1.5-pro-latest": {
        get provider() {
            return getGoogleProvider();
        },
        providerName: "google",
    },

    "claude-3-5-sonnet-20240620": {
        get provider() {
            return getAnthropicProvider();
        },
        providerName: "anthropic",
    },
    "claude-3-5-sonnet-20241022": {
        get provider() {
            return getAnthropicProvider();
        },
        providerName: "anthropic",
    },
    "claude-3-5-haiku-20241022": {
        get provider() {
            return getAnthropicProvider();
        },
        providerName: "anthropic",
    },

    "gpt-4o": {
        get provider() {
            return getOpenAIProvider();
        },
        providerName: "openai",
    },
    "gpt-4o-mini": {
        get provider() {
            return getOpenAIProvider();
        },
        providerName: "openai",
    },
    "o1-preview": {
        get provider() {
            return getOpenAIProvider();
        },
        providerName: "openai",
    },
    "o1-mini": {
        get provider() {
            return getOpenAIProvider();
        },
        providerName: "openai",
    },
} as const;

export type SupportedModel = keyof typeof modelProviders;

export function getProvider(model: string) {
    if (model in modelProviders) {
        return modelProviders[model as SupportedModel].provider;
    }
    throw new Error(`Unsupported model: ${model}`);
}

export function getProviderName(model: string) {
    if (model in modelProviders) {
        return modelProviders[model as SupportedModel].providerName;
    }
    throw new Error(`Unsupported model: ${model}`);
}

export function getEmbeddingProvider(_model: string) {
    return ollama.textEmbeddingModel("nomic-embed-text");
}

const getModelsHandler = async () => {
    try {
        const modelsByProvider: Record<string, string[]> = {};

        Object.entries(modelProviders).forEach(([model, { providerName }]) => {
            if (!modelsByProvider[providerName]) {
                modelsByProvider[providerName] = [];
            }
            modelsByProvider[providerName].push(model);
        });

        return {
            models: Object.keys(modelProviders),
            modelsByProvider,
        };
    } catch (error) {
        console.error("Error fetching models:", error);
        throw new Error("Failed to fetch models");
    }
};

export function setupModelsHandlers() {
    ipcMain.handle("models:get", getModelsHandler);
}
