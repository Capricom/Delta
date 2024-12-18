import React, { FC, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Conversation, Response, Settings } from "./types/types";
import "@xyflow/react/dist/style.css";
import Space from "./components/Space";


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
        setResponses(data);
    };

    return { responses, setResponses, fetchResponses };
};

export const App: FC = () => {
    const { responses, setResponses, fetchResponses } = useConversationResponses();
    const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>({});
    const [selectedModel, setSelectedModel] = useState<string>("llama3.2:latest");
    const [temperature, setTemperature] = useState<number>(0.7);
    const [topP, setTopP] = useState<number>(0.9);
    const { conversations, fetchConversations } = useConversations();
    const [settings, setSettings] = useState<Settings>({ providers: [] });

    const updateProvider = (name: string, apiKey: string) => {
        const newSettings = {
            ...settings,
            providers: [
                ...settings.providers.filter(p => p.name !== name),
                { name, apiKey }
            ]
        };
        setSettings(newSettings);
    };

    const saveSettings = async (settingsToSave: Settings) => {
        try {
            const result = await window.api.saveSettings(settingsToSave);
            if (!result) {
                throw new Error('Failed to save settings');
            }
            setSettings(settingsToSave);
            return result;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        const fetchAndFilterModels = async () => {
            const data = await window.api.getModels();
            const availableProviders = settings.providers
                .filter(p => p.apiKey && p.apiKey.trim() !== '')
                .map(p => p.name)
                .sort();
            const filteredModels = Object.fromEntries(
                Object.entries(data.modelsByProvider)
                    .filter(([provider]) => availableProviders.includes(provider) || provider === 'ollama')
                    .sort(([a], [b]) => a.localeCompare(b))
            );
            setModelsByProvider(filteredModels);

            const firstProvider = Object.keys(filteredModels)[0];
            if (firstProvider && filteredModels[firstProvider]?.length > 0) {
                setSelectedModel(filteredModels[firstProvider][0]);
            }
        };
        fetchAndFilterModels();
    }, [settings]);

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await window.api.getSettings();
            console.log("Fetched settings:", settings);
            setSettings(settings);
        };
        fetchSettings();
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
                settings={settings}
                updateProvider={updateProvider}
                saveSettings={saveSettings}
            />
        </ReactFlowProvider>
    );
};
