import { useCallback } from 'react';
import { Message } from 'ai/react';
import { Response } from '../types/types';
import { Node } from '@xyflow/react';

interface UseMessageManagementProps {
    responses: Response[];
    setMessages: (messages: Message[]) => void;
    reload?: (messages: Message[]) => void;
    isFullScreen: string;
    setIsFullScreen: (value: 'flow' | 'chat' | 'none' | ((prev: string) => string)) => void;
    setSelectedResponseId: (responseId: string) => void;
    reactFlowInstance: any;
    setSidebarOpen: (value: boolean) => void;
    setIsSystemPromptOpen: (value: boolean) => void;
}

const createMessageAnnotations = (response: Response) => [
    { field: "responseId", id: response.id },
    { field: "conversationId", id: response.conversation_id },
    { field: "parentId", id: response.parent_id },
    { field: "provider", id: response.provider },
    { field: "temperature", id: response.temperature.toString() },
    { field: "topP", id: response.top_p.toString() }
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

export function useMessageManagement({
    responses,
    setMessages,
    reload,
    isFullScreen,
    setIsFullScreen,
    setSelectedResponseId,
    reactFlowInstance,
    setSidebarOpen,
    setIsSystemPromptOpen,
}: UseMessageManagementProps) {
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.id === 'system-prompt') {
            setIsFullScreen('none');
            setSidebarOpen(true);
            setIsSystemPromptOpen(true);
            return;
        }
        const clickedResponse = node.data.response as Response;
        const newMessages = buildMessageChain(responses, clickedResponse);
        setMessages(newMessages);
        if (isFullScreen !== 'chat') {
            setIsFullScreen('none');
        }
    }, [responses, setMessages, isFullScreen, setIsFullScreen, setSidebarOpen, setIsSystemPromptOpen]);

    const onMessageClick = useCallback((message: any) => {
        const responseId = message.annotations?.find((a: any) => a.field === "responseId")?.id;
        if (responseId) {
            if (reactFlowInstance) {
                reactFlowInstance.setNodes((nodes: any[]) =>
                    nodes.map((node) => ({
                        ...node,
                        selected: node.id === responseId,
                    }))
                );
            }

            const clickedResponse = responses.find((r: Response) => r.id === responseId);
            if (clickedResponse) {
                const newMessages = buildMessageChain(responses, clickedResponse);
                setMessages(newMessages);
            }
        }
    }, [responses, setMessages, reactFlowInstance]);

    const onSearchResultSelect = useCallback((responseId: string) => {
        setSelectedResponseId(responseId);
        setIsFullScreen('none');

        const clickedResponse = responses.find((r: Response) => r.id === responseId);
        if (clickedResponse) {
            const newMessages = buildMessageChain(responses, clickedResponse);
            setMessages(newMessages);
        }
    }, [responses, setMessages, setSelectedResponseId, setIsFullScreen]);

    const onRegenerateClick = useCallback(async (message: any) => {
        const responseId = message.annotations?.find((a: any) => a.field === "responseId")?.id;
        if (responseId && reload) {
            const clickedResponse = responses.find((r: Response) => r.id === responseId);
            if (clickedResponse) {
                const messageChain = buildMessageChain(responses, clickedResponse);
                const messagesUpToUser = messageChain.slice(0, -1);
                setMessages(messagesUpToUser);
                reload(messagesUpToUser);
            }
        }
    }, [responses, setMessages, reload]);

    const onEditMessage = useCallback(async (message: any, newContent: string) => {
        const responseId = message.annotations?.find((a: any) => a.field === "responseId")?.id;
        if (responseId && reload) {
            const clickedResponse = responses.find((r: Response) => r.id === responseId);
            if (clickedResponse) {
                // Create a new message chain up to the edited message
                const messageChain = buildMessageChain(responses, clickedResponse);
                const messagesUpToEdit = messageChain.slice(0, -2); // Remove both assistant and user message
                
                // Create a new message with edited content
                const editedMessage: Message = {
                    id: `user-edit-${Date.now()}`,
                    createdAt: new Date(),
                    role: "user",
                    content: newContent,
                    experimental_attachments: message.experimental_attachments,
                    annotations: createMessageAnnotations(clickedResponse)
                };
                
                // Set messages and trigger reload for new assistant response
                setMessages([...messagesUpToEdit, editedMessage]);
                reload([...messagesUpToEdit, editedMessage]);
            }
        }
    }, [responses, setMessages, reload]);

    return {
        onNodeClick,
        onMessageClick,
        onSearchResultSelect,
        onRegenerateClick,
        onEditMessage,
        buildMessageChain,
    };
}
