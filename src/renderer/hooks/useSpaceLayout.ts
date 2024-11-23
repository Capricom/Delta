import { Edge, Node, Position } from "@xyflow/react";
import dagre from "dagre";

export const FLOW_CONFIG = {
    nodeWidth: 550,
    nodeHeight: 150,
    nodeSpacingX: 200,
    nodeSpacingY: 250,
    rankSeparation: 300,
    edgeCurvature: 0.75,
} as const;

export function useSpaceLayout() {
    const getLayoutedElements = (
        nodes: Node[],
        edges: Edge[],
        direction = "TB",
    ) => {
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
            ranker: "network-simplex",
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

        dagre.layout(dagreGraph);

        return {
            nodes: nodes.map((node) => {
                const nodeWithPosition = dagreGraph.node(node.id);
                return {
                    ...node,
                    targetPosition: isHorizontal ? Position.Left : Position.Top,
                    sourcePosition: isHorizontal
                        ? Position.Right
                        : Position.Bottom,
                    position: {
                        x: nodeWithPosition.x - FLOW_CONFIG.nodeWidth / 2,
                        y: nodeWithPosition.y - FLOW_CONFIG.nodeHeight / 2,
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
    };

    return { getLayoutedElements };
}
