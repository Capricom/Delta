import { Message } from "ai";
import { Conversation, Response, SimilarResponse } from "./types";

interface IElectronAPI {
    test: (data: string) => Promise<void>;
    testSend: (data: string) => void;
    startStream: (
        options: {
            messages: Message[];
            model: string;
            temperature: number;
            topP: number;
            systemPrompt: string;
        },
    ) => void;
    onStreamData: (callback: (value: any) => void) => void;
    onStreamComplete: (
        callback: (event: any, message: Message) => void,
    ) => void;
    onStreamError: (callback: (event: any, error: Error) => void) => void;
    getConversations: () => Promise<Conversation[]>;
    getResponses: (conversationId: string) => Promise<Response[]>;
    deleteConversation: (
        conversationId: string,
    ) => Promise<{ success: boolean }>;
    deleteResponse: (
        conversationId: string,
        responseId: string,
    ) => Promise<{ success: boolean }>;
    getModels: () => Promise<{ modelsByProvider: Record<string, string[]> }>;
    findSimilarResponses: (query: string) => Promise<SimilarResponse[]>;
    getSettings: () => Promise<
        { providers: { name: string; apiKey: string }[] }
    >;
    saveSettings: (
        settings: { providers: { name: string; apiKey: string }[] },
    ) => Promise<boolean>;
}

declare global {
    interface Window {
        api: IElectronAPI;
    }
}
