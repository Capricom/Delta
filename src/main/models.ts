import { ipcMain } from "electron";

import { ollama } from "ollama-ai-provider";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

export const modelProviders = {
    "llama3.2": { provider: ollama, providerName: "ollama" },
    "hermes3": { provider: ollama, providerName: "ollama" },
    "qwen2.5": { provider: ollama, providerName: "ollama" },
    "gemma2": { provider: ollama, providerName: "ollama" },
    "mistral": { provider: ollama, providerName: "ollama" },

    "gemini-1.5-flash-latest": { provider: google, providerName: "google" },
    "gemini-1.5-pro-latest": { provider: google, providerName: "google" },

    "claude-3-5-sonnet-20240620": {
        provider: anthropic,
        providerName: "anthropic",
    },
    "claude-3-5-sonnet-20241022": {
        provider: anthropic,
        providerName: "anthropic",
    },
    "claude-3-5-haiku-20241022": {
        provider: anthropic,
        providerName: "anthropic",
    },

    "gpt-4o": { provider: openai, providerName: "openai" },
    "gpt-4o-mini": { provider: openai, providerName: "openai" },
    "o1-preview": { provider: openai, providerName: "openai" },
    "o1-mini": { provider: openai, providerName: "openai" },
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
