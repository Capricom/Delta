import React from 'react';
import { useChat } from '../hooks/useChat';

export default function Chat() {
    const { messages, input, handleInputChange, handleSubmit } = useChat();

    return (
        <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
            {messages.map(m => (
                <div key={m.id} className="whitespace-pre-wrap text-gray-200 mb-4">
                    <span className="font-medium">{m.role === 'user' ? 'User: ' : 'AI: '}</span>
                    {m.content}
                </div>
            ))}

            <form onSubmit={handleSubmit}>
                <input
                    className="fixed bottom-0 w-full max-w-md p-2 mb-8 bg-gray-800 border border-gray-700 rounded shadow-xl text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                />
            </form>
        </div>
    );
}
