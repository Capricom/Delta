import React, { useState, useRef } from 'react';
import { Menu, ChevronDown, ChevronRight, GitFork, Plus, Settings } from 'lucide-react';
import ConversationsList from "./ConversationsList";
import { ResizeTrigger } from './Space';

interface SidebarProps {
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    conversations: any[];
    fetchResponses: (id: string) => void;
    fetchConversations: () => void;
    handleNewConversation: (focusCallback?: () => void) => void;
    setMessages: (messages: any[]) => void;
    setExpandedNodes: (nodes: any) => void;
    setResizeTrigger: (trigger: any) => void;
    onSearchResultSelect: (responseId: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    setIsFullScreen: (state: 'flow' | 'chat' | 'none' | ((prev: string) => string)) => void;
    focusChatTextArea: () => void;
    selectedResponseId: string | null;
    setIsConfigModalOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    isSystemPromptOpen: boolean;
    setIsSystemPromptOpen: (value: boolean) => void;
    responses: any[];
}

export default function Sidebar({
    isSidebarOpen,
    setSidebarOpen,
    conversations,
    fetchResponses,
    fetchConversations,
    handleNewConversation,
    setMessages,
    setExpandedNodes,
    setResizeTrigger,
    onSearchResultSelect,
    systemPrompt,
    setSystemPrompt,
    setIsFullScreen,
    focusChatTextArea,
    selectedResponseId,
    setIsConfigModalOpen,
    isSystemPromptOpen,
    setIsSystemPromptOpen,
    responses,
}: SidebarProps) {
    const [isConversationsOpen, setIsConversationsOpen] = useState(true);
    const systemPromptRef = useRef<HTMLTextAreaElement>(null);

    // Check if there are any responses in the current conversation
    const hasActiveConversation = responses.length > 0;

    return (
        <>
            <div className={`${isSidebarOpen ? 'w-[36rem]' : 'w-0'} bg-gray-100 dark:bg-gray-900 relative overflow-y-auto h-screen [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <GitFork size={20} className="rotate-180 text-gray-900 dark:text-gray-200" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">Delta</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Settings
                            className="cursor-pointer hover:opacity-70 transition-opacity text-gray-900 dark:text-gray-200"
                            onClick={() => setIsConfigModalOpen(prev => !prev)}
                            size={20}
                        />
                        <Menu
                            className="cursor-pointer hover:opacity-70 transition-opacity text-gray-900 dark:text-gray-200"
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            size={20}
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="border-y border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setIsSystemPromptOpen(!isSystemPromptOpen)}
                        >
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">System Prompt</span>
                            {isSystemPromptOpen ? <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" /> : <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />}
                        </div>
                        {isSystemPromptOpen && (
                            <div className="p-3 bg-white/50 dark:bg-gray-900/50 space-y-2">
                                <div className="relative">
                                    <textarea
                                        ref={systemPromptRef}
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        disabled={hasActiveConversation}
                                        className={`focus:outline-none focus-visible:outline-none focus:border-gray-300 dark:focus:border-gray-600 w-full h-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm resize-none border border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 transition-colors [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full ${hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                {hasActiveConversation && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Start a new conversation to edit the system prompt</p>
                                        <button
                                            onClick={() => {
                                                handleNewConversation(() => {
                                                    setIsSystemPromptOpen(true);
                                                    setTimeout(() => {
                                                        systemPromptRef.current?.focus();
                                                    }, 0);
                                                });
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                                        >
                                            <Plus size={12} />
                                            New Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="border-y border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center justify-between flex-1">
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-200" onClick={() => setIsConversationsOpen(!isConversationsOpen)}>Conversations</span>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Plus
                                        size={16}
                                        className="hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewConversation();
                                        }}
                                    />
                                    <div onClick={() => setIsConversationsOpen(!isConversationsOpen)}>
                                        {isConversationsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isConversationsOpen && (
                            <div className="p-4">
                                <ConversationsList
                                    conversations={conversations}
                                    onSelect={(conversationId, responseId) => {
                                        fetchResponses(conversationId);
                                        setMessages([]);
                                        setExpandedNodes([]);
                                        setResizeTrigger(ResizeTrigger.CONVERSATION_SWITCH);
                                        if (responseId) {
                                            onSearchResultSelect(responseId);
                                        }
                                    }}
                                    onDelete={fetchConversations}
                                    onNew={handleNewConversation}
                                    setIsFullScreen={setIsFullScreen}
                                    focusChatTextArea={focusChatTextArea}
                                    selectedConversationId={selectedResponseId}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className={`border-l border-gray-200 dark:border-gray-700 ${isSidebarOpen ? '' : 'hidden'}`}></div>
        </>
    );
}
