/**
 * ASCII Renderer
 * Generates text-based visualization of diagrams for LLM preview
 */

import { Model, CompactDiagram, Coords } from '../types.js';
import { normalize } from './formatConverter.js';

interface RenderOptions {
  width?: number;
  height?: number;
  showCoords?: boolean;
}

interface GridCell {
  char: string;
  nodeId?: string;
}

/**
 * Render a diagram as ASCII art
 */
export function renderAscii(
  diagram: Model | CompactDiagram,
  options: RenderOptions = {}
): string {
  const model = normalize(diagram);
  const { showCoords = true } = options;

  // Get the first view (or create empty output)
  const view = model.views[0];
  if (!view || view.items.length === 0) {
    return `
┌─────────────────────────────────────┐
│         Empty Diagram               │
│     Title: ${model.title.padEnd(23)}│
│     Items: 0                        │
└─────────────────────────────────────┘
`.trim();
  }

  // Build item lookup
  const itemLookup = new Map(model.items.map((item) => [item.id, item]));

  // Get bounding box of all items
  const positions = view.items.map((vi) => vi.tile);
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));

  // Add padding
  const padding = 2;
  const gridMinX = minX - padding;
  const gridMaxX = maxX + padding;
  const gridMinY = minY - padding;
  const gridMaxY = maxY + padding;

  // Calculate grid dimensions
  // Each node takes up 3 columns (for spacing)
  const cellWidth = 16; // Characters per grid cell
  const cellHeight = 3; // Lines per grid cell

  const gridWidth = (gridMaxX - gridMinX + 1) * cellWidth;
  const gridHeight = (gridMaxY - gridMinY + 1) * cellHeight;

  // Initialize grid
  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(' '));

  // Helper to convert grid coords to char coords
  const toCharCoords = (tile: Coords): { cx: number; cy: number } => ({
    cx: (tile.x - gridMinX) * cellWidth + Math.floor(cellWidth / 2),
    cy: (tile.y - gridMinY) * cellHeight + Math.floor(cellHeight / 2)
  });

  // Draw connections first (so nodes appear on top)
  const connectors = view.connectors || [];
  for (const connector of connectors) {
    if (connector.anchors.length < 2) continue;

    const startAnchor = connector.anchors[0];
    const endAnchor = connector.anchors[connector.anchors.length - 1];

    // Find start and end nodes
    const startItem = view.items.find((vi) => vi.id === startAnchor.ref.item);
    const endItem = view.items.find((vi) => vi.id === endAnchor.ref.item);

    if (!startItem || !endItem) continue;

    const start = toCharCoords(startItem.tile);
    const end = toCharCoords(endItem.tile);

    // Draw simple line between nodes
    drawLine(grid, start.cx, start.cy, end.cx, end.cy, connector.showArrow !== false);
  }

  // Draw nodes
  for (const viewItem of view.items) {
    const modelItem = itemLookup.get(viewItem.id);
    if (!modelItem) continue;

    const { cx, cy } = toCharCoords(viewItem.tile);
    const name = modelItem.name.slice(0, 12);
    const icon = modelItem.icon ? modelItem.icon.slice(0, 10) : '';

    // Draw node box
    drawNodeBox(grid, cx, cy, name, icon);
  }

  // Convert grid to string
  const lines = grid.map((row) => row.join('').trimEnd());

  // Build output
  const output: string[] = [];
  output.push(`╔${'═'.repeat(gridWidth + 2)}╗`);
  output.push(`║ ${model.title.padEnd(gridWidth)} ║`);
  output.push(`╠${'═'.repeat(gridWidth + 2)}╣`);

  for (const line of lines) {
    output.push(`║ ${line.padEnd(gridWidth)} ║`);
  }

  output.push(`╠${'═'.repeat(gridWidth + 2)}╣`);

  // Add legend
  output.push(`║ Nodes: ${view.items.length}  Connectors: ${connectors.length}`.padEnd(gridWidth + 3) + '║');

  if (showCoords) {
    output.push(`║ Grid: X[${minX} to ${maxX}] Y[${minY} to ${maxY}]`.padEnd(gridWidth + 3) + '║');
  }

  output.push(`╚${'═'.repeat(gridWidth + 2)}╝`);

  return output.join('\n');
}

/**
 * Draw a node box on the grid
 */
function drawNodeBox(
  grid: string[][],
  cx: number,
  cy: number,
  name: string,
  icon: string
): void {
  const width = Math.max(name.length, icon.length) + 4;
  const halfWidth = Math.floor(width / 2);

  const startX = Math.max(0, cx - halfWidth);
  const startY = Math.max(0, cy - 1);

  // Ensure we don't go out of bounds
  if (startY >= grid.length || startX >= (grid[0]?.length || 0)) return;

  // Top border
  safeWrite(grid, startY, startX, '┌');
  for (let i = 1; i < width - 1; i++) {
    safeWrite(grid, startY, startX + i, '─');
  }
  safeWrite(grid, startY, startX + width - 1, '┐');

  // Middle (name)
  safeWrite(grid, startY + 1, startX, '│');
  const paddedName = name.padStart(Math.floor((width - 2 + name.length) / 2)).padEnd(width - 2);
  for (let i = 0; i < paddedName.length; i++) {
    safeWrite(grid, startY + 1, startX + 1 + i, paddedName[i]);
  }
  safeWrite(grid, startY + 1, startX + width - 1, '│');

  // Bottom border
  safeWrite(grid, startY + 2, startX, '└');
  for (let i = 1; i < width - 1; i++) {
    safeWrite(grid, startY + 2, startX + i, '─');
  }
  safeWrite(grid, startY + 2, startX + width - 1, '┘');
}

/**
 * Draw a line between two points
 */
function drawLine(
  grid: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  showArrow: boolean
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Simple Manhattan routing
  const midX = x1 + Math.floor(dx / 2);

  // Horizontal line from start to mid
  for (let x = Math.min(x1, midX) + 1; x < Math.max(x1, midX); x++) {
    safeWrite(grid, y1, x, '─');
  }

  // Vertical line at mid
  for (let y = Math.min(y1, y2) + 1; y < Math.max(y1, y2); y++) {
    safeWrite(grid, y, midX, '│');
  }

  // Horizontal line from mid to end
  for (let x = Math.min(midX, x2) + 1; x < Math.max(midX, x2); x++) {
    safeWrite(grid, y2, x, '─');
  }

  // Corner pieces
  if (dx !== 0 && dy !== 0) {
    const corner1 = dy > 0 ? (dx > 0 ? '┐' : '┌') : dx > 0 ? '┘' : '└';
    safeWrite(grid, y1, midX, corner1);

    const corner2 = dy > 0 ? (dx > 0 ? '└' : '┘') : dx > 0 ? '┌' : '┐';
    safeWrite(grid, y2, midX, corner2);
  }

  // Arrow at end
  if (showArrow) {
    const arrowChar = dx > 0 ? '▶' : dx < 0 ? '◀' : dy > 0 ? '▼' : '▲';
    // Place arrow near end node
    const arrowX = x2 + (dx > 0 ? -2 : dx < 0 ? 2 : 0);
    const arrowY = y2 + (dy > 0 ? -1 : dy < 0 ? 1 : 0);
    if (dx !== 0) {
      safeWrite(grid, y2, arrowX, arrowChar);
    } else if (dy !== 0) {
      safeWrite(grid, arrowY, x2, arrowChar);
    }
  }
}

/**
 * Safely write a character to the grid
 */
function safeWrite(grid: string[][], y: number, x: number, char: string): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length) {
    // Don't overwrite node boxes
    const current = grid[y][x];
    if (current === ' ' || current === '─' || current === '│') {
      grid[y][x] = char;
    }
  }
}

/**
 * Generate a simple text summary of the diagram
 */
export function renderSummary(diagram: Model | CompactDiagram): string {
  const model = normalize(diagram);
  const view = model.views[0];

  const lines: string[] = [];
  lines.push(`# ${model.title}`);
  lines.push('');

  // Items
  lines.push(`## Nodes (${model.items.length})`);
  for (const item of model.items) {
    const viewItem = view?.items.find((vi) => vi.id === item.id);
    const pos = viewItem ? `(${viewItem.tile.x}, ${viewItem.tile.y})` : '(not placed)';
    const icon = item.icon ? `[${item.icon}]` : '';
    lines.push(`- ${item.name} ${icon} ${pos}`);
    if (item.description) {
      lines.push(`  ${item.description}`);
    }
  }
  lines.push('');

  // Connectors
  const connectors = view?.connectors || [];
  lines.push(`## Connectors (${connectors.length})`);
  for (const connector of connectors) {
    if (connector.anchors.length >= 2) {
      const from = connector.anchors[0].ref.item || '?';
      const to = connector.anchors[connector.anchors.length - 1].ref.item || '?';
      const style = connector.style || 'SOLID';
      const arrow = connector.showArrow !== false ? '→' : '—';
      lines.push(`- ${from} ${arrow} ${to} (${style})`);
    }
  }
  lines.push('');

  // Rectangles
  const rectangles = view?.rectangles || [];
  if (rectangles.length > 0) {
    lines.push(`## Rectangles (${rectangles.length})`);
    for (const rect of rectangles) {
      lines.push(`- (${rect.from.x},${rect.from.y}) to (${rect.to.x},${rect.to.y})`);
    }
    lines.push('');
  }

  // Text boxes
  const textBoxes = view?.textBoxes || [];
  if (textBoxes.length > 0) {
    lines.push(`## Text Boxes (${textBoxes.length})`);
    for (const tb of textBoxes) {
      lines.push(`- "${tb.content}" at (${tb.tile.x}, ${tb.tile.y})`);
    }
  }

  return lines.join('\n');
}
