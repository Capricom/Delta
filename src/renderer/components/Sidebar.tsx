import React from 'react';
import { Menu, ChevronDown, ChevronRight, GitFork, Plus } from 'lucide-react';
import ConversationsList from "./ConversationsList";
import { useState } from 'react';
import { ResizeTrigger } from './Space';

interface SidebarProps {
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    conversations: any[];
    fetchResponses: (id: string) => void;
    fetchConversations: () => void;
    handleNewConversation: () => void;
    setMessages: (messages: any[]) => void;
    setExpandedNodes: (nodes: any) => void;
    setResizeTrigger: (trigger: any) => void;
    onSearchResultSelect: (responseId: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
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
}: SidebarProps) {
    const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
    const [isConversationsOpen, setIsConversationsOpen] = useState(true);

    return (
        <>
            <div className={`${isSidebarOpen ? 'w-[36rem]' : 'w-0'} bg-gray-100 dark:bg-gray-900 relative overflow-y-auto h-screen`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <GitFork size={20} className="rotate-180 text-gray-900 dark:text-gray-200" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">Delta</h2>
                    </div>
                    <Menu
                        className="cursor-pointer hover:opacity-70 transition-opacity text-gray-900 dark:text-gray-200"
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        size={20}
                    />
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
                            <div className="p-3 bg-white/50 dark:bg-gray-900/50">
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    className="focus:outline-none focus-visible:outline-none focus:border-gray-300 dark:focus:border-gray-600 w-full h-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm resize-none border border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 transition-colors [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full"
                                    placeholder="Enter system prompt..."
                                />
                            </div>
                        )}
                    </div>
                    <div className="border-y border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center justify-between flex-1" onClick={() => setIsConversationsOpen(!isConversationsOpen)}>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">Conversations</span>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Plus
                                        size={16}
                                        className="hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer"
                                        onClick={handleNewConversation}
                                    />
                                    {isConversationsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                            </div>
                        </div>
                        {isConversationsOpen && (
                            <div className="bg-white/50 dark:bg-gray-900/50">
                                <ConversationsList
                                    conversations={conversations}
                                    onSelect={(conversationId: string, responseId?: string) => {
                                        fetchResponses(conversationId);
                                        const conversation = conversations.find((c: { id: string; }) => c.id === conversationId);
                                        if (conversation) {
                                            setMessages([]);
                                            setExpandedNodes({});
                                            setResizeTrigger(ResizeTrigger.CONVERSATION_SWITCH);
                                            if (responseId) {
                                                onSearchResultSelect(responseId);
                                            }
                                        }
                                    }}
                                    onDelete={fetchConversations}
                                    onNew={handleNewConversation}
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
