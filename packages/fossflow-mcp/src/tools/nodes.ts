/**
 * Node Tools
 * Tools for node management: add, update, remove, list
 */

import { z } from 'zod';
import {
  Model,
  CompactDiagram,
  OutputFormat
} from '../types.js';
import { loadDiagram } from '../state/DiagramState.js';
import { detectFormat } from '../utils/formatConverter.js';

// ==================== Tool Schemas ====================

export const addNodeSchema = z.object({
  diagram: z.any().describe('The current diagram (compact or full format)'),
  name: z.string().max(100).describe('Name of the node (max 100 chars)'),
  icon: z.string().optional().describe('Icon ID (e.g., "aws-lambda", "storage", "k8s-pod")'),
  description: z.string().max(1000).optional().describe('Optional description (max 1000 chars)'),
  x: z.number().describe('X coordinate on the grid'),
  y: z.number().describe('Y coordinate on the grid'),
  labelHeight: z.number().optional().describe('Label height offset (default: 80)'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format (defaults to input format)')
});

export const updateNodeSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  nodeId: z.string().describe('ID of the node to update'),
  name: z.string().max(100).optional().describe('New name'),
  icon: z.string().optional().describe('New icon ID'),
  description: z.string().max(1000).optional().describe('New description'),
  x: z.number().optional().describe('New X coordinate'),
  y: z.number().optional().describe('New Y coordinate'),
  labelHeight: z.number().optional().describe('New label height'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const removeNodeSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  nodeId: z.string().describe('ID of the node to remove'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const listNodesSchema = z.object({
  diagram: z.any().describe('The diagram to list nodes from')
});

// ==================== Tool Implementations ====================

/**
 * Add a new node to the diagram
 */
export function addNode(params: z.infer<typeof addNodeSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  nodeId?: string;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to add node',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    const newState = state.addNode({
      name: params.name,
      icon: params.icon,
      description: params.description,
      x: params.x,
      y: params.y,
      labelHeight: params.labelHeight
    });

    // Find the newly added node ID
    const newNodeId = newState.model.items[newState.model.items.length - 1]?.id;

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      nodeId: newNodeId,
      message: `Added node "${params.name}" at position (${params.x}, ${params.y})`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to add node',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing node
 */
export function updateNode(params: z.infer<typeof updateNodeSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to update node',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify node exists
    const existingNode = state.model.items.find((i) => i.id === params.nodeId);
    if (!existingNode) {
      return {
        success: false,
        message: 'Failed to update node',
        error: `Node with ID "${params.nodeId}" not found`
      };
    }

    const newState = state.updateNode({
      nodeId: params.nodeId,
      name: params.name,
      icon: params.icon,
      description: params.description,
      x: params.x,
      y: params.y,
      labelHeight: params.labelHeight
    });

    const outputFormat = (params.outputFormat || format) as OutputFormat;
    const updates: string[] = [];
    if (params.name) updates.push(`name="${params.name}"`);
    if (params.icon) updates.push(`icon="${params.icon}"`);
    if (params.x !== undefined || params.y !== undefined) {
      updates.push(`position=(${params.x ?? '?'}, ${params.y ?? '?'})`);
    }

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Updated node "${existingNode.name}": ${updates.join(', ') || 'no changes'}`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to update node',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Remove a node from the diagram
 */
export function removeNode(params: z.infer<typeof removeNodeSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  removedConnectors?: number;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to remove node',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify node exists
    const existingNode = state.model.items.find((i) => i.id === params.nodeId);
    if (!existingNode) {
      return {
        success: false,
        message: 'Failed to remove node',
        error: `Node with ID "${params.nodeId}" not found`
      };
    }

    // Count connectors that will be removed
    const view = state.primaryView;
    const affectedConnectors = (view.connectors || []).filter((c) =>
      c.anchors.some((a) => a.ref.item === params.nodeId)
    );

    const newState = state.removeNode(params.nodeId);

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Removed node "${existingNode.name}"`,
      removedConnectors: affectedConnectors.length
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to remove node',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * List all nodes in the diagram
 */
export function listNodes(params: z.infer<typeof listNodesSchema>): {
  success: boolean;
  nodes?: Array<{
    id: string;
    name: string;
    icon?: string;
    description?: string;
    position?: { x: number; y: number };
  }>;
  count?: number;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);
    const nodes = state.listNodes();

    return {
      success: true,
      nodes,
      count: nodes.length
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
