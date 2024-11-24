// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type { Message } from "ai";
import { send } from "vite";

const invokeMessage = async (id: string, data: any) => {
    console.log("DEBUG: Invoking message", id, data);
    ipcRenderer.invoke(id, data);
};

const sendMessage = async (id: string, data: any) => {
    console.log("DEBUG: Sending message", id, data);
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
    startStream: (messages: Message[]) =>
        ipcRenderer.send("start-stream", messages),
    onStreamData: (callback) =>
        ipcRenderer.on("stream-data", (_event, value) => callback(value)),
    onStreamComplete: (callback) =>
        ipcRenderer.on("stream-complete", () => callback()),
});

console.log("DEBUG: Preload script initialized");
