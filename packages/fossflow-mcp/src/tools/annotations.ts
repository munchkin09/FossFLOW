/**
 * Annotation Tools
 * Tools for rectangles and text boxes
 */

import { z } from 'zod';
import {
  Model,
  CompactDiagram,
  OutputFormat,
  TextBoxOrientation
} from '../types.js';
import { loadDiagram } from '../state/DiagramState.js';
import { detectFormat } from '../utils/formatConverter.js';

// ==================== Tool Schemas ====================

export const addRectangleSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  fromX: z.number().describe('X coordinate of top-left corner'),
  fromY: z.number().describe('Y coordinate of top-left corner'),
  toX: z.number().describe('X coordinate of bottom-right corner'),
  toY: z.number().describe('Y coordinate of bottom-right corner'),
  color: z.string().optional().describe('Color ID or hex color'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const removeRectangleSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  rectangleId: z.string().describe('ID of the rectangle to remove'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const addTextBoxSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  x: z.number().describe('X coordinate for the text box'),
  y: z.number().describe('Y coordinate for the text box'),
  content: z.string().max(100).describe('Text content (max 100 chars)'),
  orientation: z.enum(['X', 'Y']).optional().describe('Text orientation (default: X)'),
  fontSize: z.number().min(0.1).max(2).optional().describe('Font size multiplier (default: 0.6)'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const removeTextBoxSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  textBoxId: z.string().describe('ID of the text box to remove'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const removeAnnotationSchema = z.object({
  diagram: z.any().describe('The current diagram'),
  annotationId: z.string().describe('ID of the annotation (rectangle or text box) to remove'),
  outputFormat: z.enum(['full', 'compact']).optional().describe('Output format')
});

export const listAnnotationsSchema = z.object({
  diagram: z.any().describe('The diagram to list annotations from')
});

// ==================== Tool Implementations ====================

/**
 * Add a rectangle to the diagram
 */
export function addRectangle(params: z.infer<typeof addRectangleSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  rectangleId?: string;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to add rectangle',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    const newState = state.addRectangle({
      fromX: params.fromX,
      fromY: params.fromY,
      toX: params.toX,
      toY: params.toY,
      color: params.color
    });

    // Find the newly added rectangle ID
    const rectangles = newState.primaryView.rectangles || [];
    const newRectId = rectangles[rectangles.length - 1]?.id;

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      rectangleId: newRectId,
      message: `Added rectangle from (${params.fromX}, ${params.fromY}) to (${params.toX}, ${params.toY})`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to add rectangle',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Remove a rectangle
 */
export function removeRectangle(params: z.infer<typeof removeRectangleSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to remove rectangle',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify rectangle exists
    const rectangles = state.primaryView.rectangles || [];
    const exists = rectangles.some((r) => r.id === params.rectangleId);

    if (!exists) {
      return {
        success: false,
        message: 'Failed to remove rectangle',
        error: `Rectangle with ID "${params.rectangleId}" not found`
      };
    }

    const newState = state.removeRectangle(params.rectangleId);
    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Removed rectangle ${params.rectangleId}`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to remove rectangle',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Add a text box to the diagram
 */
export function addTextBox(params: z.infer<typeof addTextBoxSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  textBoxId?: string;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to add text box',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    const newState = state.addTextBox({
      x: params.x,
      y: params.y,
      content: params.content,
      orientation: params.orientation as TextBoxOrientation,
      fontSize: params.fontSize
    });

    // Find the newly added text box ID
    const textBoxes = newState.primaryView.textBoxes || [];
    const newTextBoxId = textBoxes[textBoxes.length - 1]?.id;

    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      textBoxId: newTextBoxId,
      message: `Added text box "${params.content}" at (${params.x}, ${params.y})`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to add text box',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Remove a text box
 */
export function removeTextBox(params: z.infer<typeof removeTextBoxSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to remove text box',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);

    // Verify text box exists
    const textBoxes = state.primaryView.textBoxes || [];
    const exists = textBoxes.some((t) => t.id === params.textBoxId);

    if (!exists) {
      return {
        success: false,
        message: 'Failed to remove text box',
        error: `Text box with ID "${params.textBoxId}" not found`
      };
    }

    const newState = state.removeTextBox(params.textBoxId);
    const outputFormat = (params.outputFormat || format) as OutputFormat;

    return {
      success: true,
      diagram: newState.toJSON(outputFormat),
      message: `Removed text box ${params.textBoxId}`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to remove text box',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Remove any annotation (rectangle or text box) by ID
 */
export function removeAnnotation(params: z.infer<typeof removeAnnotationSchema>): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  message: string;
  type?: 'rectangle' | 'textbox';
  error?: string;
} {
  const format = detectFormat(params.diagram);

  if (format === 'unknown') {
    return {
      success: false,
      message: 'Failed to remove annotation',
      error: 'Unable to detect diagram format'
    };
  }

  try {
    const state = loadDiagram(params.diagram as Model | CompactDiagram);
    const view = state.primaryView;

    // Check rectangles
    const isRectangle = (view.rectangles || []).some((r) => r.id === params.annotationId);
    if (isRectangle) {
      const newState = state.removeRectangle(params.annotationId);
      const outputFormat = (params.outputFormat || format) as OutputFormat;
      return {
        success: true,
        diagram: newState.toJSON(outputFormat),
        message: `Removed rectangle ${params.annotationId}`,
        type: 'rectangle'
      };
    }

    // Check text boxes
    const isTextBox = (view.textBoxes || []).some((t) => t.id === params.annotationId);
    if (isTextBox) {
      const newState = state.removeTextBox(params.annotationId);
      const outputFormat = (params.outputFormat || format) as OutputFormat;
      return {
        success: true,
        diagram: newState.toJSON(outputFormat),
        message: `Removed text box ${params.annotationId}`,
        type: 'textbox'
      };
    }

    return {
      success: false,
      message: 'Failed to remove annotation',
      error: `Annotation with ID "${params.annotationId}" not found`
    };
  } catch (e) {
    return {
      success: false,
      message: 'Failed to remove annotation',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * List all annotations in the diagram
 */
export function listAnnotations(params: z.infer<typeof listAnnotationsSchema>): {
  success: boolean;
  rectangles?: Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    color?: string;
  }>;
  textBoxes?: Array<{
    id: string;
    position: { x: number; y: number };
    content: string;
    orientation?: string;
  }>;
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
    const view = state.primaryView;

    const rectangles = (view.rectangles || []).map((r) => ({
      id: r.id,
      from: r.from,
      to: r.to,
      color: r.color
    }));

    const textBoxes = (view.textBoxes || []).map((t) => ({
      id: t.id,
      position: t.tile,
      content: t.content,
      orientation: t.orientation
    }));

    return {
      success: true,
      rectangles,
      textBoxes
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
