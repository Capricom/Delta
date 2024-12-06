import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
    src: string;
    onClose: () => void;
}

export default function ImageModal({ src, onClose }: ImageModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                onClick={onClose}
            >
                <X size={24} />
            </button>
            <img
                src={src}
                alt="Full screen preview"
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
