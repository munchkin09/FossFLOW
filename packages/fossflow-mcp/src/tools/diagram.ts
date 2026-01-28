/**
 * Diagram Tools
 * Tools for diagram management: create, validate, convert, info
 */

import { z } from 'zod';
import {
  Model,
  CompactDiagram,
  OutputFormat
} from '../types.js';
import { DiagramState, createEmptyDiagram, loadDiagram } from '../state/DiagramState.js';
import {
  validate,
  detectFormat,
  toCompact,
  toFull,
  normalize
} from '../utils/formatConverter.js';
import { renderAscii, renderSummary } from '../utils/asciiRenderer.js';

// ==================== Tool Schemas ====================

export const createDiagramSchema = z.object({
  title: z.string().max(100).describe('Title for the new diagram'),
  description: z.string().max(1000).optional().describe('Optional description'),
  outputFormat: z.enum(['full', 'compact']).default('full').describe('Output format')
});

export const validateDiagramSchema = z.object({
  diagram: z.any().describe('The diagram to validate (compact or full format)')
});

export const convertFormatSchema = z.object({
  diagram: z.any().describe('The diagram to convert'),
  targetFormat: z.enum(['full', 'compact']).describe('Target format to convert to')
});

export const getDiagramInfoSchema = z.object({
  diagram: z.any().describe('The diagram to get info from')
});

export const previewAsciiSchema = z.object({
  diagram: z.any().describe('The diagram to preview'),
  showCoords: z.boolean().default(true).describe('Whether to show grid coordinates')
});

// ==================== Tool Implementations ====================

/**
 * Create a new empty diagram
 */
export function createDiagram(params: z.infer<typeof createDiagramSchema>): {
  success: boolean;
  diagram: Model | CompactDiagram;
  message: string;
} {
  const state = createEmptyDiagram(params.title);

  if (params.description) {
    const updatedState = state.setDescription(params.description);
    return {
      success: true,
      diagram: updatedState.toJSON(params.outputFormat as OutputFormat),
      message: `Created new diagram "${params.title}"`
    };
  }

  return {
    success: true,
    diagram: state.toJSON(params.outputFormat as OutputFormat),
    message: `Created new diagram "${params.title}"`
  };
}

/**
 * Validate a diagram
 */
export function validateDiagram(params: z.infer<typeof validateDiagramSchema>): {
  valid: boolean;
  format: string;
  errors: string[];
  warnings: string[];
} {
  const result = validate(params.diagram);
  const warnings: string[] = [];

  // Additional validation checks
  if (result.valid) {
    try {
      const model = normalize(params.diagram as Model | CompactDiagram);

      // Check for orphaned view items
      const view = model.views[0];
      if (view) {
        const modelItemIds = new Set(model.items.map((i) => i.id));
        const orphanedViewItems = view.items.filter((vi) => !modelItemIds.has(vi.id));
        if (orphanedViewItems.length > 0) {
          warnings.push(`Found ${orphanedViewItems.length} view items without matching model items`);
        }

        // Check for broken connector references
        const viewItemIds = new Set(view.items.map((i) => i.id));
        for (const connector of view.connectors || []) {
          for (const anchor of connector.anchors) {
            if (anchor.ref.item && !viewItemIds.has(anchor.ref.item)) {
              warnings.push(`Connector ${connector.id} references non-existent item ${anchor.ref.item}`);
            }
          }
        }
      }
    } catch (e) {
      // If normalization fails, add it to errors
      result.valid = false;
      result.errors.push(`Failed to normalize diagram: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return {
    valid: result.valid,
    format: result.format,
    errors: result.errors,
    warnings
  };
}

/**
 * Convert diagram between formats
 */
export function convertFormat(params: z.infer<typeof convertFormatSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  sourceFormat: string;
  targetFormat: string;
  error?: string;
} {
  const sourceFormat = detectFormat(params.diagram);

  if (sourceFormat === 'unknown') {
    return {
      success: false,
      sourceFormat: 'unknown',
      targetFormat: params.targetFormat,
      error: 'Unable to detect source format'
    };
  }

  try {
    let result: Model | CompactDiagram;

    if (params.targetFormat === 'compact') {
      const full = normalize(params.diagram as Model | CompactDiagram);
      result = toCompact(full);
    } else {
      if (sourceFormat === 'compact') {
        result = toFull(params.diagram as CompactDiagram);
      } else {
        result = params.diagram as Model;
      }
    }

    return {
      success: true,
      diagram: result,
      sourceFormat,
      targetFormat: params.targetFormat
    };
  } catch (e) {
    return {
      success: false,
      sourceFormat,
      targetFormat: params.targetFormat,
      error: e instanceof Error ? e.message : 'Conversion failed'
    };
  }
}

/**
 * Get diagram information
 */
export function getDiagramInfo(params: z.infer<typeof getDiagramInfoSchema>): {
  success: boolean;
  info?: {
    title: string;
    description?: string;
    format: string;
    nodeCount: number;
    connectorCount: number;
    rectangleCount: number;
    textBoxCount: number;
    viewCount: number;
    nodes: Array<{ id: string; name: string; icon?: string; position?: { x: number; y: number } }>;
    connectors: Array<{ id: string; from: string; to: string }>;
  };
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
    const stateInfo = state.getInfo();

    return {
      success: true,
      info: {
        ...stateInfo,
        format,
        nodes: state.listNodes(),
        connectors: state.listConnectors()
      }
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to get diagram info'
    };
  }
}

/**
 * Generate ASCII preview of diagram
 */
export function previewAscii(params: z.infer<typeof previewAsciiSchema>): {
  success: boolean;
  ascii?: string;
  summary?: string;
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
    const ascii = renderAscii(params.diagram as Model | CompactDiagram, {
      showCoords: params.showCoords
    });
    const summary = renderSummary(params.diagram as Model | CompactDiagram);

    return {
      success: true,
      ascii,
      summary
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to render preview'
    };
  }
}
