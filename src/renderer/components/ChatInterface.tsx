import React from 'react';
import { Copy, Download, Settings, RotateCw } from 'lucide-react';
import MarkdownWithSyntax from './MarkdownWithSyntax';
import { useState, useRef, useEffect, Key } from 'react';
import ChatInput from './ChatInput';
import ImageModal from './ImageModal';
import { Message } from 'ai';


interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelsByProvider: Record<string, string[]>;
  onMessageClick: (message: any) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  onRegenerateClick: (message: any) => void;
  droppedImages: string[];
  setDroppedImages: (images: string[]) => void;
  error?: Error;
  chatTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export default function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  selectedModel,
  setSelectedModel,
  modelsByProvider,
  onMessageClick,
  temperature,
  setTemperature,
  topP,
  setTopP,
  onRegenerateClick,
  droppedImages,
  setDroppedImages,
  error,
  chatTextareaRef,
}: ChatInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDownload = () => {
    if (messages.length === 0) return;

    const conversationId = messages[0]?.annotations?.find((a: any) => a.field === "conversationId")?.id;

    const formattedMessages = messages.map(message => ({
      role: message.role,
      content: [
        {
          type: "text",
          text: message.content
        }
      ]
    }));

    const jsonContent = JSON.stringify(formattedMessages, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversationId || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col h-screen dark:bg-gray-900">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 dark:text-red-400 p-4 mx-4 mt-4 rounded-lg">
          {`There was an error making the request. Please try again with another model.`}
        </div>
      )}
      {selectedImage && (
        <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
      <main className="flex-1 flex flex-col space-y-4 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((message: any, i: number) => (
          <div
            key={i}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            onClick={() => onMessageClick(message)}
            style={{ cursor: 'pointer' }}
          >
            <div
              className={`group relative max-w-[80%] rounded-2xl px-4 py-2 ${message.role === "user"
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                }`}
            >
              <div className="flex justify-between items-start">
                <div className="prose dark:prose-invert max-w-none prose-sm transition-opacity will-change-opacity pr-1">
                  {message.experimental_attachments?.map((attachment: string, index: Key | null | undefined) => (
                    <img
                      key={index?.toString()}
                      src={attachment}
                      alt={`Attachment ${Number(index) + 1}`}
                      className="max-w-full h-auto rounded-lg mb-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(attachment);
                      }}
                    />
                  ))}
                  <MarkdownWithSyntax>{message.content}</MarkdownWithSyntax>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity will-change-opacity transform-gpu flex gap-1">
                  {message.role === "assistant" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateClick(message);
                      }}
                      className="p-1 hover:bg-gray-600/50 dark:hover:bg-gray-500/50 rounded transition-all text-gray-700 dark:text-gray-300"
                    >
                      <RotateCw size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(message.content);
                    }}
                    className="p-1 hover:bg-gray-600/50 dark:hover:bg-gray-500/50 rounded transition-all text-gray-700 dark:text-gray-300"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value)
              }}
              className="w-full rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <optgroup key={provider} label={provider}>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex gap-2 ml-2">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center h-[40px] w-[40px] transition-all text-gray-700 dark:text-gray-300"
              >
                <Settings size={20} />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center h-[40px] w-[40px] transition-all text-gray-700 dark:text-gray-300"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
          {showSettings && (
            <div className="flex gap-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm min-w-[80px] text-gray-700 dark:text-gray-300">Temperature</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={temperature}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setTemperature(value);
                      }
                    }}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={temperature}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setTemperature(value);
                      }
                    }}
                    className="w-16 px-1 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm min-w-[80px] text-gray-700 dark:text-gray-300">Top P</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={topP}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setTopP(value);
                      }
                    }}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={topP}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setTopP(value);
                      }
                    }}
                    className="w-16 px-1 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          textareaRef={chatTextareaRef}
          droppedImages={droppedImages}
          setDroppedImages={setDroppedImages}
        />
      </form>
    </div>
  );
}
