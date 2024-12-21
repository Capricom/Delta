import React, { useState, useCallback } from 'react';
import { CircleArrowUp, X } from 'lucide-react';

interface ChatInputProps {
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    droppedImages: string[];
    setDroppedImages: (images: string[]) => void;
    disabled?: boolean;
}

export default function ChatInput({
    input,
    handleInputChange,
    handleSubmit,
    textareaRef,
    droppedImages,
    setDroppedImages,
    disabled,
}: ChatInputProps) {
    const [dragActive, setDragActive] = useState(false);
    const [showRemoveIndex, setShowRemoveIndex] = useState<number | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setDroppedImages(prev => [...prev, dataUrl]);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const removeImage = (index: number) => {
        setDroppedImages(prev => prev.filter((_, i) => i !== index));
        setShowRemoveIndex(null);
    };
    return (
        <div
            className={`relative flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 ${dragActive ? 'ring-2 ring-blue-500' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {droppedImages.length > 0 && (
                <div className="flex items-center gap-2 px-4 pt-2 flex-wrap">
                    {droppedImages.map((image, index) => (
                        <div
                            key={index}
                            className="relative w-16 h-16 rounded-lg overflow-hidden"
                            onMouseEnter={() => setShowRemoveIndex(index)}
                            onMouseLeave={() => setShowRemoveIndex(null)}
                        >
                            <img src={image} alt={`Dropped image ${index + 1}`} className="w-full h-full object-cover" />
                            {showRemoveIndex === index && (
                                <button
                                    className="absolute top-1 right-1 bg-gray-900/50 hover:bg-gray-900/70 rounded-full p-1"
                                    onClick={() => removeImage(index)}
                                >
                                    <X size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="relative flex items-start">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => handleInputChange({ target: { value: e.target.value } } as React.ChangeEvent<HTMLInputElement>)}
                    placeholder="Type a message..."
                    rows={1}
                    disabled={disabled}
                    className="flex-1 px-4 py-2 pr-14 bg-transparent focus:outline-none resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ minHeight: '40px' }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                        if (e.altKey && e.key.toLowerCase() === 'l') {
                            e.preventDefault();
                            return;
                        }
                        if (e.altKey) {
                            return;
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            e.currentTarget.blur();
                            return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = '40px';
                            handleSubmit(e);
                            setDroppedImages([]);
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={disabled}
                    onClick={(e) => {
                        const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                        if (textarea) {
                            textarea.style.height = '40px';
                        }
                    }}
                    className="absolute right-2 bottom-[4px] bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none h-[32px] w-[32px] flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 dark:disabled:hover:bg-blue-600"
                >
                    <CircleArrowUp size={20} />
                </button>
            </div>
        </div>
    );
}
