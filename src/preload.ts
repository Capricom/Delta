// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type { Message } from "ai";

const invokeMessage = async (id: string, data: any) => {
    console.log("Invoking message", id, data);
    return ipcRenderer.invoke(id, data);
};

const sendMessage = async (id: string, data: any) => {
    console.log("Sending message", id, data);
    ipcRenderer.send(id, data);
};
const onMessageHandler = (
    id: string,
    cb: {
        (evt: any, data: any): any;
        (event: Electron.IpcRendererEvent, ...args: any[]): void;
    },
) => ipcRenderer.on(id, cb);
const onMessage = (msg: any, cb: (arg0: any) => any) =>
    onMessageHandler(msg, (evt: any, data: any) => cb(data));

const createEventHandler = (callback: any) => (_event: any, message: any) =>
    callback(message);

contextBridge.exposeInMainWorld("api", {
    startStream: (options: {
        messages: Message[];
        model: string;
        temperature: number;
        topP: number;
        systemPrompt: string;
    }) => ipcRenderer.send("chat:start-stream", options),
    onStreamData: (callback) => {
        const handler = createEventHandler(callback);
        ipcRenderer.on("chat:stream-data", handler);
        return handler; // Return the handler for removal
    },
    onStreamComplete: (callback) => {
        const handler = createEventHandler(callback);
        ipcRenderer.on("chat:stream-complete", handler);
        return handler;
    },
    onStreamError: (callback) => {
        const handler = (_event: any, error: Error) =>
            callback(new Error(error.message));
        ipcRenderer.on("chat:stream-error", handler);
        return handler;
    },
    removeStreamDataListener: (handler) => {
        if (handler) ipcRenderer.removeListener("chat:stream-data", handler);
    },
    removeStreamCompleteListener: (handler) => {
        if (handler) {
            ipcRenderer.removeListener("chat:stream-complete", handler);
        }
    },
    removeStreamErrorListener: (handler) => {
        if (handler) ipcRenderer.removeListener("chat:stream-error", handler);
    },
    getConversations: () => ipcRenderer.invoke("conversations:get"),
    getResponses: (conversationId: string) =>
        ipcRenderer.invoke("conversations:getResponses", conversationId),
    deleteConversation: (conversationId: string) =>
        ipcRenderer.invoke("conversations:delete", conversationId),
    deleteResponse: (conversationId: string, responseId: string) =>
        ipcRenderer.invoke("conversations:deleteResponse", {
            conversationId,
            responseId,
        }),
    generateSummary: (
        messages: Message[],
        model: string,
        responseId: string,
        conversationId: string,
    ) => ipcRenderer.invoke("summary:generate", {
        messages,
        model,
        responseId,
        conversationId,
    }),
    getSummariesByConversation: (conversationId: string) =>
        ipcRenderer.invoke("summary:getByConversation", conversationId),
    getModels: () => ipcRenderer.invoke("models:get"),
    checkOllamaStatus: (url: string) =>
        ipcRenderer.invoke("models:checkOllama", url),
    findSimilarResponses: (
        options: {
            query: string;
            searchType?: "vector" | "text" | "combined";
            limit?: number;
            offset?: number;
        },
    ) => invokeMessage("search:find", options),
    getSettings: () => {
        return invokeMessage("settings:get", {});
    },
    saveSettings: (
        settings: { providers: { name: string; apiKey: string }[] },
    ) => {
        return invokeMessage("settings:save", settings);
    },
    admin: {
        backfillFTSData: async () => {
            return invokeMessage("admin:backfillFTSData", {});
        },
        backfillEmbeddings: async () => {
            return invokeMessage("admin:backfillEmbeddings", {});
        },
    },
});
