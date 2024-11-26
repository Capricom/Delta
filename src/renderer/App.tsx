import { FC, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Conversation, Response } from "./types/types";
import "@xyflow/react/dist/style.css";
import Space from "./components/Space";
import React from "react";

const useConversations = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const fetchConversations = async () => {
        const data = await window.api.getConversations();
        setConversations(data);
    };

    return { conversations, fetchConversations };
};

const useConversationResponses = () => {
    const [responses, setResponses] = useState<Response[]>([]);

    const fetchResponses = async (conversationId: string) => {
        const data = await window.api.getResponses(conversationId);
        console.log("[App] Fetching responses for conversation:", conversationId, data);
        setResponses(data);
    };

    return { responses, setResponses, fetchResponses };
};

export const App: FC = () => {
    const { responses, setResponses, fetchResponses } = useConversationResponses();
    const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>({});
    const [selectedModel, setSelectedModel] = useState<string>("llama3.2");
    const [temperature, setTemperature] = useState<number>(0.7);
    const [topP, setTopP] = useState<number>(0.9);
    const { conversations, fetchConversations } = useConversations();

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        const fetchModels = async () => {
            const data = await window.api.getModels();
            setModelsByProvider(data.modelsByProvider);
        };
        fetchModels();
    }, []);

    return (
        <ReactFlowProvider>
            <Space
                responses={responses}
                setResponses={setResponses}
                conversations={conversations}
                fetchConversations={fetchConversations}
                fetchResponses={fetchResponses}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                modelsByProvider={modelsByProvider}
                temperature={temperature}
                setTemperature={setTemperature}
                topP={topP}
                setTopP={setTopP}
            />
        </ReactFlowProvider>
    );
};
