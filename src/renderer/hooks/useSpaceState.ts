import { useEdgesState, useNodesState } from "@xyflow/react";
import { useRef, useState } from "react";
import { ExpandedState } from "../types/types";

const SYSTEM_PROMPT = `You are a thoughtful conversation partner`;

export function useSpaceState() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [expandedNodes, setExpandedNodes] = useState<
        Record<string, ExpandedState>
    >({});
    const [isFullScreen, setIsFullScreen] = useState<"none" | "flow" | "chat">(
        "none",
    );
    const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
        null,
    );
    const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_PROMPT);
    const [droppedImages, setDroppedImages] = useState<string[]>([]);
    const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

    return {
        nodes,
        setNodes,
        onNodesChange,
        edges,
        setEdges,
        onEdgesChange,
        expandedNodes,
        setExpandedNodes,
        isFullScreen,
        setIsFullScreen,
        selectedResponseId,
        setSelectedResponseId,
        systemPrompt,
        setSystemPrompt,
        droppedImages,
        setDroppedImages,
        chatTextareaRef,
    };
}
