# fossflow-mcp

MCP (Model Context Protocol) server for FossFLOW - control isometric diagrams programmatically through Claude Desktop or any MCP client.

## Features

- 🎨 **17+ Tools** for complete diagram control
- 📐 **Dual Format Support** - Compact (LLM-optimized) and Full (complete data)
- 🔄 **Stateless Design** - Each operation receives and returns complete diagram state
- 🎯 **100+ Icons** - AWS, Azure, GCP, Kubernetes, and generic icons
- 📝 **Natural Language** - Generate diagrams from text descriptions
- 🖼️ **ASCII Preview** - Text-based diagram visualization for LLMs
- ⚡ **Batch Operations** - Execute multiple operations in one call

## Installation

```bash
# From the FossFLOW repository root
cd packages/fossflow-mcp
npm install
npm run build
```

## Usage with Claude Desktop

### 1. Build the MCP Server

```bash
cd packages/fossflow-mcp
npm run build
```

### 2. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fossflow": {
      "command": "node",
      "args": ["/path/to/FossFLOW/packages/fossflow-mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/FossFLOW` with the actual path to your FossFLOW repository.

### 3. Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the MCP server.

## Available Tools

### Diagram Management
| Tool | Description |
|------|-------------|
| `create_diagram` | Create a new empty diagram |
| `get_diagram_info` | Get diagram metadata and counts |
| `validate_diagram` | Validate diagram structure |
| `convert_format` | Convert between compact and full formats |
| `preview_ascii` | Generate ASCII text visualization |

### Node Operations
| Tool | Description |
|------|-------------|
| `add_node` | Add a new node to the diagram |
| `update_node` | Modify existing node properties |
| `remove_node` | Remove a node (and connected connectors) |
| `list_nodes` | List all nodes with positions |

### Connector Operations
| Tool | Description |
|------|-------------|
| `add_connector` | Connect two nodes |
| `update_connector` | Modify connector style/arrow |
| `remove_connector` | Remove a connector |
| `list_connectors` | List all connectors |

### Annotations
| Tool | Description |
|------|-------------|
| `add_rectangle` | Add grouping rectangle |
| `update_rectangle` | Modify rectangle bounds/color |
| `remove_rectangle` | Remove a rectangle |
| `add_textbox` | Add text label |
| `update_textbox` | Modify text content/position |
| `remove_textbox` | Remove a textbox |

### Advanced
| Tool | Description |
|------|-------------|
| `batch_operations` | Execute multiple operations |
| `generate_diagram` | Generate diagram from natural language |
| `process_generated` | Process LLM-generated compact format |

## Resources

The MCP server exposes these resources:

- `icons://catalog` - Complete icon catalog as JSON
- `icons://collections` - List of available icon collections
- `guide://llm-generation` - Guide for LLM diagram generation

## Diagram Formats

### Compact Format (LLM-optimized)

Minimal JSON for efficient token usage:

```json
{
  "t": "My Diagram",
  "i": [
    ["Web Server", "server", "Handles HTTP requests"],
    ["Database", "database", "PostgreSQL"]
  ],
  "v": [[
    [[0, 0, 0], [5, 0, 1]],
    [[0, 1, "SOLID", true]]
  ]],
  "_": { "f": "compact", "v": "1.0" }
}
```

Structure:
- `t` - Title
- `i` - Items: `[name, icon, description]`
- `v` - Views: `[[[x, y, itemIndex], ...], [[fromIdx, toIdx, style?, arrow?], ...]]`
- `_` - Metadata marker

### Full Format (Complete Data)

Standard FossFLOW JSON with all fields:

```json
{
  "title": "My Diagram",
  "items": [
    { "id": "uuid-1", "name": "Web Server", "icon": "server", "description": "..." }
  ],
  "views": [{
    "id": "view-1",
    "name": "Main",
    "items": [{ "id": "uuid-1", "tile": { "x": 0, "y": 0 } }],
    "connectors": [...],
    "rectangles": [...],
    "textBoxes": [...]
  }],
  "icons": [],
  "colors": []
}
```

## Example Conversation

```
User: Create an architecture diagram with a load balancer, two web servers, and a database

Claude: I'll create that architecture diagram for you.

[Uses create_diagram, add_node (x4), add_connector (x3)]

Here's your diagram with:
- Load Balancer at the top
- Two Web Servers in the middle
- Database at the bottom
- Connections showing the flow

[Returns compact format JSON to paste in FossFLOW]
```

## Icon Collections

| Collection | Count | Examples |
|------------|-------|----------|
| isoflow | 21 | server, database, user, cloud, api |
| aws | 25 | ec2, s3, lambda, rds, cloudfront |
| azure | 20 | vm, blob, functions, sql, cdn |
| gcp | 20 | compute, storage, functions, sql |
| kubernetes | 15 | pod, deployment, service, ingress |

Use `search_icons` tool to find icons by name or description.

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npm run build:watch
```

## Architecture

```
fossflow-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── types.ts          # TypeScript definitions
│   ├── state/
│   │   └── DiagramState.ts  # Immutable state manager
│   ├── tools/
│   │   ├── diagram.ts    # Diagram management tools
│   │   ├── nodes.ts      # Node operations
│   │   ├── connectors.ts # Connector operations
│   │   ├── annotations.ts # Rectangles and textboxes
│   │   ├── batch.ts      # Batch operations
│   │   └── generate.ts   # Natural language generation
│   └── utils/
│       ├── formatConverter.ts # Compact ↔ Full conversion
│       ├── iconSearch.ts      # Icon catalog and search
│       └── asciiRenderer.ts   # ASCII diagram preview
└── __tests__/            # Jest tests
```

## License

MIT - See [LICENSE](LICENSE)
