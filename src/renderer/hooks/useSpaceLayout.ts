import { Edge, Node, Position } from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useRef } from "react";

export const FLOW_CONFIG = {
    nodeWidth: 550,
    nodeHeight: 150,
    nodeSpacingX: 200,
    nodeSpacingY: 250,
    rankSeparation: 300,
    edgeCurvature: 0.75,
} as const;

interface LayoutResult {
    nodes: Node[];
    edges: Edge[];
}

export function useSpaceLayout() {
    const layoutInProgress = useRef<boolean>(false);
    const layoutQueue = useRef<
        { nodes: Node[]; edges: Edge[]; direction: string } | null
    >(null);

    const getLayoutedElements = useCallback(
        async (
            nodes: Node[],
            edges: Edge[],
            direction = "TB",
        ): Promise<LayoutResult | null> => {
            if (layoutInProgress.current) {
                layoutQueue.current = { nodes, edges, direction };
                return null;
            }

            layoutInProgress.current = true;

            const dagreGraph = new dagre.graphlib.Graph();
            dagreGraph.setDefaultEdgeLabel(() => ({}));

            const isHorizontal = direction === "LR";
            dagreGraph.setGraph({
                rankdir: direction,
                nodesep: FLOW_CONFIG.nodeSpacingX,
                ranksep: FLOW_CONFIG.rankSeparation,
                edgesep: 80,
                marginx: 100,
                marginy: 100,
                acyclicer: "greedy",
                ranker: "tight-tree",
            });

            nodes.forEach((node) => {
                dagreGraph.setNode(node.id, {
                    width: FLOW_CONFIG.nodeWidth,
                    height: FLOW_CONFIG.nodeHeight,
                });
            });

            edges.forEach((edge) => {
                dagreGraph.setEdge(edge.source, edge.target);
            });

            return new Promise<LayoutResult>((resolve) => {
                setTimeout(() => {
                    dagre.layout(dagreGraph);

                    const result = {
                        nodes: nodes.map((node) => {
                            const nodeWithPosition = dagreGraph.node(node.id);
                            return {
                                ...node,
                                targetPosition: isHorizontal
                                    ? Position.Left
                                    : Position.Top,
                                sourcePosition: isHorizontal
                                    ? Position.Right
                                    : Position.Bottom,
                                position: {
                                    x: nodeWithPosition.x -
                                        FLOW_CONFIG.nodeWidth / 2,
                                    y: nodeWithPosition.y -
                                        FLOW_CONFIG.nodeHeight / 2,
                                },
                            };
                        }),
                        edges: edges.map((edge) => ({
                            ...edge,
                            type: "smoothstep",
                            animated: true,
                            style: {
                                stroke: "#555",
                                strokeWidth: 2,
                                curvature: FLOW_CONFIG.edgeCurvature,
                            },
                        })),
                    };

                    layoutInProgress.current = false;

                    if (layoutQueue.current) {
                        const { nodes, edges, direction } = layoutQueue.current;
                        layoutQueue.current = null;
                        getLayoutedElements(nodes, edges, direction);
                    }

                    resolve(result);
                }, 0);
            });
        },
        [],
    );

    return { getLayoutedElements };
}
