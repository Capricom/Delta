import { useCallback, useEffect, useState } from "react";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";

interface UseChatOptions {
    body?: Record<string, any>;
    onFinish?: (message: Message) => void;
}
export function useChat({ body, onFinish }: UseChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error>();

    const handleStreamData = useCallback(
        (data: { value: string; timestamp: number }) => {
            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                    return [
                        ...prevMessages.slice(0, -1),
                        {
                            ...lastMessage,
                            content: lastMessage.content + data.value,
                            annotations: lastMessage.annotations,
                        },
                    ];
                }
                return [
                    ...prevMessages,
                    {
                        id: data.timestamp.toString(),
                        role: "assistant",
                        content: data.value,
                    },
                ];
            });
        },
        [],
    );

    const handleStreamComplete = useCallback((message: Message) => {
        setIsLoading(false);
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (message?.role === "assistant" && onFinish) {
                onFinish(message);

                const lastTwoMessages = [
                    prevMessages[prevMessages.length - 1],
                    message,
                ].filter(Boolean);

                const responseId = message.annotations?.find((a: any) =>
                    a.field === "responseId"
                )?.id;
                const conversationId = message.annotations?.find((a: any) =>
                    a.field === "conversationId"
                )?.id;
                console.log("Stream complete", {
                    responseId,
                    conversationId,
                    message,
                });
                if (lastTwoMessages.length === 2) {
                    // TODO: enable when ready to store summaries
                    // window.api.generateSummary(
                    //     lastTwoMessages,
                    //     body?.model,
                    //     responseId,
                    //     conversationId,
                    // );
                }
            }
            if (lastMessage?.role === "assistant") {
                return [
                    ...prevMessages.slice(0, -1),
                    message,
                ];
            }
            return [...prevMessages, message];
        });
    }, [body?.model, body?.conversationId, onFinish]);

    const handleStreamError = useCallback((err: Error) => {
        setError(err);
        setIsLoading(false);
    }, []);

    const handleInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setInput(e.target.value);
    }, []);

    const append = useCallback(
        async (
            message: Message | CreateMessage,
            chatRequestOptions?: ChatRequestOptions,
        ) => {
            try {
                setError(undefined);
                setIsLoading(true);
                const messageWithAnnotations = {
                    ...message,
                    annotations: (message as Message).annotations || [],
                } as Message;
                const newMessages = [...messages, messageWithAnnotations];
                setMessages(newMessages);
                window.api.startStream({
                    messages: newMessages,
                    model: body?.model,
                    temperature: body?.temperature,
                    topP: body?.topP,
                    systemPrompt: body?.systemPrompt,
                });
                return message.content;
            } catch (err) {
                setError(err as Error);
                setIsLoading(false);
                return null;
            }
        },
        [
            body?.model,
            body?.temperature,
            body?.topP,
            body?.systemPrompt,
            messages,
        ],
    );

    const reload = useCallback(
        async (
            newMessages?: Message[],
            chatRequestOptions?: ChatRequestOptions,
        ) => {
            try {
                const currentMessages = newMessages || messages;
                const lastMessage = currentMessages[currentMessages.length - 1];

                if (!lastMessage || lastMessage.role === "assistant") {
                    return null;
                }
                setError(undefined);
                setIsLoading(true);

                window.api.startStream({
                    messages: currentMessages,
                    model: body?.model,
                    temperature: body?.temperature,
                    topP: body?.topP,
                    systemPrompt: body?.systemPrompt,
                });
                return lastMessage.content;
            } catch (err) {
                console.error("[useChat] Error during reload:", err);
                setError(err as Error);
                setIsLoading(false);
                return null;
            }
        },
        [
            body?.model,
            body?.temperature,
            body?.topP,
            body?.systemPrompt,
            messages,
        ],
    );

    const handleSubmit = useCallback(
        async (
            e?: { preventDefault: () => void },
            chatRequestOptions?: ChatRequestOptions,
        ) => {
            e?.preventDefault();
            if (!input.trim() || isLoading) return;

            const newMessage: Message = {
                id: Date.now().toString(),
                role: "user",
                content: input,
                annotations: messages[messages.length - 1]?.annotations || [],
            };

            setInput("");
            await append(newMessage, chatRequestOptions);
        },
        [input, isLoading, append, messages],
    );

    const stop = useCallback(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const streamDataHandler = window.api.onStreamData(handleStreamData);
        const streamCompleteHandler = window.api.onStreamComplete(
            handleStreamComplete,
        );
        const streamErrorHandler = window.api.onStreamError(handleStreamError);

        return () => {
            window.api.removeStreamDataListener(streamDataHandler);
            window.api.removeStreamCompleteListener(streamCompleteHandler);
            window.api.removeStreamErrorListener(streamErrorHandler);
        };
    }, [handleStreamData, handleStreamComplete, handleStreamError]);

    return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        setMessages,
        reload,
        error,
        append,
        stop,
        isLoading,
    };
}
