import React from 'react';
import { useEffect, useCallback, useState } from "react";
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    MiniMap,
    useReactFlow,
} from '@xyflow/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Menu, SettingsIcon } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import ChatInterface from "./ChatInterface";
import NodeContent from "./NodeContent";
import Sidebar from "./Sidebar";
import '@xyflow/react/dist/style.css';
import { ExpandedState, SpaceProps, Response, Settings } from "../types/types"
import { useSpaceLayout } from "../hooks/useSpaceLayout";
import { useSpaceState } from "../hooks/useSpaceState";
import { Message } from "ai/react";
import { useChat } from '../hooks/useChat';

export enum ResizeTrigger {
    CONVERSATION_SWITCH = 'conversation_switch',
    NODE_DELETE = 'node_delete',
    NEW_RESPONSE = 'new_response',
    NONE = 'none'
}

const FLOW_CONFIG = {
    nodeWidth: 550,
    nodeHeight: 150,
    nodeSpacingX: 200,
    nodeSpacingY: 250,
    rankSeparation: 300,
    edgeCurvature: 0.75
} as const;

const createMessageAnnotations = (response: Response) => [
    { field: "responseId", id: response.id },
    { field: "conversationId", id: response.conversation_id },
    { field: "parentId", id: response.parent_id },
    { field: "provider", id: response.provider },
    { field: "temperature", id: response.temperature.toString() },
    { field: "topP", id: response.top_p.toString() }
];

const createMessagePair = (response: Response) => [
    {
        role: "user",
        content: response.prompt,
        experimental_attachments: response.attachments || [],
        annotations: createMessageAnnotations(response)
    },
    {
        role: "assistant",
        content: response.response,
        annotations: createMessageAnnotations(response)
    }
];

const buildMessageChain = (responses: Response[], startResponse: Response): Message[] => {
    const messageChain: Response[] = [];
    let currentResponse: Response | undefined = startResponse;

    while (currentResponse) {
        messageChain.unshift(currentResponse);
        currentResponse = responses.find(r => r.id === currentResponse?.parent_id);
    }

    return messageChain.flatMap(response => [
        {
            id: `user-${response.id}`,
            createdAt: new Date(response.datetime_utc),
            role: "user",
            content: response.prompt,
            experimental_attachments: response.attachments?.map(url => ({
                url,
                contentType: "image/png"
            })),
            annotations: createMessageAnnotations(response)
        },
        {
            id: `assistant-${response.id}`,
            createdAt: new Date(response.datetime_utc),
            role: "assistant",
            content: response.response,
            annotations: createMessageAnnotations(response)
        }
    ]);
};

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
    const layout = useSpaceLayout();

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

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const toggleNodeState = useCallback((nodeId: string, key: keyof ExpandedState) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: { ...(prev[nodeId] || {}), [key]: !(prev[nodeId]?.[key]) }
        }));
    }, []);

    const onRegenerateClick = useCallback(async (message: any) => {
        const responseId = message.annotations?.find((a: any) => a.field === "responseId")?.id;
        if (responseId) {
            const clickedResponse = responses.find((r: Response) => r.id === responseId);
            if (clickedResponse) {
                const messageChain = buildMessageChain(responses, clickedResponse);
                const messagesUpToUser = messageChain.slice(0, -1);
                setMessages(messagesUpToUser);
                reload(messagesUpToUser);
            }
        }
    }, [responses, setMessages, reload]);

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

    const handleDeleteResponse = useCallback(async (responseId: string) => {
        const deleteResponses = async (id: string) => {
            console.log("Deleting response", id);
            await window.api.deleteResponse(responses[0].conversation_id, id);

            const children = responses.filter(r => r.parent_id === id);
            for (const child of children) {
                await deleteResponses(child.id);
            }
        };

        await deleteResponses(responseId);
        fetchResponses(responses[0].conversation_id);
    }, [responses, fetchResponses]);

    useHotkeys('alt+s', () => setSidebarOpen(prev => !prev), []);
    useHotkeys('alt+f', () => {
        setIsFullScreen(prev => prev === 'flow' ? 'none' : 'flow');
    }, []);
    useHotkeys('alt+c', () => {
        setIsFullScreen(prev => prev === 'chat' ? 'none' : 'chat');
    }, []);
    useHotkeys('alt+n', handleNewConversation, [handleNewConversation]);
    useHotkeys('alt+l', (e) => {
        e.preventDefault();
        focusChatTextArea();
    }, { preventDefault: true });
    useHotkeys('alt+e', () => setIsSettingsModalOpen(prev => !prev), []);

    const [resizeTrigger, setResizeTrigger] = useState<ResizeTrigger>(ResizeTrigger.NONE);

    const createSystemNode = (systemPromptText: string): Node => ({
        id: 'system-prompt',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
            label: <div className="p-4 bg-gray-800 rounded-lg text-left">
                <div className="text-sm text-gray-400">System Prompt</div>
                <div className="mt-2">{systemPromptText}</div>
            </div>
        },
        style: { width: FLOW_CONFIG.nodeWidth, height: 'auto' },
    });

    const createResponseNode = (
        response: Response,
        expandedNodes: Record<string, ExpandedState>,
        selectedResponseId: string | null,
        handleDeleteResponse: (id: string) => void
    ): Node => ({
        id: response.id,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
            label: <NodeContent
                nodeId={response.id}
                response={response}
                expanded={expandedNodes[response.id] || {
                    prompt: false,
                    response: false,
                    promptRaw: false,
                    responseRaw: false
                }}
                setExpandedNodes={setExpandedNodes}
                onDelete={handleDeleteResponse}
            />,
            response,
        },
        style: { width: FLOW_CONFIG.nodeWidth, height: 'auto' },
        selected: response.id === selectedResponseId
    });

    const createEdge = (source: string, target: string): Edge => ({
        id: `edge-${source}-${target}`,
        source,
        target,
    });

    const updateNodesAndEdges = async () => {

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const responseMap = new Map<string, Node>();

        // Handle system prompt - modified to always show if exists
        const systemPromptText = responses[0]?.system ?? (responses.length > 0 ? '' : systemPrompt);
        if (systemPromptText) {
            const systemNode = createSystemNode(systemPromptText);
            newNodes.push(systemNode);
            responseMap.set('system-prompt', systemNode);
        }

        // Create response nodes - removed sorting as responses should maintain their order
        responses.forEach(response => {
            const node = createResponseNode(response, expandedNodes, selectedResponseId, handleDeleteResponse);
            newNodes.push(node);
            responseMap.set(response.id, node);
        });

        // Create edges - modified to ensure proper connections
        responses.forEach(response => {
            if (response.parent_id) {
                if (responseMap.has(response.parent_id)) {
                    newEdges.push(createEdge(response.parent_id, response.id));
                }
            } else if (systemPromptText) {
                newEdges.push(createEdge('system-prompt', response.id));
            }
        });

        const result = await layout.getLayoutedElements(newNodes, newEdges);
        if (result) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = result;
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            // Handle viewport updates
            if (selectedResponseId) {
                const selectedNode = layoutedNodes.find(node => node.id === selectedResponseId);
                if (selectedNode) {
                    setTimeout(() => {
                        reactFlowInstance.setCenter(
                            selectedNode.position.x + FLOW_CONFIG.nodeWidth / 2,
                            selectedNode.position.y + FLOW_CONFIG.nodeHeight / 2,
                            { zoom: 0.85, duration: 400 }
                        );
                        setSelectedResponseId(null);
                    }, 150);
                }
            } else if (resizeTrigger === ResizeTrigger.CONVERSATION_SWITCH) {
                setTimeout(() => {
                    reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
                }, 150);
            }
        }



        setResizeTrigger(ResizeTrigger.NONE);
    };


    useEffect(() => {
        updateNodesAndEdges();
    }, [responses]);

    useEffect(() => {
        updateNodesAndEdges();
    }, [nodes.length]);

    useEffect(() => {
        updateNodesAndEdges();
    }, [expandedNodes]);

    useEffect(() => {
        updateNodesAndEdges();
    }, [selectedResponseId]);

    useEffect(() => {
        updateNodesAndEdges();
    }, [systemPrompt]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const clickedResponse = node.data.response as Response;
        const newMessages = buildMessageChain(responses, clickedResponse);
        setMessages(newMessages);
        if (isFullScreen !== 'chat') {
            setIsFullScreen('none');
        }
    }, [responses, setMessages]);

    const onMessageClick = useCallback((message: any) => {
        const responseId = message.annotations?.find((a: any) => a.field === "responseId")?.id;
        if (responseId) {
            reactFlowInstance.setNodes((nodes) =>
                nodes.map((node) => ({
                    ...node,
                    selected: node.id === responseId,
                }))
            );

            const clickedResponse = responses.find((r: Response) => r.id === responseId);
            if (clickedResponse) {
                const newMessages = buildMessageChain(responses, clickedResponse);
                setMessages(newMessages);
            }
        }
    }, [reactFlowInstance, responses, setMessages]);

    const onSearchResultSelect = useCallback((responseId: string) => {
        setSelectedResponseId(responseId);
        setIsFullScreen('none');

        const clickedResponse = responses.find((r: Response) => r.id === responseId);
        if (clickedResponse) {
            const newMessages = buildMessageChain(responses, clickedResponse);
            setMessages(newMessages);
        }
    }, [responses, setMessages]);

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
