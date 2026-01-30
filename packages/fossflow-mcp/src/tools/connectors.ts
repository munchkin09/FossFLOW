/**
 * Connector Tools
 * Tools for connector management: add, update, remove
 */

import { z } from 'zod';
import {
  Model,
  CompactDiagram,
  OutputFormat,
  ConnectorStyle,
  ConnectorLineType
} from '../types.js';
import { loadDiagram } from '../state/DiagramState.js';
import { detectFormat } from '../utils/formatConverter.js';

// ==================== Tool Schemas ====================

export const addConnectorSchema = z.object({
  diagram: z.any().describe('The current diagram (compact or full format)'),
  fromNodeId: z.string().describe('ID of the source node'),
  toNodeId: z.string().describe('ID of the target node'),
  style: z.enum(['SOLID', 'DOTTED', 'DASHED']).optional().describe('Line style (default: SOLID)'),
  lineType: z.enum(['SINGLE', 'DOUBLE', 'DOUBLE_WITH_CIRCLE']).optional().describe('Line type (default: SINGLE)'),
  color: z.string().optional().describe('Color ID or hex color'),
  showArrow: z.boolean().optional().describe('Show arrow at end (default: true)'),
  label: z.string().max(1000).optional().describe('Label text for the connector'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const updateConnectorSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  connectorId: z.string().describe('ID of the connector to update'),
  style: z.enum(['SOLID', 'DOTTED', 'DASHED']).optional().describe('New line style'),
  lineType: z.enum(['SINGLE', 'DOUBLE', 'DOUBLE_WITH_CIRCLE']).optional().describe('New line type'),
  color: z.string().optional().describe('New color'),
  showArrow: z.boolean().optional().describe('Show/hide arrow'),
  label: z.string().max(1000).optional().describe('New label text'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const removeConnectorSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  connectorId: z.string().describe('ID of the connector to remove'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const listConnectorsSchema = z.object({
  diagram: z.any().describe('The diagram to list connectors from')
});

// ==================== Tool Implementations ====================

/**
 * Add a connector between two nodes
 */
export function addConnector(params: z.infer<typeof addConnectorSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  connectorId?: string;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to add connector',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify nodes exist
    const fromNode = state.model.items.find((i) => i.id === params.fromNodeId);
    const toNode = state.model.items.find((i) => i.id === params.toNodeId);

    if (!fromNode) {
      return {
        success: false,
        message: 'Failed to add connector',
        error: `Source node "${params.fromNodeId}" not found`
      };
    }

    if (!toNode) {
      return {
        success: false,
        message: 'Failed to add connector',
        error: `Target node "${params.toNodeId}" not found`
      };
    }

    const newState = state.addConnector({
      fromNodeId: params.fromNodeId,
      toNodeId: params.toNodeId,
      style: params.style as ConnectorStyle,
      lineType: params.lineType as ConnectorLineType,
      color: params.color,
      showArrow: params.showArrow,
      label: params.label
    });

    // Find the newly added connector ID
    const connectors = newState.primaryView.connectors || [];
    const newConnectorId = connectors[connectors.length - 1]?.id;

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      connectorId: newConnectorId,
      message: `Added connector from "${fromNode.name}" to "${toNode.name}"`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to add connector',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing connector
 */
export function updateConnector(params: z.infer<typeof updateConnectorSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to update connector',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify connector exists
    const connectors = state.primaryView.connectors || [];
    const existingConnector = connectors.find((c) => c.id === params.connectorId);

    if (!existingConnector) {
      return {
        success: false,
        message: 'Failed to update connector',
        error: `Connector with ID "${params.connectorId}" not found`
      };
    }

    const newState = state.updateConnector({
      connectorId: params.connectorId,
      style: params.style as ConnectorStyle,
      lineType: params.lineType as ConnectorLineType,
      color: params.color,
      showArrow: params.showArrow,
      label: params.label
    });

    const outputFormat = (params.outputFormat || format) as OutputFormat;
    const updates: string[] = [];
    if (params.style) updates.push(`style="${params.style}"`);
    if (params.lineType) updates.push(`lineType="${params.lineType}"`);
    if (params.label) updates.push(`label="${params.label}"`);

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Updated connector: ${updates.join(', ') || 'no changes'}`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to update connector',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Remove a connector
 */
export function removeConnector(params: z.infer<typeof removeConnectorSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to remove connector',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify connector exists
    const connectors = state.primaryView.connectors || [];
    const existingConnector = connectors.find((c) => c.id === params.connectorId);

    if (!existingConnector) {
      return {
        success: false,
        message: 'Failed to remove connector',
        error: `Connector with ID "${params.connectorId}" not found`
      };
    }

    const newState = state.removeConnector(params.connectorId);

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Removed connector ${params.connectorId}`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to remove connector',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * List all connectors in the diagram
 */
export function listConnectors(params: z.infer<typeof listConnectorsSchema>): {
  success: boolean;
  connectors?: Array<{
    id: string;
    from: string;
    fromName?: string;
    to: string;
    toName?: string;
    style?: string;
    label?: string;
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
    const rawConnectors = state.listConnectors();

    // Enrich with node names
    const connectors = rawConnectors.map((c) => {
      const fromNode = state.model.items.find((i) => i.id === c.from);
      const toNode = state.model.items.find((i) => i.id === c.to);
      return {
        ...c,
        fromName: fromNode?.name,
        toName: toNode?.name
      };
    });

    return {
      success: true,
      connectors,
      count: connectors.length
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
