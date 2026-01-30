/**
 * Type definitions for FossFLOW MCP
 * These mirror the types from fossflow-lib but are standalone for the MCP server
 */

// ==================== Coordinates ====================
export interface Coords {
  x: number;
  y: number;
}

// ==================== Icons ====================
export interface Icon {
  id: string;
  name: string;
  url: string;
  collection?: string;
  isIsometric?: boolean;
  scale?: number;
}

// ==================== Colors ====================
export interface Color {
  id: string;
  value: string;
}

// ==================== Model Items ====================
export interface ModelItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

// ==================== View Items ====================
export interface ViewItem {
  id: string;
  tile: Coords;
  labelHeight?: number;
}

// ==================== Connector Labels ====================
export interface ConnectorLabel {
  id: string;
  text: string;
  position: number; // 0-100 percentage along path
  height?: number;
  line?: '1' | '2';
  showLine?: boolean;
}

// ==================== Connector Anchors ====================
export interface ConnectorAnchor {
  id: string;
  ref: {
    item?: string;
    anchor?: string;
    tile?: Coords;
  };
}

// ==================== Connectors ====================
export type ConnectorStyle = 'SOLID' | 'DOTTED' | 'DASHED';
export type ConnectorLineType = 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE';

export interface Connector {
  id: string;
  description?: string;
  startLabel?: string;
  endLabel?: string;
  startLabelHeight?: number;
  centerLabelHeight?: number;
  endLabelHeight?: number;
  labels?: ConnectorLabel[];
  color?: string;
  customColor?: string;
  width?: number;
  style?: ConnectorStyle;
  lineType?: ConnectorLineType;
  showArrow?: boolean;
  anchors: ConnectorAnchor[];
}

// ==================== Rectangles ====================
export interface Rectangle {
  id: string;
  color?: string;
  customColor?: string;
  from: Coords;
  to: Coords;
}

// ==================== Text Boxes ====================
export type TextBoxOrientation = 'X' | 'Y';

export interface TextBox {
  id: string;
  tile: Coords;
  content: string;
  fontSize?: number;
  orientation?: TextBoxOrientation;
}

// ==================== Views ====================
export interface View {
  id: string;
  name: string;
  description?: string;
  lastUpdated?: string;
  items: ViewItem[];
  connectors?: Connector[];
  rectangles?: Rectangle[];
  textBoxes?: TextBox[];
}

// ==================== Full Model ====================
export interface Model {
  version?: string;
  title: string;
  description?: string;
  items: ModelItem[];
  views: View[];
  icons: Icon[];
  colors: Color[];
}

// ==================== Compact Format ====================
/**
 * Compact format for LLM-optimized diagrams
 * - t: title
 * - i: items array [name, icon, description]
 * - v: views [[positions], [connections]]
 * - _: metadata
 */
export interface CompactDiagram {
  t: string; // title (max 40 chars)
  i: [string, string, string][]; // items: [name, icon, description]
  v: [
    [number, number, number][], // positions: [itemIndex, x, y]
    [number, number][] // connections: [fromIndex, toIndex]
  ][];
  _: {
    f: 'compact';
    v: string; // version
  };
}

// ==================== MCP State ====================
export interface Scene {
  connectors: Record<string, { path: ConnectorPath }>;
  textBoxes: Record<string, { size: { width: number; height: number } }>;
}

export interface ConnectorPath {
  tiles: Coords[];
  rectangle: {
    from: Coords;
    to: Coords;
  };
}

export interface DiagramState {
  model: Model;
  scene: Scene;
}

// ==================== Output Format ====================
export type OutputFormat = 'full' | 'compact';

// ==================== Tool Parameters ====================
export interface AddNodeParams {
  diagram: Model | CompactDiagram;
  name: string;
  icon?: string;
  description?: string;
  x: number;
  y: number;
  labelHeight?: number;
  outputFormat?: OutputFormat;
}

export interface UpdateNodeParams {
  diagram: Model | CompactDiagram;
  nodeId: string;
  name?: string;
  icon?: string;
  description?: string;
  x?: number;
  y?: number;
  labelHeight?: number;
  outputFormat?: OutputFormat;
}

export interface RemoveNodeParams {
  diagram: Model | CompactDiagram;
  nodeId: string;
  outputFormat?: OutputFormat;
}

export interface AddConnectorParams {
  diagram: Model | CompactDiagram;
  fromNodeId: string;
  toNodeId: string;
  style?: ConnectorStyle;
  lineType?: ConnectorLineType;
  color?: string;
  showArrow?: boolean;
  label?: string;
  outputFormat?: OutputFormat;
}

export interface AddRectangleParams {
  diagram: Model | CompactDiagram;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  outputFormat?: OutputFormat;
}

export interface AddTextBoxParams {
  diagram: Model | CompactDiagram;
  x: number;
  y: number;
  content: string;
  orientation?: TextBoxOrientation;
  fontSize?: number;
  outputFormat?: OutputFormat;
}

export interface BatchOperation {
  op: string;
  params: Record<string, unknown>;
}

export interface BatchOperationsParams {
  diagram: Model | CompactDiagram;
  operations: BatchOperation[];
  outputFormat?: OutputFormat;
}

// ==================== Icon Search ====================
export interface IconSearchResult {
  id: string;
  name: string;
  collection: string;
  description?: string;
}

export interface IconSearchParams {
  query: string;
  collection?: string;
  limit?: number;
}

// ==================== Default Values ====================
export const DEFAULT_COLOR: Color = {
  id: '__DEFAULT__',
  value: '#6366f1'
};

export const DEFAULT_LABEL_HEIGHT = 80;

export const INITIAL_MODEL: Model = {
  title: 'Untitled',
  version: '1.0',
  icons: [],
  colors: [DEFAULT_COLOR],
  items: [],
  views: []
};

export const INITIAL_SCENE: Scene = {
  connectors: {},
  textBoxes: {}
};
