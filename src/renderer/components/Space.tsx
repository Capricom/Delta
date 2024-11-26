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
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Menu } from 'lucide-react';

import ChatInterface from "./ChatInterface";
import NodeContent from "./NodeContent";
import Sidebar from "./Sidebar";
import '@xyflow/react/dist/style.css';
import { ExpandedState, FlowProps, Response } from "../types/types"
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
}: FlowProps) {

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

    const handleNewConversation = useCallback(() => {
        setMessages([]);
        setNodes([]);
        setEdges([]);
        setResponses([]);
        setExpandedNodes({});
    }, [setMessages, setNodes, setEdges]);

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

    useHotkeys('alt+s', () => setSidebarOpen(prev => !prev), []);
    useHotkeys('alt+f', () => {
        setIsFullScreen(prev => prev === 'flow' ? 'none' : 'flow');
    }, []);
    useHotkeys('alt+c', () => {
        setIsFullScreen(prev => prev === 'chat' ? 'none' : 'chat');
    }, []);
    useHotkeys('alt+n', handleNewConversation, [handleNewConversation]);

    const [resizeTrigger, setResizeTrigger] = useState<ResizeTrigger>(ResizeTrigger.NONE);

    const updateNodesAndEdges = () => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const responseMap = new Map<string, Node>();

        console.log("Responses being processed:", responses);
        // Add this debug log
        console.log("Parent-child relationships:", responses.map(r => ({
            id: r.id,
            parent_id: r.parent_id,
            prompt: r.prompt
        })));

        const systemPromptText = responses[0]?.system || (responses.length === 0 ? systemPrompt : undefined);
        if (systemPromptText) {
            const systemNode: Node = {
                id: 'system-prompt',
                position: { x: 0, y: -FLOW_CONFIG.nodeSpacingY },
                data: {
                    label: <div className="p-4 bg-gray-800 rounded-lg text-left">
                        <div className="text-sm text-gray-400">System Prompt</div>
                        <div className="mt-2">{systemPromptText}</div>
                    </div>
                },
                style: { width: FLOW_CONFIG.nodeWidth, height: 'auto' },
                draggable: true,
            };
            newNodes.push(systemNode);
        }

        responses.forEach((response: Response) => {
            console.log("Processing response:", response);
            const nodeId = response.id;
            const expanded = expandedNodes[nodeId] || { prompt: false, response: false, promptRaw: false, responseRaw: false };

            const newNode: Node = {
                id: nodeId,
                position: { x: 0, y: 0 },
                data: {
                    label: <NodeContent
                        nodeId={nodeId}
                        response={response}
                        expanded={expanded}
                        setExpandedNodes={setExpandedNodes}
                        onDelete={handleDeleteResponse}
                    />,
                    response,
                },
                style: { width: FLOW_CONFIG.nodeWidth, height: 'auto', overflow: 'visible' },
                draggable: true,
                selected: nodeId === selectedResponseId
            };

            newNodes.push(newNode);
            responseMap.set(nodeId, newNode);
        });

        responses.forEach((response: Response) => {
            console.log("Processing response edges:", response);
            if (response.parent_id) {
                const parentNode = responseMap.get(response.parent_id);
                const currentNode = responseMap.get(response.id);

                if (parentNode && currentNode) {
                    const newEdge: Edge = {
                        id: `edge-${response.parent_id}-${response.id}`,
                        source: response.parent_id,
                        target: response.id,
                        type: 'simplebezier',
                        style: { strokeWidth: 2 }
                    };
                    newEdges.push(newEdge);
                }
            } else if (systemPromptText) {
                const newEdge: Edge = {
                    id: `edge-system-${response.id}`,
                    source: 'system-prompt',
                    target: response.id,
                    type: 'simplebezier',
                    style: { strokeWidth: 2 }
                };
                newEdges.push(newEdge);
            }
        });

        console.log("[Space] New nodes:", newNodes);
        console.log("[Space] New edges:", newEdges);

        const { nodes: layoutedNodes, edges: layoutedEdges } = layout.getLayoutedElements(newNodes, newEdges);

        setNodes(layoutedNodes as any);
        setEdges(layoutedEdges as any);

        console.log("[Space] Layouted nodes:", layoutedNodes);
        console.log("[Space] Layouted edges:", layoutedEdges);

        if (selectedResponseId) {
            console.log("[Space] Selected response ID:", selectedResponseId);
            console.log("[Space] Found node:", layoutedNodes.find(node => node.id === selectedResponseId));
            console.log("[Space] Found response:", responses.find(r => r.id === selectedResponseId));
            const selectedNode = layoutedNodes.find(node => node.id === selectedResponseId);
            const clickedResponse = responses.find(r => r.id === selectedResponseId);
            if (selectedNode && clickedResponse) {
                const newMessages = buildMessageChain(responses, clickedResponse);
                setMessages(newMessages);

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
                reactFlowInstance.fitView({ padding: 0.25 });
            }, 150);
        }
    };

    useEffect(() => {
        updateNodesAndEdges();
    }, [responses, setNodes, setEdges, reactFlowInstance, expandedNodes, nodes.length, toggleNodeState, selectedResponseId, messages, systemPrompt]);

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
                </div>
            </div>
            <div className={`border-l border-gray-200 dark:border-gray-700 ${isFullScreen !== 'none' ? 'hidden' : ''}`}></div>
            <div className={`${isFullScreen === 'flow' ? 'hidden' : ''} ${isFullScreen === 'none' ? 'w-2/5' : 'w-full flex justify-center'} relative`}>
                <div className={`${isFullScreen === 'chat' ? 'w-2/3' : 'w-full'} relative`}>
                    <ChatInterface
                        error={error}
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
                <div className="absolute left-4 top-4">
                    <Menu
                        className="cursor-pointer hover:opacity-70 text-gray-900 dark:text-gray-100"
                        onClick={() => setSidebarOpen(true)}
                        size={20}
                    />
                </div>
            )}
        </div>
    );
}
