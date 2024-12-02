import React from 'react';
import { useState } from "react";
import { Conversation, SimilarResponse } from "../types/types"
import { Trash2, Check, X, Bot, User, MessageSquare } from 'lucide-react';
import { ConversationsSearch } from "./ConversationsSearch";
import { formatDateTime } from '../services/datetime';

function ConversationsList({ conversations, onSelect, onDelete, onNew, setIsFullScreen, focusChatTextArea }: {
    conversations: Conversation[];
    onSelect: (conversationId: string, responseId?: string) => void;
    onDelete: () => void;
    onNew: () => void;
    setIsFullScreen: (state: 'flow' | 'chat' | 'none' | ((prev: string) => string)) => void;
    focusChatTextArea: () => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<SimilarResponse[] | null>(null);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (deletingId === id) {
            try {
                await window.api.deleteConversation(id);
                onDelete();
                setDeletingId(null);
            } catch (error) {
                console.error('Error deleting conversation:', error);
            }
        } else {
            setDeletingId(id);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-6">
                <ConversationsSearch
                    onSearchResults={(results: SimilarResponse[]) => {
                        setSearchResults(results);
                    }}
                    onClearSearch={() => setSearchResults(null)}
                    onResultSelect={(responseId) => onSelect(responseId)}
                />
            </div>

            <div className="space-y-3">
                {!searchResults && conversations?.length === 0 && (
                    <div 
                        onClick={() => {
                            onNew();
                            setIsFullScreen('none');
                            setTimeout(() => {
                                focusChatTextArea();
                            }, 0);
                        }}
                        className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 bg-gray-50/30 dark:bg-gray-900/30 rounded-lg transition-all select-none"
                    >
                        <MessageSquare size={24} className="mb-3 text-gray-400 pointer-events-none" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 pointer-events-none">No conversations yet</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 pointer-events-none">Click here to start your first conversation</p>
                    </div>
                )}
                {!searchResults && conversations?.length > 0 && conversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className="p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 bg-gray-50/30 dark:bg-gray-900/30 rounded-lg cursor-pointer group transition-all"
                    >
                        <div className="flex flex-col gap-3">
                            <div className="text-base font-medium flex items-center gap-2 min-w-0 text-gray-900 dark:text-gray-100">
                                <MessageSquare size={16} className="flex-shrink-0" />
                                <span className="truncate">{conv.title}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono">{conv.id}</span>
                                    <span>{formatDateTime(conv.created_at)}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                    {deletingId === conv.id ? (
                                        <>
                                            <button
                                                onClick={(e) => handleDelete(conv.id, e)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-md"
                                            >
                                                <Check size={16} className="text-red-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingId(null);
                                                }}
                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={(e) => handleDelete(conv.id, e)}
                                            className="p-1.5 hover:bg-red-500/20 rounded-md"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {searchResults && searchResults.length > 0 && searchResults.map((result) => (
                    <div
                        key={result.id}
                        onClick={() => onSelect(result.conversation_id, result.response_id)}
                        className="p-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 bg-gray-50/30 dark:bg-gray-900/30 rounded-lg cursor-pointer transition-all"
                    >
                        <div className="flex flex-col gap-3">
                            <div className="font-medium flex items-center gap-2 text-base text-gray-900 dark:text-gray-100">
                                {result.type === 'prompt' ? (
                                    <>
                                        <User size={18} />
                                        <span>Prompt</span>
                                    </>
                                ) : (
                                    <>
                                        <Bot size={18} />
                                        <span>{result.provider}/{result.model}</span>
                                    </>
                                )}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                                {result.text}
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>{formatDateTime(result.datetime_utc)}</span>
                                <span className="text-emerald-500">
                                    {(1 - result.distance).toFixed(2)} match
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ConversationsList
