/**
 * Format Converter
 * Bidirectional conversion between compact and full diagram formats
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Model,
  CompactDiagram,
  View,
  ViewItem,
  ModelItem,
  Connector,
  ConnectorAnchor,
  DEFAULT_COLOR,
  DEFAULT_LABEL_HEIGHT,
  OutputFormat
} from '../types.js';

/**
 * Detect the format of a diagram
 */
export function detectFormat(diagram: unknown): 'compact' | 'full' | 'unknown' {
  if (!diagram || typeof diagram !== 'object') {
    return 'unknown';
  }

  const obj = diagram as Record<string, unknown>;

  // Check for compact format markers
  if (obj._ && typeof obj._ === 'object') {
    const meta = obj._ as Record<string, unknown>;
    if (meta.f === 'compact') {
      return 'compact';
    }
  }

  // Check for compact format structure
  if ('t' in obj && 'i' in obj && 'v' in obj) {
    if (Array.isArray(obj.i) && Array.isArray(obj.v)) {
      return 'compact';
    }
  }

  // Check for full format structure
  if ('title' in obj && 'items' in obj && 'views' in obj) {
    return 'full';
  }

  return 'unknown';
}

/**
 * Convert compact format to full format
 */
export function toFull(compact: CompactDiagram): Model {
  const items: ModelItem[] = compact.i.map((item, index) => ({
    id: `item-${index}`,
    name: item[0],
    icon: item[1] || undefined,
    description: item[2] || undefined
  }));

  const views: View[] = compact.v.map((viewData, viewIndex) => {
    const [positions, connections] = viewData;

    // Create view items from positions
    const viewItems: ViewItem[] = positions.map((pos) => {
      const [itemIndex, x, y] = pos;
      return {
        id: `item-${itemIndex}`,
        tile: { x, y },
        labelHeight: DEFAULT_LABEL_HEIGHT
      };
    });

    // Create connectors from connections
    const connectors: Connector[] = connections.map((conn, connIndex) => {
      const [fromIndex, toIndex] = conn;
      const fromItemId = `item-${fromIndex}`;
      const toItemId = `item-${toIndex}`;

      const anchors: ConnectorAnchor[] = [
        {
          id: uuidv4(),
          ref: { item: fromItemId, anchor: 'center' }
        },
        {
          id: uuidv4(),
          ref: { item: toItemId, anchor: 'center' }
        }
      ];

      return {
        id: `connector-${viewIndex}-${connIndex}`,
        anchors,
        style: 'SOLID' as const,
        lineType: 'SINGLE' as const,
        showArrow: true
      };
    });

    return {
      id: `view-${viewIndex}`,
      name: viewIndex === 0 ? 'Main View' : `View ${viewIndex + 1}`,
      items: viewItems,
      connectors,
      rectangles: [],
      textBoxes: []
    };
  });

  return {
    title: compact.t,
    version: compact._.v,
    items,
    views,
    icons: [],
    colors: [DEFAULT_COLOR]
  };
}

/**
 * Convert full format to compact format
 */
export function toCompact(full: Model): CompactDiagram {
  // Build item index map
  const itemIndexMap = new Map<string, number>();
  full.items.forEach((item, index) => {
    itemIndexMap.set(item.id, index);
  });

  // Convert items
  const items: [string, string, string][] = full.items.map((item) => [
    item.name.slice(0, 30),
    item.icon || '',
    (item.description || '').slice(0, 100)
  ]);

  // Convert views
  const views: [[number, number, number][], [number, number][]][] = full.views.map((view) => {
    // Convert positions
    const positions: [number, number, number][] = view.items.map((viewItem) => {
      const itemIndex = itemIndexMap.get(viewItem.id) ?? 0;
      return [itemIndex, viewItem.tile.x, viewItem.tile.y];
    });

    // Convert connectors to connections
    const connections: [number, number][] = (view.connectors || [])
      .map((connector) => {
        if (connector.anchors.length < 2) return null;

        const fromAnchor = connector.anchors[0];
        const toAnchor = connector.anchors[connector.anchors.length - 1];

        const fromItemId = fromAnchor.ref.item;
        const toItemId = toAnchor.ref.item;

        if (!fromItemId || !toItemId) return null;

        const fromIndex = itemIndexMap.get(fromItemId);
        const toIndex = itemIndexMap.get(toItemId);

        if (fromIndex === undefined || toIndex === undefined) return null;

        return [fromIndex, toIndex] as [number, number];
      })
      .filter((conn): conn is [number, number] => conn !== null);

    return [positions, connections];
  });

  // Ensure at least one view exists
  if (views.length === 0) {
    views.push([[], []]);
  }

  return {
    t: full.title.slice(0, 40),
    i: items,
    v: views,
    _: { f: 'compact', v: '1.0' }
  };
}

/**
 * Normalize any diagram to full format
 */
export function normalize(diagram: Model | CompactDiagram): Model {
  const format = detectFormat(diagram);
  if (format === 'compact') {
    return toFull(diagram as CompactDiagram);
  }
  return diagram as Model;
}

/**
 * Convert diagram to requested output format
 */
export function convertToFormat(
  diagram: Model,
  format: OutputFormat
): Model | CompactDiagram {
  if (format === 'compact') {
    return toCompact(diagram);
  }
  return diagram;
}

/**
 * Validate compact format structure
 */
export function validateCompact(diagram: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!diagram || typeof diagram !== 'object') {
    errors.push('Diagram must be an object');
    return { valid: false, errors };
  }

  const obj = diagram as Record<string, unknown>;

  // Check required fields
  if (typeof obj.t !== 'string') {
    errors.push('Missing or invalid title (t)');
  } else if (obj.t.length > 40) {
    errors.push('Title (t) exceeds 40 characters');
  }

  if (!Array.isArray(obj.i)) {
    errors.push('Missing or invalid items array (i)');
  } else {
    obj.i.forEach((item, index) => {
      if (!Array.isArray(item) || item.length !== 3) {
        errors.push(`Item ${index} must be an array of 3 elements [name, icon, description]`);
      } else {
        if (typeof item[0] !== 'string') {
          errors.push(`Item ${index} name must be a string`);
        } else if (item[0].length > 30) {
          errors.push(`Item ${index} name exceeds 30 characters`);
        }
        if (typeof item[1] !== 'string') {
          errors.push(`Item ${index} icon must be a string`);
        }
        if (typeof item[2] !== 'string') {
          errors.push(`Item ${index} description must be a string`);
        } else if (item[2].length > 100) {
          errors.push(`Item ${index} description exceeds 100 characters`);
        }
      }
    });
  }

  if (!Array.isArray(obj.v)) {
    errors.push('Missing or invalid views array (v)');
  } else {
    obj.v.forEach((view, viewIndex) => {
      if (!Array.isArray(view) || view.length !== 2) {
        errors.push(`View ${viewIndex} must be an array of 2 elements [positions, connections]`);
      } else {
        const [positions, connections] = view;
        if (!Array.isArray(positions)) {
          errors.push(`View ${viewIndex} positions must be an array`);
        }
        if (!Array.isArray(connections)) {
          errors.push(`View ${viewIndex} connections must be an array`);
        }
      }
    });
  }

  // Check metadata
  if (!obj._ || typeof obj._ !== 'object') {
    errors.push('Missing metadata (_)');
  } else {
    const meta = obj._ as Record<string, unknown>;
    if (meta.f !== 'compact') {
      errors.push('Metadata format (_.f) must be "compact"');
    }
    if (typeof meta.v !== 'string') {
      errors.push('Metadata version (_.v) must be a string');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate full format structure
 */
export function validateFull(diagram: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!diagram || typeof diagram !== 'object') {
    errors.push('Diagram must be an object');
    return { valid: false, errors };
  }

  const obj = diagram as Record<string, unknown>;

  // Check required fields
  if (typeof obj.title !== 'string') {
    errors.push('Missing or invalid title');
  }

  if (!Array.isArray(obj.items)) {
    errors.push('Missing or invalid items array');
  }

  if (!Array.isArray(obj.views)) {
    errors.push('Missing or invalid views array');
  }

  if (!Array.isArray(obj.icons)) {
    errors.push('Missing or invalid icons array');
  }

  if (!Array.isArray(obj.colors)) {
    errors.push('Missing or invalid colors array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate any diagram format
 */
export function validate(diagram: unknown): { valid: boolean; format: string; errors: string[] } {
  const format = detectFormat(diagram);

  if (format === 'unknown') {
    return {
      valid: false,
      format: 'unknown',
      errors: ['Unable to detect diagram format. Must be either compact or full format.']
    };
  }

  if (format === 'compact') {
    const result = validateCompact(diagram);
    return { ...result, format };
  }

  const result = validateFull(diagram);
  return { ...result, format };
}
