import React from 'react';
import { useEffect, useCallback, useState } from "react";
import {
    ReactFlow,
    Controls,
    MiniMap,
    useReactFlow,
} from '@xyflow/react';
import { SpaceProps } from '../types/types';
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Menu, SettingsIcon } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import ChatInterface from "./ChatInterface";
import Sidebar from "./Sidebar";
import '@xyflow/react/dist/style.css';
import { useSpaceState } from "../hooks/useSpaceState";
import { useChat } from '../hooks/useChat';
import { useFlowManagement } from '../hooks/useFlowManagement';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useMessageManagement } from '../hooks/useMessageManagement';

export enum ResizeTrigger {
    CONVERSATION_SWITCH = 'conversation_switch',
    NODE_DELETE = 'node_delete',
    NEW_RESPONSE = 'new_response',
    NONE = 'none'
}

export default function Space({ responses,
    setResponses,
    conversations,
    fetchConversations,
    fetchResponses,
    selectedModel,
    setSelectedModel,
    modelsByProvider,
    temperature,
    setTemperature,
    topP,
    setTopP,
    settings,
    updateProvider,
    saveSettings,
}: SpaceProps) {
    const reactFlowInstance = useReactFlow();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [resizeTrigger, setResizeTrigger] = useState<ResizeTrigger>(ResizeTrigger.NONE);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const {
        nodes,
        setNodes,
        onNodesChange,
        edges,
        setEdges,
        onEdgesChange,
        expandedNodes,
        setExpandedNodes,
        isFullScreen,
        setIsFullScreen,
        selectedResponseId,
        setSelectedResponseId,
        systemPrompt,
        setSystemPrompt,
        droppedImages,
        setDroppedImages,
        chatTextareaRef,
    } = useSpaceState();

    const { messages, input, handleInputChange, handleSubmit, setMessages, reload, error } = useChat({
        body: {
            model: selectedModel,
            temperature: temperature,
            topP: topP,
            systemPrompt: systemPrompt,
        },
        onFinish: (message: any) => {
            const conversationId = message.annotations?.find((a: any) => a.field === "conversationId")?.id;
            const parentId = message.annotations?.find((a: any) => a.field === "parentId")?.id;
            if (conversationId) {
                fetchResponses(conversationId);
                if (!parentId) {
                    fetchConversations();
                }
            }
        },
    });

    const handleDeleteResponse = useCallback(async (responseId: string) => {
        const deleteResponses = async (id: string) => {
            await window.api.deleteResponse(responses[0].conversation_id, id);

            const children = responses.filter(r => r.parent_id === id);
            for (const child of children) {
                await deleteResponses(child.id);
            }
        };

        await deleteResponses(responseId);
        fetchResponses(responses[0].conversation_id);
    }, [responses, fetchResponses]);

    const { updateNodesAndEdges } = useFlowManagement({
        responses,
        expandedNodes,
        selectedResponseId,
        systemPrompt,
        setExpandedNodes,
        setNodes,
        setEdges,
        handleDeleteResponse,
        resizeTrigger,
        setResizeTrigger,
    });

    const focusChatTextArea = () => {
        chatTextareaRef.current?.focus();
    }

    const handleNewConversation = useCallback(() => {
        setMessages([]);
        setNodes([]);
        setEdges([]);
        setResponses([]);
        setExpandedNodes({});
        focusChatTextArea()
    }, []);

    useKeyboardShortcuts({
        setSidebarOpen,
        setIsFullScreen,
        handleNewConversation,
        focusChatTextArea,
        setIsSettingsModalOpen,
    });

    const {
        onNodeClick,
        onMessageClick,
        onSearchResultSelect,
        onRegenerateClick,
    } = useMessageManagement({
        responses,
        setMessages,
        reload,
        isFullScreen,
        setIsFullScreen,
        setSelectedResponseId,
        reactFlowInstance,
    });

    useEffect(() => {
        updateNodesAndEdges();
    }, [responses, nodes.length, expandedNodes, selectedResponseId, systemPrompt]);

    return (
        <div className="flex min-h-screen relative dark:bg-gray-900">
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                conversations={conversations}
                fetchResponses={fetchResponses}
                fetchConversations={fetchConversations}
                handleNewConversation={handleNewConversation}
                setMessages={setMessages}
                setExpandedNodes={setExpandedNodes}
                setResizeTrigger={setResizeTrigger}
                onSearchResultSelect={onSearchResultSelect}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
            />
            {isSidebarOpen && (
                <div className="absolute top-4 right-4">
                    <SettingsIcon
                        className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                        onClick={() => setIsSettingsModalOpen(true)}
                        size={20}
                    />
                </div>
            )}
            <div className={`border-l border-gray-200 dark:border-gray-700 ${isSidebarOpen ? '' : 'hidden'}`}></div>
            <div className={`${isFullScreen === 'chat' ? 'hidden' : ''} ${isFullScreen === 'none' ? 'w-3/5' : 'w-full'} relative`}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitViewOptions={{ padding: 1.5 }}
                    minZoom={0.1}
                    maxZoom={4}
                    colorMode="dark"
                    nodesDraggable={false}
                    proOptions={{ hideAttribution: true }}
                >
                    <Controls />
                    <MiniMap style={{ width: 100, height: 100 }} />
                </ReactFlow>
                <div className="absolute top-4 right-4">
                    {isFullScreen === 'none' ? (
                        <ArrowRight
                            className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                            onClick={() => setIsFullScreen('flow')}
                            size={20}
                        />
                    ) : (
                        <ArrowLeft
                            className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                            onClick={() => setIsFullScreen('none')}
                            size={20}
                        />
                    )}

                    {isSettingsModalOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setIsSettingsModalOpen(false);
                                }
                            }}
                        >
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-lg w-full relative">
                                <button
                                    onClick={() => setIsSettingsModalOpen(false)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                                <SettingsModal
                                    settings={settings}
                                    updateProvider={updateProvider}
                                    saveSettings={saveSettings}
                                    onClose={() => setIsSettingsModalOpen(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={`border-l border-gray-200 dark:border-gray-700 ${isFullScreen !== 'none' ? 'hidden' : ''}`}></div>
            <div className={`${isFullScreen === 'flow' ? 'hidden' : ''} ${isFullScreen === 'none' ? 'w-2/5' : 'w-full flex justify-center'} relative`}>
                <div className={`${isFullScreen === 'chat' ? 'w-2/3' : 'w-full'} relative`}>
                    <ChatInterface
                        messages={messages}
                        input={input}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        modelsByProvider={modelsByProvider}
                        onMessageClick={onMessageClick}
                        temperature={temperature}
                        setTemperature={setTemperature}
                        topP={topP}
                        setTopP={setTopP}
                        onRegenerateClick={onRegenerateClick}
                        droppedImages={droppedImages}
                        setDroppedImages={setDroppedImages}
                        error={error}
                        chatTextareaRef={chatTextareaRef}
                    />
                    <div className="absolute top-4 left-4">
                        {isFullScreen === 'none' ? (
                            <Maximize2
                                className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                                onClick={() => setIsFullScreen('chat')}
                                size={20}
                            />
                        ) : (
                            <Minimize2
                                className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                                onClick={() => setIsFullScreen('none')}
                                size={20}
                            />
                        )}
                    </div>
                </div>
            </div>

            {!isSidebarOpen && (
                <div className="absolute left-4 top-4 flex gap-2">
                    <Menu
                        className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                        onClick={() => setSidebarOpen(true)}
                        size={20}
                    />
                    <SettingsIcon
                        className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                        onClick={() => setIsSettingsModalOpen(true)}
                        size={20}
                    />
                </div>
            )}
        </div>
    );
}
