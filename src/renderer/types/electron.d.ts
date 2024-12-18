import { Message } from "ai";
import {
    AdminFunctions,
    Conversation,
    Response,
    Settings,
    SimilarResponse,
} from "./types";

interface IElectronAPI {
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
    removeStreamDataListener: (
        callback: (data: { value: string; timestamp: number }) => void,
    ) => void;
    removeStreamCompleteListener: (
        callback: (message: Message) => void,
    ) => void;
    removeStreamErrorListener: (callback: (error: Error) => void) => void;
    getConversations: () => Promise<Conversation[]>;
    getResponses: (conversationId: string) => Promise<Response[]>;
    deleteConversation: (
        conversationId: string,
    ) => Promise<{ success: boolean }>;
    deleteResponse: (
        conversationId: string,
        responseId: string,
    ) => Promise<{ success: boolean }>;
    generateSummary: (
        messages: Message[],
        model: string,
        responseId: string,
        conversationId: string,
    ) => Promise<{
        id: string;
        summary: string;
    }>;
    getModels: () => Promise<{ modelsByProvider: Record<string, string[]> }>;
    checkOllamaStatus: (url: string) => Promise<boolean>;
    findSimilarResponses: (
        options: {
            query: string;
            searchType?: "vector" | "text" | "combined";
            limit?: number;
            offset?: number;
        },
    ) => Promise<SimilarResponse[]>;
    getSettings: () => Promise<Settings>;
    saveSettings: (
        settings: { providers: { name: string; apiKey: string }[] },
    ) => Promise<boolean>;
    admin: AdminFunctions;
}

declare global {
    interface Window {
        api: IElectronAPI;
    }
}
