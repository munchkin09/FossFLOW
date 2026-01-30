/**
 * Generate Diagram Tool
 * Generate a diagram from natural language description
 */

import { z } from 'zod';
import { CompactDiagram, Model, OutputFormat } from '../types.js';
import { loadDiagram } from '../state/DiagramState.js';
import { validate } from '../utils/formatConverter.js';
import { renderAscii, renderSummary } from '../utils/asciiRenderer.js';

// ==================== Tool Schema ====================

export const generateDiagramSchema = z.object({
  description: z.string().describe('Natural language description of the diagram to generate'),
  outputFormat: z.enum(['full', 'compact']).default('compact').describe('Output format'),
  includePreview: z.boolean().default(true).describe('Include ASCII preview')
});

// ==================== LLM Generation Guide (embedded) ====================

export const LLM_GENERATION_GUIDE = `
# Compact Format for Diagram Generation

Generate a JSON diagram using this compact format:

\`\`\`json
{
  "t": "Diagram Title (max 40 chars)",
  "i": [
    ["Item Name (max 30 chars)", "icon_name", "Description (max 100 chars)"]
  ],
  "v": [
    [
      [[0, x, y], [1, x, y]],  // positions: [itemIndex, x, y]
      [[0, 1]]                   // connections: [fromIndex, toIndex]
    ]
  ],
  "_": { "f": "compact", "v": "1.0" }
}
\`\`\`

## Available Icons

### Generic (isoflow collection)
storage, server, user, cloud, network, security, api, queue, cache, function, mobile, web, email, analytics, backup, load-balancer, cdn, vpn, firewall, monitor, block

### AWS (prefix: aws-)
aws-ec2, aws-s3, aws-rds, aws-lambda, aws-api-gateway, aws-cloudfront, aws-route-53, aws-vpc, aws-elb, aws-iam, aws-cloudwatch, aws-sns, aws-sqs, aws-dynamodb, aws-elasticsearch, aws-redshift, aws-kinesis, aws-eks, aws-fargate, aws-cognito, aws-ecs, aws-ecr, aws-secrets-manager, aws-kms, aws-step-functions

### Azure (prefix: azure-)
azure-virtual-machine, azure-storage-account, azure-sql-database, azure-app-service, azure-function-app, azure-api-management, azure-cdn, azure-dns, azure-load-balancer, azure-active-directory, azure-monitor, azure-service-bus, azure-cosmos-db, azure-redis-cache, azure-kubernetes-service, azure-container-instances, azure-logic-apps, azure-data-factory, azure-key-vault, azure-cognitive-services

### GCP (prefix: gcp-)
gcp-compute-engine, gcp-cloud-storage, gcp-cloud-sql, gcp-app-engine, gcp-cloud-functions, gcp-api-gateway, gcp-cloud-cdn, gcp-cloud-dns, gcp-cloud-load-balancing, gcp-identity-access-management, gcp-cloud-monitoring, gcp-cloud-pub-sub, gcp-cloud-firestore, gcp-memorystore, gcp-kubernetes-engine, gcp-cloud-run, gcp-cloud-workflows, gcp-cloud-dataflow, gcp-secret-manager, gcp-ai-platform

### Kubernetes (prefix: k8s-)
k8s-pod, k8s-service, k8s-deployment, k8s-configmap, k8s-secret, k8s-ingress, k8s-namespace, k8s-node, k8s-persistent-volume, k8s-daemonset, k8s-statefulset, k8s-job, k8s-cronjob, k8s-hpa, k8s-rbac

## Positioning Guidelines
- X-axis: negative = left, positive = right
- Y-axis: negative = up, positive = down  
- Typical spacing: 4-6 units between components
- Center main components around (0, 0)

## Connection Guidelines
- Connections are directional: [fromIndex, toIndex]
- Use indices from the items array (0-based)

## Example

For "Simple web app with API and database":

\`\`\`json
{
  "t": "Web App Architecture",
  "i": [
    ["Web Frontend", "web", "React application"],
    ["API Server", "api", "REST API"],
    ["Database", "storage", "PostgreSQL"]
  ],
  "v": [
    [
      [[0, -6, 0], [1, 0, 0], [2, 6, 0]],
      [[0, 1], [1, 2]]
    ]
  ],
  "_": { "f": "compact", "v": "1.0" }
}
\`\`\`
`;

// ==================== Tool Implementation ====================

/**
 * Generate a diagram from natural language description
 * 
 * This tool provides the LLM with context and examples to generate
 * a valid diagram in compact format. The LLM should use this as a 
 * prompt template.
 */
export function generateDiagram(params: z.infer<typeof generateDiagramSchema>): {
  success: boolean;
  prompt: string;
  instructions: string;
  example: CompactDiagram;
} {
  // Build the prompt for the LLM to generate a diagram
  const prompt = `
Based on the following description, generate an isometric diagram in compact JSON format.

## User Request
${params.description}

## Format Guide
${LLM_GENERATION_GUIDE}

## Instructions
1. Analyze the description to identify components and their relationships
2. Choose appropriate icons from the available collections
3. Position components logically (flow left-to-right or top-to-bottom)
4. Define connections between related components
5. Output ONLY valid JSON in compact format

Generate the diagram JSON now:
`;

  const example: CompactDiagram = {
    t: "Example Architecture",
    i: [
      ["Frontend", "web", "User interface"],
      ["Backend", "api", "Business logic"],
      ["Database", "storage", "Data persistence"]
    ],
    v: [
      [
        [[0, -6, 0], [1, 0, 0], [2, 6, 0]],
        [[0, 1], [1, 2]]
      ]
    ],
    _: { f: "compact", v: "1.0" }
  };

  return {
    success: true,
    prompt,
    instructions: LLM_GENERATION_GUIDE,
    example
  };
}

/**
 * Validate and process a generated diagram
 */
export function processGeneratedDiagram(params: {
  diagramJson: string | CompactDiagram | Model;
  outputFormat?: OutputFormat;
  includePreview?: boolean;
}): {
  success: boolean;
  diagram?: Model | CompactDiagram;
  preview?: string;
  summary?: string;
  errors?: string[];
} {
  try {
    // Parse JSON if string
    let diagram: CompactDiagram | Model;
    if (typeof params.diagramJson === 'string') {
      try {
        diagram = JSON.parse(params.diagramJson);
      } catch {
        return {
          success: false,
          errors: ['Invalid JSON: Failed to parse diagram']
        };
      }
    } else {
      diagram = params.diagramJson;
    }

    // Validate the diagram
    const validation = validate(diagram);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Load and convert
    const state = loadDiagram(diagram);
    const outputFormat = params.outputFormat || 'compact';
    const outputDiagram = state.toJSON(outputFormat);

    // Generate preview if requested
    let preview: string | undefined;
    let summary: string | undefined;
    if (params.includePreview !== false) {
      try {
        preview = renderAscii(outputDiagram);
        summary = renderSummary(outputDiagram);
      } catch {
        // Ignore preview errors
      }
    }

    return {
      success: true,
      diagram: outputDiagram,
      preview,
      summary
    };
  } catch (e) {
    return {
      success: false,
      errors: [e instanceof Error ? e.message : 'Unknown error']
    };
  }
}
