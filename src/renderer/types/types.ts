import { RunResult } from "better-sqlite3";

export interface Attachment {
    id: string;
    response_id: string;
    file_path: string;
    type: string;
    created_at: string;
    url?: string;
}

export interface DbResponse {
    id: string;
    model: string;
    provider: string;
    prompt: string;
    system: string;
    response: string;
    conversation_id: string;
    parent_id: string;
    duration_ms: number;
    datetime_utc: string;
    temperature: number;
    top_p: number;
    attachments: string;
}

export interface Response {
    id: string;
    model: string;
    provider: string;
    prompt: string;
    system: string;
    response: string;
    conversation_id: string;
    parent_id: string;
    duration_ms: number;
    datetime_utc: string;
    temperature: number;
    top_p: number;
    attachments: string[];
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

export interface DbInsertData {
    [key: string]: any;
}

export interface EmbeddingData {
    prompt_embedding: number[];
    response_embedding: number[];
    model: string;
}

export interface DbFunctions {
    ensureTable: () => void;
    insert: (tableName: string, data: DbInsertData) => RunResult;
    getAllConversations: () => Conversation[];
}

export interface SimilarResponse {
    id: number;
    response_id: string;
    conversation_id: string;
    type: "prompt" | "response";
    prompt: string;
    response: string;
    text: string;
    distance: number;
    model: string;
    provider: string;
    datetime_utc: string;
}

export interface SpaceProps {
    // Conversation/Response data
    conversations: Conversation[];
    responses: Response[];

    // Data fetching/updating
    fetchConversations: () => void;
    fetchResponses: (conversationId: string) => void;
    setResponses: (responses: Response[]) => void;

    // Model settings
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    modelsByProvider: Record<string, string[]>;
    temperature: number;
    setTemperature: (temp: number) => void;
    topP: number;
    setTopP: (topP: number) => void;

    // Settings
    settings: Settings;
    updateProvider: (name: string, apiKey: string) => void;
    saveSettings: (settings: Settings) => Promise<boolean>;
}

export interface ExpandedState {
    prompt: boolean;
    response: boolean;
    promptRaw: boolean;
    responseRaw: boolean;
}

export interface ModelProvider {
    name: string;
    apiKey: string;
}

export interface Settings {
    providers: ModelProvider[];
}
