import { Message } from "ai";

interface IElectronAPI {
    test: (data: string) => Promise<void>;
    testSend: (data: string) => void;
    startStream: (messages: Message[]) => void;
    onStreamData: (callback: (value: any) => void) => void;
    onStreamComplete: (callback: () => void) => void;
}

declare global {
    interface Window {
        api: IElectronAPI;
    }
}
