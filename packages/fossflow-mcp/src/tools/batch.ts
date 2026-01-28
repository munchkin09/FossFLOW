/**
 * Batch Operations Tool
 * Apply multiple operations in a single call
 */

import { z } from 'zod';
import {
  Model,
  CompactDiagram,
  OutputFormat
} from '../types.js';
import { loadDiagram } from '../state/DiagramState.js';
import { detectFormat } from '../utils/formatConverter.js';
import { renderAscii } from '../utils/asciiRenderer.js';

// Import individual tool implementations
import { addNode, updateNode, removeNode } from './nodes.js';
import { addConnector, updateConnector, removeConnector } from './connectors.js';
import { addRectangle, removeRectangle, addTextBox, removeTextBox } from './annotations.js';

// ==================== Tool Schema ====================

export const batchOperationsSchema = z.object({
  diagram: z.any().describe('The current diagram (compact or full format)'),
  operations: z.array(z.object({
    op: z.string().describe('Operation name (e.g., "add_node", "add_connector")'),
    params: z.record(z.any()).describe('Parameters for the operation (excluding diagram)')
  })).describe('Array of operations to apply sequentially'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format'),
  includePreview: z.boolean().default(false).describe('Include ASCII preview in response')
});

// ==================== Supported Operations ====================

const SUPPORTED_OPERATIONS = [
  'add_node',
  'update_node',
  'remove_node',
  'add_connector',
  'update_connector',
  'remove_connector',
  'add_rectangle',
  'remove_rectangle',
  'add_textbox',
  'remove_textbox'
] as const;

type OperationResult = {
  op: string;
  success: boolean;
  message?: string;
  error?: string;
  nodeId?: string;
  connectorId?: string;
  rectangleId?: string;
  textBoxId?: string;
};

// ==================== Tool Implementation ====================

/**
 * Apply multiple operations in sequence
 */
export function batchOperations(params: z.infer<typeof batchOperationsSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  results: OperationResult[];
  successCount: number;
  errorCount: number;
  preview?: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      results: [],
      successCount: 0,
      errorCount: 0,
      error: 'Unable to detect diagram format'
    };
  }

  const results: OperationResult[] = [];
  let currentDiagram: Model | CompactDiagram = params.diagram;
  let successCount = 0;
  let errorCount = 0;

  // Process each operation
  for (const operation of params.operations) {
    const { op, params: opParams } = operation;

    // Check if operation is supported
    if (!SUPPORTED_OPERATIONS.includes(op as typeof SUPPORTED_OPERATIONS[number])) {
      results.push({
        op,
        success: false,
        error: `Unknown operation: ${op}. Supported: ${SUPPORTED_OPERATIONS.join(', ')}`
      });
      errorCount++;
      continue;
    }

    // Apply the operation
    const opResult = applyOperation(op, currentDiagram, opParams);

    results.push({
      op,
      success: opResult.success,
      message: opResult.message,
      error: opResult.error,
      nodeId: opResult.nodeId,
      connectorId: opResult.connectorId,
      rectangleId: opResult.rectangleId,
      textBoxId: opResult.textBoxId
    });

    if (opResult.success && opResult.diagram) {
      currentDiagram = opResult.diagram;
      successCount++;
    } else {
      errorCount++;
    }
  }

  // Convert to requested output format
  const outputFormat = (params.outputFormat || format) as OutputFormat;
  const state = loadDiagram(currentDiagram);
  const finalDiagram = state.toJSON(outputFormat);

  // Generate preview if requested
  let preview: string | undefined;
  if (params.includePreview) {
    try {
      preview = renderAscii(finalDiagram);
    } catch {
      // Ignore preview errors
    }
  }

  return {
    success: errorCount === 0,
    diagram: finalDiagram,
    results,
    successCount,
    errorCount,
    preview
  };
}

/**
 * Apply a single operation
 */
function applyOperation(
  op: string,
  diagram: Model | CompactDiagram,
  params: Record<string, unknown>
): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message?: string;
  error?: string;
  nodeId?: string;
  connectorId?: string;
  rectangleId?: string;
  textBoxId?: string;
} {
  try {
    switch (op) {
      case 'add_node': {
        const result = addNode({
          diagram,
          name: params.name as string,
          icon: params.icon as string | undefined,
          description: params.description as string | undefined,
          x: params.x as number,
          y: params.y as number,
          labelHeight: params.labelHeight as number | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error,
          nodeId: result.nodeId
        };
      }

      case 'update_node': {
        const result = updateNode({
          diagram,
          nodeId: params.nodeId as string,
          name: params.name as string | undefined,
          icon: params.icon as string | undefined,
          description: params.description as string | undefined,
          x: params.x as number | undefined,
          y: params.y as number | undefined,
          labelHeight: params.labelHeight as number | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      case 'remove_node': {
        const result = removeNode({
          diagram,
          nodeId: params.nodeId as string
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      case 'add_connector': {
        const result = addConnector({
          diagram,
          fromNodeId: params.fromNodeId as string,
          toNodeId: params.toNodeId as string,
          style: params.style as 'SOLID' | 'DOTTED' | 'DASHED' | undefined,
          lineType: params.lineType as 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE' | undefined,
          color: params.color as string | undefined,
          showArrow: params.showArrow as boolean | undefined,
          label: params.label as string | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error,
          connectorId: result.connectorId
        };
      }

      case 'update_connector': {
        const result = updateConnector({
          diagram,
          connectorId: params.connectorId as string,
          style: params.style as 'SOLID' | 'DOTTED' | 'DASHED' | undefined,
          lineType: params.lineType as 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE' | undefined,
          color: params.color as string | undefined,
          showArrow: params.showArrow as boolean | undefined,
          label: params.label as string | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      case 'remove_connector': {
        const result = removeConnector({
          diagram,
          connectorId: params.connectorId as string
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      case 'add_rectangle': {
        const result = addRectangle({
          diagram,
          fromX: params.fromX as number,
          fromY: params.fromY as number,
          toX: params.toX as number,
          toY: params.toY as number,
          color: params.color as string | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error,
          rectangleId: result.rectangleId
        };
      }

      case 'remove_rectangle': {
        const result = removeRectangle({
          diagram,
          rectangleId: params.rectangleId as string
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      case 'add_textbox': {
        const result = addTextBox({
          diagram,
          x: params.x as number,
          y: params.y as number,
          content: params.content as string,
          orientation: params.orientation as 'X' | 'Y' | undefined,
          fontSize: params.fontSize as number | undefined
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error,
          textBoxId: result.textBoxId
        };
      }

      case 'remove_textbox': {
        const result = removeTextBox({
          diagram,
          textBoxId: params.textBoxId as string
        });
        return {
          success: result.success,
          diagram: result.diagram,
          message: result.message,
          error: result.error
        };
      }

      default:
        return {
          success: false,
          error: `Unknown operation: ${op}`
        };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
