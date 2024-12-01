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

contextBridge.exposeInMainWorld("api", {
    test: async (data: string) => {
        console.log("testing");
        await invokeMessage("test", data);
    },
    testSend: (data: string) => {
        console.log("testing");
        sendMessage("test", data);
    },
    startStream: (options: {
        messages: Message[];
        model: string;
        temperature: number;
        topP: number;
        systemPrompt: string;
    }) => ipcRenderer.send("chat:start-stream", options),
    onStreamData: (callback) =>
        ipcRenderer.on(
            "chat:stream-data",
            (_event, message: Message) => callback(message),
        ),
    onStreamComplete: (callback) =>
        ipcRenderer.on(
            "chat:stream-complete",
            (_event, message: Message) => callback(message),
        ),
    onStreamError: (callback) =>
        ipcRenderer.on(
            "chat:stream-error",
            (_event, error: Error) => callback(error),
        ),
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
    getModels: () => ipcRenderer.invoke("models:get"),
    findSimilarResponses: (query: string) =>
        ipcRenderer.invoke("search:find", query),
    getSettings: () => {
        console.log('Preload: Invoking settings:get')
        return ipcRenderer.invoke("settings:get")
    },
    saveSettings: (
        settings: { providers: { name: string; apiKey: string }[] },
    ) => {
        console.log('Preload: Invoking settings:save with settings:', settings)
        return ipcRenderer.invoke("settings:save", settings)
    },
});

console.log("Preload script initialized");
