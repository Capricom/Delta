import React from 'react';
import { SimilarResponse } from "../types/types"
import { useState } from "react";

export function ConversationsSearch({ onSearchResults, onClearSearch, onResultSelect }: {
    onSearchResults: (results: SimilarResponse[]) => void;
    onClearSearch: () => void;
    onResultSelect: (responseId: string) => void;
}) {
    const [query, setQuery] = useState("");
    const handleSearch = async () => {
        if (!query.trim()) {
            onClearSearch();
            return;
        }
        const results = await window.api.findSimilarResponses({
            query: query.trim(),
            searchType: "combined",
            limit: 10,
            offset: 0
        });
        onSearchResults(results);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!e.target.value.trim()) {
            onClearSearch();
        }
    };

    return (
        <div className="flex gap-2">
            <div className="relative flex items-start bg-gray-100 dark:bg-gray-800 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 flex-1 border border-gray-300 dark:border-gray-600">
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            e.currentTarget.blur();
                            return;
                        }
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                    placeholder="Search conversations..."
                    className="w-full px-4 py-2 bg-transparent focus:outline-none rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            onClearSearch();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center text-gray-500 dark:text-gray-400"
                    >
                        ✕
                    </button>
                )}
            </div>
            <button
                onClick={handleSearch}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-all text-gray-700 dark:text-gray-300"
            >
            </button>
        </div>
    );
}
