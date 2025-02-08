import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, FileCode, Copy, Trash2, Check, X } from 'lucide-react';
import ExpandableContent from './ExpandableContent';
import { Response } from '../types/types';
import { formatDateTime } from '../services/datetime';

const providerColors: { [key: string]: string } = {
  ollama: "border-gray-700", // blends in
  anthropic: "border-amber-500",
  openai: "border-purple-500",
  google: "border-emerald-500",
};

interface NodeData {
  nodeId: string;
  response: Response;
  expanded: {
    prompt: boolean;
    response: boolean;
    promptRaw: boolean;
    responseRaw: boolean;
  };
  setExpandedNodes: (value: any) => void;
  onDelete?: (responseId: string) => void;
}

export default function NodeContent({ nodeId, response, expanded, setExpandedNodes, onDelete }: NodeData) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const providerColor = providerColors[response.provider.toLowerCase()] || "border-gray-500";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === nodeId) {
      if (onDelete) onDelete(nodeId);
      setDeletingId(null);
    } else {
      setDeletingId(nodeId);
    }
    e.preventDefault();
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        <div className="group bg-blue-500/90 text-white px-2 py-1 rounded-t-lg text-left">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-blue-200 -mb-1 pb-2">User</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 opacity-0 transition-opacity will-change-opacity group-hover:opacity-100">
                <button
                  className="p-1 hover:bg-blue-600/50 rounded transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedNodes((prev: any) => ({
                      ...prev,
                      [nodeId]: { ...expanded, promptRaw: !expanded.promptRaw }
                    }));
                    e.preventDefault();
                  }}
                >
                  {expanded.promptRaw ? <FileText size={16} /> : <FileCode size={16} />}
                </button>
                <button
                  className="p-1 hover:bg-blue-600/50 rounded transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(response.prompt);
                    e.preventDefault();
                  }}
                >
                  <Copy size={16} />
                </button>
                {response.prompt.length > 300 && (
                  <button
                    className="p-1 hover:bg-blue-600/50 rounded transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedNodes((prev: any) => ({
                        ...prev,
                        [nodeId]: { ...expanded, prompt: !expanded.prompt }
                      }));
                      e.preventDefault();
                    }}
                  >
                    {expanded.prompt ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                {deletingId === nodeId ? (
                  <>
                    <button
                      onClick={handleDelete}
                      className="p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <Check size={16} className="text-red-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(null);
                        e.preventDefault();
                      }}
                      className="p-1 hover:bg-blue-600/50 rounded transition-all"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    className="p-1 hover:bg-red-500/20 rounded transition-all text-red-400"
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-blue-200">{formatDateTime(response.datetime_utc)}</span>
            </div>
          </div>
          <ExpandableContent
            content={response.prompt}
            attachments={response.attachments}
            isExpanded={expanded.prompt}
            onToggle={() => setExpandedNodes((prev: any) => ({
              ...prev,
              [nodeId]: { ...expanded, prompt: !expanded.prompt }
            }))}
            showRaw={expanded.promptRaw}
            onToggleRaw={() => setExpandedNodes((prev: any) => ({
              ...prev,
              [nodeId]: { ...expanded, promptRaw: !expanded.promptRaw }
            }))}
            className="text-white"
          />
        </div>
        <div className={`group bg-gray-200/90 dark:bg-gray-700/90 px-2 py-1 rounded-b-lg text-left border-l-2 ${providerColor}`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px]">
              {response.provider || 'unknown'}/{response.model || 'unknown'} • t={response.temperature?.toFixed(2) ?? '0.00'} • p={response.top_p?.toFixed(2) ?? '1.00'} • m_t={response.max_tokens ?? '1024'}
            </span>
            <div className="flex gap-1 opacity-0 transition-opacity will-change-opacity group-hover:opacity-100">
              <button
                className="p-1 hover:bg-gray-600/50 dark:hover:bg-gray-600/50 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNodes((prev: any) => ({
                    ...prev,
                    [nodeId]: { ...expanded, responseRaw: !expanded.responseRaw }
                  }));
                  e.preventDefault();
                }}
              >
                {expanded.responseRaw ? <FileText size={16} /> : <FileCode size={16} />}
              </button>
              <button
                className="p-1 hover:bg-gray-600/50 dark:hover:bg-gray-600/50 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(response.response);
                  e.preventDefault();
                }}
              >
                <Copy size={16} />
              </button>
              {response.response.length > 300 && (
                <button
                  className="p-1 hover:bg-gray-600/50 dark:hover:bg-gray-600/50 rounded transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedNodes((prev: any) => ({
                      ...prev,
                      [nodeId]: { ...expanded, response: !expanded.response }
                    }));
                    e.preventDefault();
                  }}
                >
                  {expanded.response ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>
          </div>
          <ExpandableContent
            content={response.response}
            isExpanded={expanded.response}
            onToggle={() => setExpandedNodes((prev: any) => ({
              ...prev,
              [nodeId]: { ...expanded, response: !expanded.response }
            }))}
            showRaw={expanded.responseRaw}
            onToggleRaw={() => setExpandedNodes((prev: any) => ({
              ...prev,
              [nodeId]: { ...expanded, responseRaw: !expanded.responseRaw }
            }))}
          />
        </div>
      </div>
    </div>
  );
}
