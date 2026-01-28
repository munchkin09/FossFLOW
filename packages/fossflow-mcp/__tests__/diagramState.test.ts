/**
 * Tests for DiagramState
 */

import { DiagramState, createEmptyDiagram, loadDiagram } from '../src/state/DiagramState';
import { CompactDiagram, Model } from '../src/types';

describe('DiagramState', () => {
  describe('constructor', () => {
    it('should create empty diagram when no input provided', () => {
      const state = new DiagramState();

      expect(state.model.title).toBe('Untitled');
      expect(state.model.items).toHaveLength(0);
      expect(state.model.views).toHaveLength(1);
      expect(state.primaryView.items).toHaveLength(0);
    });

    it('should load full format diagram', () => {
      const full: Model = {
        title: 'Test',
        items: [{ id: 'node-1', name: 'Node 1' }],
        views: [{
          id: 'view-1',
          name: 'Main',
          items: [{ id: 'node-1', tile: { x: 0, y: 0 } }],
          connectors: [],
          rectangles: [],
          textBoxes: []
        }],
        icons: [],
        colors: []
      };

      const state = new DiagramState(full);

      expect(state.model.title).toBe('Test');
      expect(state.model.items).toHaveLength(1);
    });

    it('should load compact format diagram', () => {
      const compact: CompactDiagram = {
        t: 'Compact Test',
        i: [['Node 1', 'server', 'Description']],
        v: [[[[0, 0, 0]], []]],
        _: { f: 'compact', v: '1.0' }
      };

      const state = new DiagramState(compact);

      expect(state.model.title).toBe('Compact Test');
      expect(state.model.items).toHaveLength(1);
    });
  });

  describe('addNode', () => {
    it('should add a new node to the diagram', () => {
      const state = createEmptyDiagram('Test');
      const newState = state.addNode({
        name: 'API Server',
        icon: 'api',
        description: 'REST API',
        x: 5,
        y: 3
      });

      expect(newState.model.items).toHaveLength(1);
      expect(newState.model.items[0].name).toBe('API Server');
      expect(newState.model.items[0].icon).toBe('api');
      expect(newState.primaryView.items).toHaveLength(1);
      expect(newState.primaryView.items[0].tile).toEqual({ x: 5, y: 3 });
    });

    it('should not mutate original state', () => {
      const state = createEmptyDiagram('Test');
      const newState = state.addNode({
        name: 'Node 1',
        x: 0,
        y: 0
      });

      expect(state.model.items).toHaveLength(0);
      expect(newState.model.items).toHaveLength(1);
    });

    it('should add multiple nodes', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });
      state = state.addNode({ name: 'Node 2', x: 5, y: 0 });
      state = state.addNode({ name: 'Node 3', x: 10, y: 0 });

      expect(state.model.items).toHaveLength(3);
      expect(state.primaryView.items).toHaveLength(3);
    });
  });

  describe('updateNode', () => {
    it('should update node properties', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Old Name', icon: 'server', x: 0, y: 0 });
      const nodeId = state.model.items[0].id;

      const newState = state.updateNode({
        nodeId,
        name: 'New Name',
        icon: 'api',
        x: 10,
        y: 5
      });

      expect(newState.model.items[0].name).toBe('New Name');
      expect(newState.model.items[0].icon).toBe('api');
      expect(newState.primaryView.items[0].tile).toEqual({ x: 10, y: 5 });
    });

    it('should only update specified properties', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node', icon: 'server', description: 'Desc', x: 0, y: 0 });
      const nodeId = state.model.items[0].id;

      const newState = state.updateNode({
        nodeId,
        name: 'Updated'
      });

      expect(newState.model.items[0].name).toBe('Updated');
      expect(newState.model.items[0].icon).toBe('server');
      expect(newState.model.items[0].description).toBe('Desc');
    });
  });

  describe('removeNode', () => {
    it('should remove a node', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });
      state = state.addNode({ name: 'Node 2', x: 5, y: 0 });
      const nodeId = state.model.items[0].id;

      const newState = state.removeNode(nodeId);

      expect(newState.model.items).toHaveLength(1);
      expect(newState.model.items[0].name).toBe('Node 2');
    });

    it('should remove connected connectors', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });
      state = state.addNode({ name: 'Node 2', x: 5, y: 0 });
      const node1Id = state.model.items[0].id;
      const node2Id = state.model.items[1].id;

      state = state.addConnector({ fromNodeId: node1Id, toNodeId: node2Id });
      expect(state.primaryView.connectors).toHaveLength(1);

      const newState = state.removeNode(node1Id);
      expect(newState.primaryView.connectors).toHaveLength(0);
    });
  });

  describe('listNodes', () => {
    it('should list all nodes with positions', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', icon: 'server', x: -5, y: 0 });
      state = state.addNode({ name: 'Node 2', icon: 'api', x: 5, y: 0 });

      const nodes = state.listNodes();

      expect(nodes).toHaveLength(2);
      expect(nodes[0].name).toBe('Node 1');
      expect(nodes[0].position).toEqual({ x: -5, y: 0 });
      expect(nodes[1].name).toBe('Node 2');
    });
  });

  describe('addConnector', () => {
    it('should add a connector between nodes', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });
      state = state.addNode({ name: 'Node 2', x: 5, y: 0 });
      const node1Id = state.model.items[0].id;
      const node2Id = state.model.items[1].id;

      const newState = state.addConnector({
        fromNodeId: node1Id,
        toNodeId: node2Id,
        style: 'DASHED',
        showArrow: true
      });

      expect(newState.primaryView.connectors).toHaveLength(1);
      const connector = newState.primaryView.connectors![0];
      expect(connector.style).toBe('DASHED');
      expect(connector.showArrow).toBe(true);
      expect(connector.anchors[0].ref.item).toBe(node1Id);
      expect(connector.anchors[1].ref.item).toBe(node2Id);
    });
  });

  describe('addRectangle', () => {
    it('should add a rectangle', () => {
      const state = createEmptyDiagram('Test');
      const newState = state.addRectangle({
        fromX: -5,
        fromY: -5,
        toX: 5,
        toY: 5,
        color: '#ff0000'
      });

      expect(newState.primaryView.rectangles).toHaveLength(1);
      expect(newState.primaryView.rectangles![0].from).toEqual({ x: -5, y: -5 });
      expect(newState.primaryView.rectangles![0].to).toEqual({ x: 5, y: 5 });
    });
  });

  describe('addTextBox', () => {
    it('should add a text box', () => {
      const state = createEmptyDiagram('Test');
      const newState = state.addTextBox({
        x: 0,
        y: -10,
        content: 'Title',
        orientation: 'X'
      });

      expect(newState.primaryView.textBoxes).toHaveLength(1);
      expect(newState.primaryView.textBoxes![0].content).toBe('Title');
      expect(newState.primaryView.textBoxes![0].tile).toEqual({ x: 0, y: -10 });
    });
  });

  describe('toJSON', () => {
    it('should export to full format by default', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });

      const json = state.toJSON();

      expect((json as Model).title).toBeDefined();
      expect((json as Model).items).toBeDefined();
      expect((json as Model).views).toBeDefined();
    });

    it('should export to compact format when requested', () => {
      let state = createEmptyDiagram('Test');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });

      const json = state.toJSON('compact');

      expect((json as CompactDiagram).t).toBeDefined();
      expect((json as CompactDiagram).i).toBeDefined();
      expect((json as CompactDiagram).v).toBeDefined();
      expect((json as CompactDiagram)._).toBeDefined();
    });
  });

  describe('getInfo', () => {
    it('should return diagram info', () => {
      let state = createEmptyDiagram('My Diagram');
      state = state.addNode({ name: 'Node 1', x: 0, y: 0 });
      state = state.addNode({ name: 'Node 2', x: 5, y: 0 });
      const node1Id = state.model.items[0].id;
      const node2Id = state.model.items[1].id;
      state = state.addConnector({ fromNodeId: node1Id, toNodeId: node2Id });
      state = state.addRectangle({ fromX: 0, fromY: 0, toX: 5, toY: 5 });
      state = state.addTextBox({ x: 0, y: -5, content: 'Title' });

      const info = state.getInfo();

      expect(info.title).toBe('My Diagram');
      expect(info.nodeCount).toBe(2);
      expect(info.connectorCount).toBe(1);
      expect(info.rectangleCount).toBe(1);
      expect(info.textBoxCount).toBe(1);
      expect(info.viewCount).toBe(1);
    });
  });

  describe('createEmptyDiagram helper', () => {
    it('should create diagram with title', () => {
      const state = createEmptyDiagram('Custom Title');
      expect(state.model.title).toBe('Custom Title');
    });

    it('should create untitled diagram without title', () => {
      const state = createEmptyDiagram();
      expect(state.model.title).toBe('Untitled');
    });
  });

  describe('loadDiagram helper', () => {
    it('should load diagram from JSON', () => {
      const compact: CompactDiagram = {
        t: 'Loaded',
        i: [['Node', 'server', 'Desc']],
        v: [[[[0, 0, 0]], []]],
        _: { f: 'compact', v: '1.0' }
      };

      const state = loadDiagram(compact);

      expect(state.model.title).toBe('Loaded');
      expect(state.model.items).toHaveLength(1);
    });
  });
});
