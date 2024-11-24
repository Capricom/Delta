import { useCallback, useEffect, useState } from "react";
import type { Message } from "ai";

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        window.api.onStreamData(
            (data: { value: string; timestamp: number }) => {
                setMessages((prevMessages) => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                        return [
                            ...prevMessages.slice(0, -1),
                            {
                                ...lastMessage,
                                content: lastMessage.content + data.value,
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
        );

        window.api.onStreamComplete(() => {
            setIsLoading(false);
        });
    }, []);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        const newMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };
        const newMessages = [...messages, newMessage];
        setMessages(newMessages);
        setInput("");

        try {
            window.api.startStream(newMessages);
        } catch (error) {
            console.error("Chat error:", error);
            setIsLoading(false);
        }
    }, [input, messages, isLoading]);

    return {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
    };
}
