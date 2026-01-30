#!/usr/bin/env node
/**
 * FossFLOW MCP Server
 * Model Context Protocol server for creating and manipulating isometric diagrams
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { Model, CompactDiagram } from './types.js';

// Import tools
import {
  createDiagram,
  createDiagramSchema,
  validateDiagram,
  validateDiagramSchema,
  convertFormat,
  convertFormatSchema,
  getDiagramInfo,
  getDiagramInfoSchema,
  previewAscii,
  previewAsciiSchema
} from './tools/diagram.js';

import {
  addNode,
  addNodeSchema,
  updateNode,
  updateNodeSchema,
  removeNode,
  removeNodeSchema,
  listNodes,
  listNodesSchema
} from './tools/nodes.js';

import {
  addConnector,
  addConnectorSchema,
  updateConnector,
  updateConnectorSchema,
  removeConnector,
  removeConnectorSchema,
  listConnectors,
  listConnectorsSchema
} from './tools/connectors.js';

import {
  addRectangle,
  addRectangleSchema,
  removeRectangle,
  removeRectangleSchema,
  addTextBox,
  addTextBoxSchema,
  removeTextBox,
  removeTextBoxSchema,
  removeAnnotation,
  removeAnnotationSchema,
  listAnnotations,
  listAnnotationsSchema
} from './tools/annotations.js';

import {
  batchOperations,
  batchOperationsSchema
} from './tools/batch.js';

import {
  generateDiagram,
  generateDiagramSchema,
  processGeneratedDiagram,
  LLM_GENERATION_GUIDE
} from './tools/generate.js';

import { searchIcons, getIconCatalog, getCollections } from './utils/iconSearch.js';

// ==================== Server Setup ====================

const server = new Server(
  {
    name: 'fossflow-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// ==================== Tools ====================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Diagram management
      {
        name: 'create_diagram',
        description: 'Create a new empty isometric diagram',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title for the new diagram (max 100 chars)' },
            description: { type: 'string', description: 'Optional description (max 1000 chars)' },
            outputFormat: { type: 'string', enum: ['full', 'compact'], default: 'full' }
          },
          required: ['title']
        }
      },
      {
        name: 'validate_diagram',
        description: 'Validate a diagram structure and check for errors',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to validate (compact or full format)' }
          },
          required: ['diagram']
        }
      },
      {
        name: 'convert_format',
        description: 'Convert a diagram between compact and full formats',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to convert' },
            targetFormat: { type: 'string', enum: ['full', 'compact'], description: 'Target format' }
          },
          required: ['diagram', 'targetFormat']
        }
      },
      {
        name: 'get_diagram_info',
        description: 'Get information about a diagram (node count, connectors, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to get info from' }
          },
          required: ['diagram']
        }
      },
      {
        name: 'preview_ascii',
        description: 'Generate an ASCII text preview of the diagram for visualization',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to preview' },
            showCoords: { type: 'boolean', default: true, description: 'Show grid coordinates' }
          },
          required: ['diagram']
        }
      },

      // Node operations
      {
        name: 'add_node',
        description: 'Add a new node to the diagram with an icon and position',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            name: { type: 'string', description: 'Name of the node (max 100 chars)' },
            icon: { type: 'string', description: 'Icon ID (e.g., "aws-lambda", "storage", "k8s-pod")' },
            description: { type: 'string', description: 'Optional description (max 1000 chars)' },
            x: { type: 'number', description: 'X coordinate on the grid' },
            y: { type: 'number', description: 'Y coordinate on the grid' },
            labelHeight: { type: 'number', description: 'Label height offset (default: 80)' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'name', 'x', 'y']
        }
      },
      {
        name: 'update_node',
        description: 'Update an existing node (name, icon, position, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            nodeId: { type: 'string', description: 'ID of the node to update' },
            name: { type: 'string', description: 'New name' },
            icon: { type: 'string', description: 'New icon ID' },
            description: { type: 'string', description: 'New description' },
            x: { type: 'number', description: 'New X coordinate' },
            y: { type: 'number', description: 'New Y coordinate' },
            labelHeight: { type: 'number', description: 'New label height' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'nodeId']
        }
      },
      {
        name: 'remove_node',
        description: 'Remove a node from the diagram (also removes connected connectors)',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            nodeId: { type: 'string', description: 'ID of the node to remove' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'nodeId']
        }
      },
      {
        name: 'list_nodes',
        description: 'List all nodes in the diagram with their positions',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to list nodes from' }
          },
          required: ['diagram']
        }
      },

      // Connector operations
      {
        name: 'add_connector',
        description: 'Add a connector (line) between two nodes',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            fromNodeId: { type: 'string', description: 'ID of the source node' },
            toNodeId: { type: 'string', description: 'ID of the target node' },
            style: { type: 'string', enum: ['SOLID', 'DOTTED', 'DASHED'], description: 'Line style' },
            lineType: { type: 'string', enum: ['SINGLE', 'DOUBLE', 'DOUBLE_WITH_CIRCLE'] },
            color: { type: 'string', description: 'Color ID or hex color' },
            showArrow: { type: 'boolean', description: 'Show arrow at end (default: true)' },
            label: { type: 'string', description: 'Label text for the connector' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'fromNodeId', 'toNodeId']
        }
      },
      {
        name: 'update_connector',
        description: 'Update an existing connector (style, color, label)',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            connectorId: { type: 'string', description: 'ID of the connector to update' },
            style: { type: 'string', enum: ['SOLID', 'DOTTED', 'DASHED'] },
            lineType: { type: 'string', enum: ['SINGLE', 'DOUBLE', 'DOUBLE_WITH_CIRCLE'] },
            color: { type: 'string' },
            showArrow: { type: 'boolean' },
            label: { type: 'string' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'connectorId']
        }
      },
      {
        name: 'remove_connector',
        description: 'Remove a connector from the diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            connectorId: { type: 'string', description: 'ID of the connector to remove' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'connectorId']
        }
      },
      {
        name: 'list_connectors',
        description: 'List all connectors in the diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to list connectors from' }
          },
          required: ['diagram']
        }
      },

      // Annotation operations
      {
        name: 'add_rectangle',
        description: 'Add a background rectangle to the diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            fromX: { type: 'number', description: 'X coordinate of top-left corner' },
            fromY: { type: 'number', description: 'Y coordinate of top-left corner' },
            toX: { type: 'number', description: 'X coordinate of bottom-right corner' },
            toY: { type: 'number', description: 'Y coordinate of bottom-right corner' },
            color: { type: 'string', description: 'Color ID or hex color' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'fromX', 'fromY', 'toX', 'toY']
        }
      },
      {
        name: 'add_textbox',
        description: 'Add a text annotation to the diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            x: { type: 'number', description: 'X coordinate for the text box' },
            y: { type: 'number', description: 'Y coordinate for the text box' },
            content: { type: 'string', description: 'Text content (max 100 chars)' },
            orientation: { type: 'string', enum: ['X', 'Y'], description: 'Text orientation' },
            fontSize: { type: 'number', description: 'Font size multiplier (0.1-2)' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'x', 'y', 'content']
        }
      },
      {
        name: 'remove_annotation',
        description: 'Remove a rectangle or text box by ID',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            annotationId: { type: 'string', description: 'ID of the annotation to remove' },
            outputFormat: { type: 'string', enum: ['full', 'compact'] }
          },
          required: ['diagram', 'annotationId']
        }
      },
      {
        name: 'list_annotations',
        description: 'List all rectangles and text boxes in the diagram',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The diagram to list annotations from' }
          },
          required: ['diagram']
        }
      },

      // Batch operations
      {
        name: 'batch_operations',
        description: 'Apply multiple operations in a single call for efficiency',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: { type: 'object', description: 'The current diagram' },
            operations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  op: { type: 'string', description: 'Operation name' },
                  params: { type: 'object', description: 'Operation parameters' }
                },
                required: ['op', 'params']
              },
              description: 'Array of operations to apply'
            },
            outputFormat: { type: 'string', enum: ['full', 'compact'] },
            includePreview: { type: 'boolean', description: 'Include ASCII preview' }
          },
          required: ['diagram', 'operations']
        }
      },

      // Search icons
      {
        name: 'search_icons',
        description: 'Search for available icons by name or category (aws, azure, gcp, kubernetes, isoflow)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (icon name, service name, or keyword)' },
            collection: { type: 'string', description: 'Filter by collection: isoflow, aws, azure, gcp, kubernetes' },
            limit: { type: 'number', description: 'Max results to return (default: 20)' }
          },
          required: ['query']
        }
      },

      // Generate diagram
      {
        name: 'generate_diagram',
        description: 'Get a prompt template for generating a diagram from natural language description',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Natural language description of the diagram' },
            outputFormat: { type: 'string', enum: ['full', 'compact'], default: 'compact' },
            includePreview: { type: 'boolean', default: true }
          },
          required: ['description']
        }
      },

      // Process generated diagram
      {
        name: 'process_generated_diagram',
        description: 'Validate and process a generated diagram JSON',
        inputSchema: {
          type: 'object',
          properties: {
            diagramJson: { 
              oneOf: [
                { type: 'string', description: 'JSON string of the diagram' },
                { type: 'object', description: 'Diagram object' }
              ]
            },
            outputFormat: { type: 'string', enum: ['full', 'compact'] },
            includePreview: { type: 'boolean', default: true }
          },
          required: ['diagramJson']
        }
      }
    ]
  };
});

// ==================== Tool Handler ====================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Diagram tools
      case 'create_diagram':
        result = createDiagram(createDiagramSchema.parse(args));
        break;
      case 'validate_diagram':
        result = validateDiagram(validateDiagramSchema.parse(args));
        break;
      case 'convert_format':
        result = convertFormat(convertFormatSchema.parse(args));
        break;
      case 'get_diagram_info':
        result = getDiagramInfo(getDiagramInfoSchema.parse(args));
        break;
      case 'preview_ascii':
        result = previewAscii(previewAsciiSchema.parse(args));
        break;

      // Node tools
      case 'add_node':
        result = addNode(addNodeSchema.parse(args));
        break;
      case 'update_node':
        result = updateNode(updateNodeSchema.parse(args));
        break;
      case 'remove_node':
        result = removeNode(removeNodeSchema.parse(args));
        break;
      case 'list_nodes':
        result = listNodes(listNodesSchema.parse(args));
        break;

      // Connector tools
      case 'add_connector':
        result = addConnector(addConnectorSchema.parse(args));
        break;
      case 'update_connector':
        result = updateConnector(updateConnectorSchema.parse(args));
        break;
      case 'remove_connector':
        result = removeConnector(removeConnectorSchema.parse(args));
        break;
      case 'list_connectors':
        result = listConnectors(listConnectorsSchema.parse(args));
        break;

      // Annotation tools
      case 'add_rectangle':
        result = addRectangle(addRectangleSchema.parse(args));
        break;
      case 'add_textbox':
        result = addTextBox(addTextBoxSchema.parse(args));
        break;
      case 'remove_annotation':
        result = removeAnnotation(removeAnnotationSchema.parse(args));
        break;
      case 'list_annotations':
        result = listAnnotations(listAnnotationsSchema.parse(args));
        break;

      // Batch operations
      case 'batch_operations':
        result = batchOperations(batchOperationsSchema.parse(args));
        break;

      // Search icons
      case 'search_icons':
        result = searchIcons({
          query: (args as { query: string }).query,
          collection: (args as { collection?: string }).collection,
          limit: (args as { limit?: number }).limit
        });
        break;

      // Generate diagram
      case 'generate_diagram':
        result = generateDiagram(generateDiagramSchema.parse(args));
        break;

      case 'process_generated_diagram':
        result = processGeneratedDiagram({
          diagramJson: (args as { diagramJson: string | Model | CompactDiagram }).diagramJson,
          outputFormat: (args as { outputFormat?: 'full' | 'compact' }).outputFormat,
          includePreview: (args as { includePreview?: boolean }).includePreview
        });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message })
        }
      ],
      isError: true
    };
  }
});

// ==================== Resources ====================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'icons://catalog',
        name: 'Icon Catalog',
        description: 'Complete catalog of available icons grouped by collection',
        mimeType: 'application/json'
      },
      {
        uri: 'icons://collections',
        name: 'Icon Collections',
        description: 'List of available icon collections',
        mimeType: 'application/json'
      },
      {
        uri: 'guide://llm-generation',
        name: 'LLM Generation Guide',
        description: 'Guide for generating diagrams with compact format',
        mimeType: 'text/markdown'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'icons://catalog':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getIconCatalog(), null, 2)
          }
        ]
      };

    case 'icons://collections':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getCollections(), null, 2)
          }
        ]
      };

    case 'guide://llm-generation':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: LLM_GENERATION_GUIDE
          }
        ]
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ==================== Prompts ====================

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'diagram-from-description',
        description: 'Generate an isometric diagram from a natural language description',
        arguments: [
          {
            name: 'description',
            description: 'Description of the diagram to generate',
            required: true
          },
          {
            name: 'cloud_provider',
            description: 'Preferred cloud provider for icons (aws, azure, gcp, or generic)',
            required: false
          }
        ]
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'diagram-from-description') {
    const description = args?.description || 'A simple web application architecture';
    const cloudProvider = args?.cloud_provider || 'generic';

    let iconHint = '';
    if (cloudProvider === 'aws') {
      iconHint = 'Use AWS icons (prefix: aws-) for cloud services.';
    } else if (cloudProvider === 'azure') {
      iconHint = 'Use Azure icons (prefix: azure-) for cloud services.';
    } else if (cloudProvider === 'gcp') {
      iconHint = 'Use GCP icons (prefix: gcp-) for cloud services.';
    } else {
      iconHint = 'Use generic icons from the isoflow collection.';
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate an isometric diagram for the following:

${description}

${iconHint}

${LLM_GENERATION_GUIDE}

Please generate the diagram in compact JSON format.`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// ==================== Server Start ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FossFLOW MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
