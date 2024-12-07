import React, { useCallback } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { Response, ExpandedState } from '../types/types';
import { FLOW_CONFIG, useSpaceLayout } from './useSpaceLayout';
import NodeContent from '../components/NodeContent';
import { ResizeTrigger } from '../components/Space';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useFlowManagement({
    responses,
    expandedNodes,
    selectedResponseId,
    systemPrompt,
    setExpandedNodes,
    setNodes,
    setEdges,
    handleDeleteResponse,
    resizeTrigger,
    setResizeTrigger,
}: {
    responses: Response[];
    expandedNodes: Record<string, ExpandedState>;
    selectedResponseId: string | null;
    systemPrompt: string;
    setExpandedNodes: (nodes: any) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    handleDeleteResponse: (id: string) => void;
    resizeTrigger: ResizeTrigger;
    setResizeTrigger: (trigger: ResizeTrigger) => void;
}) {
    const reactFlowInstance = useReactFlow();
    const layout = useSpaceLayout();

    const createSystemNode = useCallback((systemPromptText: string): Node => ({
        id: 'system-prompt',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
            label: <div className="p-4 bg-gray-800 rounded-lg text-left">
                <div className="text-sm text-gray-400">System Prompt</div>
                <div className="mt-2">{systemPromptText}</div>
            </div>
        },
        style: { width: FLOW_CONFIG.nodeWidth, height: 'auto' },
    }), []);

    const createResponseNode = useCallback((
        response: Response,
        expandedNodes: Record<string, ExpandedState>,
        selectedResponseId: string | null,
        handleDeleteResponse: (id: string) => void
    ): Node => ({
        id: response.id,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
            label: <NodeContent
                nodeId={response.id}
                response={response}
                expanded={expandedNodes[response.id] || {
                    prompt: false,
                    response: false,
                    promptRaw: false,
                    responseRaw: false
                }}
                setExpandedNodes={setExpandedNodes}
                onDelete={handleDeleteResponse}
            />,
            response,
        },
        style: { width: FLOW_CONFIG.nodeWidth, height: 'auto' },
        selected: response.id === selectedResponseId
    }), []);

    const createEdge = useCallback((source: string, target: string): Edge => ({
        id: `edge-${source}-${target}`,
        source,
        target,
    }), []);

    const updateNodesAndEdges = useCallback(async () => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const responseMap = new Map<string, Node>();

        const systemPromptText = responses[0]?.system ?? (responses.length > 0 ? '' : systemPrompt);
        if (systemPromptText) {
            const systemNode = createSystemNode(systemPromptText);
            newNodes.push(systemNode);
            responseMap.set('system-prompt', systemNode);
        }

        responses.forEach(response => {
            const node = createResponseNode(response, expandedNodes, selectedResponseId, handleDeleteResponse);
            newNodes.push(node);
            responseMap.set(response.id, node);
        });

        responses.forEach(response => {
            if (response.parent_id) {
                if (responseMap.has(response.parent_id)) {
                    newEdges.push(createEdge(response.parent_id, response.id));
                }
            } else if (systemPromptText) {
                newEdges.push(createEdge('system-prompt', response.id));
            }
        });

        const result = layout.getLayoutedElements(newNodes, newEdges);
        if (result) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = result;
            reactFlowInstance.setNodes(layoutedNodes);
            reactFlowInstance.setEdges(layoutedEdges);

            await delay(200);

            if (selectedResponseId) {
                const selectedNode = layoutedNodes.find(node => node.id === selectedResponseId);
                if (selectedNode) {
                    reactFlowInstance.setCenter(
                        selectedNode.position.x + FLOW_CONFIG.nodeWidth / 2,
                        selectedNode.position.y + FLOW_CONFIG.nodeHeight / 2,
                        { zoom: 0.85, duration: 400 }
                    );
                }
            } else if (resizeTrigger === ResizeTrigger.CONVERSATION_SWITCH) {
                reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
            }
        }

        setResizeTrigger(ResizeTrigger.NONE);
    }, [
        responses,
        expandedNodes,
        selectedResponseId,
        systemPrompt,
        createSystemNode,
        createResponseNode,
        createEdge,
        handleDeleteResponse,
        layout,
        setNodes,
        setEdges,
        reactFlowInstance,
        resizeTrigger,
        setResizeTrigger
    ]);

    return {
        updateNodesAndEdges,
        createSystemNode,
        createResponseNode,
        createEdge,
    };
}
