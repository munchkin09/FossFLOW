/**
 * DiagramState
 * Immutable state manager for diagram operations
 */

import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';
import {
  Model,
  CompactDiagram,
  View,
  ViewItem,
  ModelItem,
  Connector,
  ConnectorAnchor,
  Rectangle,
  TextBox,
  Scene,
  DiagramState as DiagramStateType,
  OutputFormat,
  DEFAULT_COLOR,
  DEFAULT_LABEL_HEIGHT,
  INITIAL_MODEL,
  INITIAL_SCENE
} from '../types.js';
import { normalize, convertToFormat } from '../utils/formatConverter.js';

/**
 * Immutable diagram state manager
 * All operations return a new DiagramState instance
 */
export class DiagramState {
  readonly model: Model;
  readonly scene: Scene;

  constructor(diagram?: Model | CompactDiagram | null) {
    if (!diagram) {
      this.model = { ...INITIAL_MODEL, views: [this.createDefaultView()] };
      this.scene = { ...INITIAL_SCENE };
    } else {
      this.model = normalize(diagram);
      this.scene = { ...INITIAL_SCENE };

      // Ensure at least one view exists
      if (this.model.views.length === 0) {
        this.model = {
          ...this.model,
          views: [this.createDefaultView()]
        };
      }
    }
  }

  private createDefaultView(): View {
    return {
      id: uuidv4(),
      name: 'Main View',
      items: [],
      connectors: [],
      rectangles: [],
      textBoxes: []
    };
  }

  /**
   * Get the primary view (first view)
   */
  get primaryView(): View {
    return this.model.views[0];
  }

  /**
   * Get view by ID
   */
  getView(viewId?: string): View {
    if (!viewId) return this.primaryView;
    return this.model.views.find((v) => v.id === viewId) || this.primaryView;
  }

  // ==================== Model Item Operations ====================

  /**
   * Add a new node to the diagram
   */
  addNode(params: {
    name: string;
    icon?: string;
    description?: string;
    x: number;
    y: number;
    labelHeight?: number;
    viewId?: string;
  }): DiagramState {
    const nodeId = uuidv4();
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      // Add model item
      const modelItem: ModelItem = {
        id: nodeId,
        name: params.name,
        icon: params.icon,
        description: params.description
      };
      draft.items.push(modelItem);

      // Add view item
      const view = draft.views.find((v) => v.id === viewId);
      if (view) {
        const viewItem: ViewItem = {
          id: nodeId,
          tile: { x: params.x, y: params.y },
          labelHeight: params.labelHeight ?? DEFAULT_LABEL_HEIGHT
        };
        view.items.push(viewItem);
      }
    });

    return new DiagramState(newModel);
  }

  /**
   * Update an existing node
   */
  updateNode(params: {
    nodeId: string;
    name?: string;
    icon?: string;
    description?: string;
    x?: number;
    y?: number;
    labelHeight?: number;
    viewId?: string;
  }): DiagramState {
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      // Update model item
      const modelItem = draft.items.find((i) => i.id === params.nodeId);
      if (modelItem) {
        if (params.name !== undefined) modelItem.name = params.name;
        if (params.icon !== undefined) modelItem.icon = params.icon;
        if (params.description !== undefined) modelItem.description = params.description;
      }

      // Update view item
      const view = draft.views.find((v) => v.id === viewId);
      if (view) {
        const viewItem = view.items.find((i) => i.id === params.nodeId);
        if (viewItem) {
          if (params.x !== undefined) viewItem.tile.x = params.x;
          if (params.y !== undefined) viewItem.tile.y = params.y;
          if (params.labelHeight !== undefined) viewItem.labelHeight = params.labelHeight;
        }
      }
    });

    return new DiagramState(newModel);
  }

  /**
   * Remove a node from the diagram
   */
  removeNode(nodeId: string, viewId?: string): DiagramState {
    const targetViewId = viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      // Remove model item
      const itemIndex = draft.items.findIndex((i) => i.id === nodeId);
      if (itemIndex !== -1) {
        draft.items.splice(itemIndex, 1);
      }

      // Remove from view and clean up connectors
      const view = draft.views.find((v) => v.id === targetViewId);
      if (view) {
        // Remove view item
        const viewItemIndex = view.items.findIndex((i) => i.id === nodeId);
        if (viewItemIndex !== -1) {
          view.items.splice(viewItemIndex, 1);
        }

        // Remove connectors that reference this node
        if (view.connectors) {
          view.connectors = view.connectors.filter((connector) => {
            return !connector.anchors.some((anchor) => anchor.ref.item === nodeId);
          });
        }
      }
    });

    return new DiagramState(newModel);
  }

  /**
   * List all nodes in the diagram
   */
  listNodes(viewId?: string): Array<{
    id: string;
    name: string;
    icon?: string;
    description?: string;
    position?: { x: number; y: number };
  }> {
    const view = this.getView(viewId);

    return this.model.items.map((item) => {
      const viewItem = view.items.find((vi) => vi.id === item.id);
      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        description: item.description,
        position: viewItem ? { x: viewItem.tile.x, y: viewItem.tile.y } : undefined
      };
    });
  }

  // ==================== Connector Operations ====================

  /**
   * Add a connector between two nodes
   */
  addConnector(params: {
    fromNodeId: string;
    toNodeId: string;
    style?: 'SOLID' | 'DOTTED' | 'DASHED';
    lineType?: 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE';
    color?: string;
    showArrow?: boolean;
    label?: string;
    viewId?: string;
  }): DiagramState {
    const connectorId = uuidv4();
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === viewId);
      if (!view) return;

      // Verify both nodes exist
      const fromExists = view.items.some((i) => i.id === params.fromNodeId);
      const toExists = view.items.some((i) => i.id === params.toNodeId);
      if (!fromExists || !toExists) return;

      const anchors: ConnectorAnchor[] = [
        { id: uuidv4(), ref: { item: params.fromNodeId, anchor: 'center' } },
        { id: uuidv4(), ref: { item: params.toNodeId, anchor: 'center' } }
      ];

      const connector: Connector = {
        id: connectorId,
        anchors,
        style: params.style || 'SOLID',
        lineType: params.lineType || 'SINGLE',
        color: params.color,
        showArrow: params.showArrow ?? true,
        description: params.label
      };

      if (!view.connectors) {
        view.connectors = [];
      }
      view.connectors.push(connector);
    });

    return new DiagramState(newModel);
  }

  /**
   * Update an existing connector
   */
  updateConnector(params: {
    connectorId: string;
    style?: 'SOLID' | 'DOTTED' | 'DASHED';
    lineType?: 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE';
    color?: string;
    showArrow?: boolean;
    label?: string;
    viewId?: string;
  }): DiagramState {
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === viewId);
      if (!view?.connectors) return;

      const connector = view.connectors.find((c) => c.id === params.connectorId);
      if (!connector) return;

      if (params.style !== undefined) connector.style = params.style;
      if (params.lineType !== undefined) connector.lineType = params.lineType;
      if (params.color !== undefined) connector.color = params.color;
      if (params.showArrow !== undefined) connector.showArrow = params.showArrow;
      if (params.label !== undefined) connector.description = params.label;
    });

    return new DiagramState(newModel);
  }

  /**
   * Remove a connector
   */
  removeConnector(connectorId: string, viewId?: string): DiagramState {
    const targetViewId = viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === targetViewId);
      if (!view?.connectors) return;

      const index = view.connectors.findIndex((c) => c.id === connectorId);
      if (index !== -1) {
        view.connectors.splice(index, 1);
      }
    });

    return new DiagramState(newModel);
  }

  /**
   * List all connectors
   */
  listConnectors(viewId?: string): Array<{
    id: string;
    from: string;
    to: string;
    style?: string;
    label?: string;
  }> {
    const view = this.getView(viewId);
    const connectors = view.connectors || [];

    return connectors.map((c) => ({
      id: c.id,
      from: c.anchors[0]?.ref.item || '',
      to: c.anchors[c.anchors.length - 1]?.ref.item || '',
      style: c.style,
      label: c.description
    }));
  }

  // ==================== Rectangle Operations ====================

  /**
   * Add a rectangle
   */
  addRectangle(params: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    color?: string;
    viewId?: string;
  }): DiagramState {
    const rectId = uuidv4();
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === viewId);
      if (!view) return;

      const rectangle: Rectangle = {
        id: rectId,
        from: { x: params.fromX, y: params.fromY },
        to: { x: params.toX, y: params.toY },
        color: params.color
      };

      if (!view.rectangles) {
        view.rectangles = [];
      }
      view.rectangles.push(rectangle);
    });

    return new DiagramState(newModel);
  }

  /**
   * Remove a rectangle
   */
  removeRectangle(rectangleId: string, viewId?: string): DiagramState {
    const targetViewId = viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === targetViewId);
      if (!view?.rectangles) return;

      const index = view.rectangles.findIndex((r) => r.id === rectangleId);
      if (index !== -1) {
        view.rectangles.splice(index, 1);
      }
    });

    return new DiagramState(newModel);
  }

  // ==================== TextBox Operations ====================

  /**
   * Add a text box
   */
  addTextBox(params: {
    x: number;
    y: number;
    content: string;
    orientation?: 'X' | 'Y';
    fontSize?: number;
    viewId?: string;
  }): DiagramState {
    const textBoxId = uuidv4();
    const viewId = params.viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === viewId);
      if (!view) return;

      const textBox: TextBox = {
        id: textBoxId,
        tile: { x: params.x, y: params.y },
        content: params.content,
        orientation: params.orientation || 'X',
        fontSize: params.fontSize
      };

      if (!view.textBoxes) {
        view.textBoxes = [];
      }
      view.textBoxes.push(textBox);
    });

    return new DiagramState(newModel);
  }

  /**
   * Remove a text box
   */
  removeTextBox(textBoxId: string, viewId?: string): DiagramState {
    const targetViewId = viewId || this.primaryView.id;

    const newModel = produce(this.model, (draft) => {
      const view = draft.views.find((v) => v.id === targetViewId);
      if (!view?.textBoxes) return;

      const index = view.textBoxes.findIndex((t) => t.id === textBoxId);
      if (index !== -1) {
        view.textBoxes.splice(index, 1);
      }
    });

    return new DiagramState(newModel);
  }

  // ==================== Diagram Operations ====================

  /**
   * Update diagram title
   */
  setTitle(title: string): DiagramState {
    const newModel = produce(this.model, (draft) => {
      draft.title = title;
    });
    return new DiagramState(newModel);
  }

  /**
   * Update diagram description
   */
  setDescription(description: string): DiagramState {
    const newModel = produce(this.model, (draft) => {
      draft.description = description;
    });
    return new DiagramState(newModel);
  }

  // ==================== Serialization ====================

  /**
   * Export the diagram to JSON
   */
  toJSON(format: OutputFormat = 'full'): Model | CompactDiagram {
    return convertToFormat(this.model, format);
  }

  /**
   * Get diagram info
   */
  getInfo(): {
    title: string;
    description?: string;
    nodeCount: number;
    connectorCount: number;
    rectangleCount: number;
    textBoxCount: number;
    viewCount: number;
  } {
    const view = this.primaryView;
    return {
      title: this.model.title,
      description: this.model.description,
      nodeCount: this.model.items.length,
      connectorCount: view.connectors?.length || 0,
      rectangleCount: view.rectangles?.length || 0,
      textBoxCount: view.textBoxes?.length || 0,
      viewCount: this.model.views.length
    };
  }
}

/**
 * Create a new empty diagram state
 */
export function createEmptyDiagram(title?: string): DiagramState {
  const state = new DiagramState();
  if (title) {
    return state.setTitle(title);
  }
  return state;
}

/**
 * Load a diagram from JSON
 */
export function loadDiagram(diagram: Model | CompactDiagram): DiagramState {
  return new DiagramState(diagram);
}
