/**
 * Icon Search Utility
 * Provides fuzzy search across all available icons
 */

import { IconSearchResult } from '../types.js';

// ==================== Icon Catalog ====================
// Based on LLM-GENERATION-GUIDE.md

interface IconDefinition {
  id: string;
  name: string;
  collection: string;
  keywords: string[];
}

// Isoflow basic icons
const ISOFLOW_ICONS: IconDefinition[] = [
  { id: 'storage', name: 'Storage', collection: 'isoflow', keywords: ['database', 'db', 'data'] },
  { id: 'server', name: 'Server', collection: 'isoflow', keywords: ['compute', 'machine', 'host'] },
  { id: 'user', name: 'User', collection: 'isoflow', keywords: ['person', 'human', 'customer'] },
  { id: 'cloud', name: 'Cloud', collection: 'isoflow', keywords: ['cloud', 'hosting', 'service'] },
  { id: 'network', name: 'Network', collection: 'isoflow', keywords: ['net', 'connection', 'link'] },
  { id: 'security', name: 'Security', collection: 'isoflow', keywords: ['firewall', 'lock', 'protect'] },
  { id: 'api', name: 'API', collection: 'isoflow', keywords: ['interface', 'rest', 'endpoint'] },
  { id: 'queue', name: 'Queue', collection: 'isoflow', keywords: ['message', 'broker', 'async'] },
  { id: 'cache', name: 'Cache', collection: 'isoflow', keywords: ['redis', 'memory', 'fast'] },
  { id: 'function', name: 'Function', collection: 'isoflow', keywords: ['lambda', 'serverless', 'code'] },
  { id: 'mobile', name: 'Mobile', collection: 'isoflow', keywords: ['phone', 'app', 'ios', 'android'] },
  { id: 'web', name: 'Web', collection: 'isoflow', keywords: ['browser', 'frontend', 'website'] },
  { id: 'email', name: 'Email', collection: 'isoflow', keywords: ['mail', 'notification', 'smtp'] },
  { id: 'analytics', name: 'Analytics', collection: 'isoflow', keywords: ['metrics', 'monitoring', 'logs'] },
  { id: 'backup', name: 'Backup', collection: 'isoflow', keywords: ['recovery', 'disaster', 'restore'] },
  { id: 'load-balancer', name: 'Load Balancer', collection: 'isoflow', keywords: ['lb', 'traffic', 'distribute'] },
  { id: 'cdn', name: 'CDN', collection: 'isoflow', keywords: ['content', 'delivery', 'edge'] },
  { id: 'vpn', name: 'VPN', collection: 'isoflow', keywords: ['tunnel', 'secure', 'private'] },
  { id: 'firewall', name: 'Firewall', collection: 'isoflow', keywords: ['waf', 'security', 'protect'] },
  { id: 'monitor', name: 'Monitor', collection: 'isoflow', keywords: ['watch', 'observe', 'alert'] },
  { id: 'block', name: 'Block', collection: 'isoflow', keywords: ['generic', 'component', 'box'] }
];

// AWS icons (commonly used subset)
const AWS_ICONS: IconDefinition[] = [
  { id: 'aws-ec2', name: 'EC2', collection: 'aws', keywords: ['compute', 'instance', 'server', 'vm'] },
  { id: 'aws-s3', name: 'S3', collection: 'aws', keywords: ['storage', 'bucket', 'object', 'file'] },
  { id: 'aws-rds', name: 'RDS', collection: 'aws', keywords: ['database', 'sql', 'mysql', 'postgres'] },
  { id: 'aws-lambda', name: 'Lambda', collection: 'aws', keywords: ['function', 'serverless', 'compute'] },
  { id: 'aws-api-gateway', name: 'API Gateway', collection: 'aws', keywords: ['api', 'rest', 'http'] },
  { id: 'aws-cloudfront', name: 'CloudFront', collection: 'aws', keywords: ['cdn', 'cache', 'edge'] },
  { id: 'aws-route-53', name: 'Route 53', collection: 'aws', keywords: ['dns', 'domain', 'routing'] },
  { id: 'aws-vpc', name: 'VPC', collection: 'aws', keywords: ['network', 'virtual', 'private'] },
  { id: 'aws-elb', name: 'ELB', collection: 'aws', keywords: ['load-balancer', 'alb', 'nlb'] },
  { id: 'aws-iam', name: 'IAM', collection: 'aws', keywords: ['identity', 'access', 'security'] },
  { id: 'aws-cloudwatch', name: 'CloudWatch', collection: 'aws', keywords: ['monitoring', 'logs', 'metrics'] },
  { id: 'aws-sns', name: 'SNS', collection: 'aws', keywords: ['notification', 'pubsub', 'message'] },
  { id: 'aws-sqs', name: 'SQS', collection: 'aws', keywords: ['queue', 'message', 'async'] },
  { id: 'aws-dynamodb', name: 'DynamoDB', collection: 'aws', keywords: ['nosql', 'database', 'document'] },
  { id: 'aws-elasticsearch', name: 'Elasticsearch', collection: 'aws', keywords: ['search', 'opensearch'] },
  { id: 'aws-redshift', name: 'Redshift', collection: 'aws', keywords: ['warehouse', 'analytics', 'data'] },
  { id: 'aws-kinesis', name: 'Kinesis', collection: 'aws', keywords: ['streaming', 'data', 'realtime'] },
  { id: 'aws-eks', name: 'EKS', collection: 'aws', keywords: ['kubernetes', 'k8s', 'container'] },
  { id: 'aws-fargate', name: 'Fargate', collection: 'aws', keywords: ['container', 'serverless', 'ecs'] },
  { id: 'aws-cognito', name: 'Cognito', collection: 'aws', keywords: ['auth', 'user', 'identity'] },
  { id: 'aws-ecs', name: 'ECS', collection: 'aws', keywords: ['container', 'docker', 'cluster'] },
  { id: 'aws-ecr', name: 'ECR', collection: 'aws', keywords: ['registry', 'container', 'docker'] },
  { id: 'aws-secrets-manager', name: 'Secrets Manager', collection: 'aws', keywords: ['secret', 'credential'] },
  { id: 'aws-kms', name: 'KMS', collection: 'aws', keywords: ['key', 'encryption', 'crypto'] },
  { id: 'aws-step-functions', name: 'Step Functions', collection: 'aws', keywords: ['workflow', 'state'] }
];

// Azure icons (commonly used subset)
const AZURE_ICONS: IconDefinition[] = [
  { id: 'azure-virtual-machine', name: 'Virtual Machine', collection: 'azure', keywords: ['vm', 'compute'] },
  { id: 'azure-storage-account', name: 'Storage Account', collection: 'azure', keywords: ['blob', 'file'] },
  { id: 'azure-sql-database', name: 'SQL Database', collection: 'azure', keywords: ['database', 'sql'] },
  { id: 'azure-app-service', name: 'App Service', collection: 'azure', keywords: ['web', 'hosting'] },
  { id: 'azure-function-app', name: 'Function App', collection: 'azure', keywords: ['serverless', 'function'] },
  { id: 'azure-api-management', name: 'API Management', collection: 'azure', keywords: ['api', 'gateway'] },
  { id: 'azure-cdn', name: 'CDN', collection: 'azure', keywords: ['content', 'delivery', 'cache'] },
  { id: 'azure-dns', name: 'DNS', collection: 'azure', keywords: ['domain', 'name', 'resolution'] },
  { id: 'azure-load-balancer', name: 'Load Balancer', collection: 'azure', keywords: ['lb', 'traffic'] },
  { id: 'azure-active-directory', name: 'Active Directory', collection: 'azure', keywords: ['identity', 'auth'] },
  { id: 'azure-monitor', name: 'Monitor', collection: 'azure', keywords: ['logging', 'metrics', 'alert'] },
  { id: 'azure-service-bus', name: 'Service Bus', collection: 'azure', keywords: ['message', 'queue'] },
  { id: 'azure-cosmos-db', name: 'Cosmos DB', collection: 'azure', keywords: ['nosql', 'database'] },
  { id: 'azure-redis-cache', name: 'Redis Cache', collection: 'azure', keywords: ['cache', 'memory'] },
  { id: 'azure-kubernetes-service', name: 'Kubernetes Service', collection: 'azure', keywords: ['k8s', 'aks'] },
  { id: 'azure-container-instances', name: 'Container Instances', collection: 'azure', keywords: ['docker'] },
  { id: 'azure-logic-apps', name: 'Logic Apps', collection: 'azure', keywords: ['workflow', 'automation'] },
  { id: 'azure-data-factory', name: 'Data Factory', collection: 'azure', keywords: ['etl', 'pipeline'] },
  { id: 'azure-key-vault', name: 'Key Vault', collection: 'azure', keywords: ['secret', 'key', 'cert'] },
  { id: 'azure-cognitive-services', name: 'Cognitive Services', collection: 'azure', keywords: ['ai', 'ml'] }
];

// GCP icons (commonly used subset)
const GCP_ICONS: IconDefinition[] = [
  { id: 'gcp-compute-engine', name: 'Compute Engine', collection: 'gcp', keywords: ['vm', 'instance'] },
  { id: 'gcp-cloud-storage', name: 'Cloud Storage', collection: 'gcp', keywords: ['bucket', 'object', 'file'] },
  { id: 'gcp-cloud-sql', name: 'Cloud SQL', collection: 'gcp', keywords: ['database', 'mysql', 'postgres'] },
  { id: 'gcp-app-engine', name: 'App Engine', collection: 'gcp', keywords: ['paas', 'web', 'hosting'] },
  { id: 'gcp-cloud-functions', name: 'Cloud Functions', collection: 'gcp', keywords: ['serverless', 'function'] },
  { id: 'gcp-api-gateway', name: 'API Gateway', collection: 'gcp', keywords: ['api', 'rest', 'http'] },
  { id: 'gcp-cloud-cdn', name: 'Cloud CDN', collection: 'gcp', keywords: ['cache', 'edge', 'delivery'] },
  { id: 'gcp-cloud-dns', name: 'Cloud DNS', collection: 'gcp', keywords: ['domain', 'name'] },
  { id: 'gcp-cloud-load-balancing', name: 'Cloud Load Balancing', collection: 'gcp', keywords: ['lb', 'traffic'] },
  { id: 'gcp-identity-access-management', name: 'IAM', collection: 'gcp', keywords: ['identity', 'auth'] },
  { id: 'gcp-cloud-monitoring', name: 'Cloud Monitoring', collection: 'gcp', keywords: ['metrics', 'alert'] },
  { id: 'gcp-cloud-pub-sub', name: 'Pub/Sub', collection: 'gcp', keywords: ['message', 'queue', 'event'] },
  { id: 'gcp-cloud-firestore', name: 'Firestore', collection: 'gcp', keywords: ['nosql', 'document'] },
  { id: 'gcp-memorystore', name: 'Memorystore', collection: 'gcp', keywords: ['redis', 'cache'] },
  { id: 'gcp-kubernetes-engine', name: 'Kubernetes Engine', collection: 'gcp', keywords: ['gke', 'k8s'] },
  { id: 'gcp-cloud-run', name: 'Cloud Run', collection: 'gcp', keywords: ['container', 'serverless'] },
  { id: 'gcp-cloud-workflows', name: 'Cloud Workflows', collection: 'gcp', keywords: ['orchestration'] },
  { id: 'gcp-cloud-dataflow', name: 'Cloud Dataflow', collection: 'gcp', keywords: ['stream', 'batch'] },
  { id: 'gcp-secret-manager', name: 'Secret Manager', collection: 'gcp', keywords: ['secret', 'credential'] },
  { id: 'gcp-ai-platform', name: 'AI Platform', collection: 'gcp', keywords: ['ml', 'machine-learning'] }
];

// Kubernetes icons
const K8S_ICONS: IconDefinition[] = [
  { id: 'k8s-pod', name: 'Pod', collection: 'kubernetes', keywords: ['container', 'workload'] },
  { id: 'k8s-service', name: 'Service', collection: 'kubernetes', keywords: ['network', 'expose'] },
  { id: 'k8s-deployment', name: 'Deployment', collection: 'kubernetes', keywords: ['replica', 'rollout'] },
  { id: 'k8s-configmap', name: 'ConfigMap', collection: 'kubernetes', keywords: ['config', 'env'] },
  { id: 'k8s-secret', name: 'Secret', collection: 'kubernetes', keywords: ['credential', 'sensitive'] },
  { id: 'k8s-ingress', name: 'Ingress', collection: 'kubernetes', keywords: ['route', 'http', 'traffic'] },
  { id: 'k8s-namespace', name: 'Namespace', collection: 'kubernetes', keywords: ['isolation', 'tenant'] },
  { id: 'k8s-node', name: 'Node', collection: 'kubernetes', keywords: ['worker', 'machine'] },
  { id: 'k8s-persistent-volume', name: 'Persistent Volume', collection: 'kubernetes', keywords: ['storage', 'pv'] },
  { id: 'k8s-daemonset', name: 'DaemonSet', collection: 'kubernetes', keywords: ['node', 'agent'] },
  { id: 'k8s-statefulset', name: 'StatefulSet', collection: 'kubernetes', keywords: ['stateful', 'database'] },
  { id: 'k8s-job', name: 'Job', collection: 'kubernetes', keywords: ['batch', 'task'] },
  { id: 'k8s-cronjob', name: 'CronJob', collection: 'kubernetes', keywords: ['schedule', 'periodic'] },
  { id: 'k8s-hpa', name: 'HPA', collection: 'kubernetes', keywords: ['autoscale', 'horizontal'] },
  { id: 'k8s-rbac', name: 'RBAC', collection: 'kubernetes', keywords: ['role', 'permission', 'access'] }
];

// All icons combined
const ALL_ICONS: IconDefinition[] = [
  ...ISOFLOW_ICONS,
  ...AWS_ICONS,
  ...AZURE_ICONS,
  ...GCP_ICONS,
  ...K8S_ICONS
];

/**
 * Calculate fuzzy match score between query and text
 * Returns a score from 0 to 1, higher is better
 */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match
  if (t === q) return 1;

  // Starts with
  if (t.startsWith(q)) return 0.9;

  // Contains
  if (t.includes(q)) return 0.7;

  // Fuzzy character matching
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }

  if (queryIndex === q.length) {
    return 0.5 * (score / t.length);
  }

  return 0;
}

/**
 * Search icons by query
 */
export function searchIcons(params: {
  query: string;
  collection?: string;
  limit?: number;
}): IconSearchResult[] {
  const { query, collection, limit = 20 } = params;
  const q = query.toLowerCase().trim();

  // Filter by collection if specified
  let icons = ALL_ICONS;
  if (collection) {
    const collectionLower = collection.toLowerCase();
    icons = icons.filter(
      (icon) =>
        icon.collection.toLowerCase() === collectionLower ||
        icon.id.startsWith(collectionLower + '-')
    );
  }

  // If no query, return all (limited)
  if (!q) {
    return icons.slice(0, limit).map((icon) => ({
      id: icon.id,
      name: icon.name,
      collection: icon.collection
    }));
  }

  // Score each icon
  const scored = icons.map((icon) => {
    // Check ID
    const idScore = fuzzyScore(q, icon.id);
    // Check name
    const nameScore = fuzzyScore(q, icon.name);
    // Check keywords
    const keywordScores = icon.keywords.map((kw) => fuzzyScore(q, kw));
    const maxKeywordScore = Math.max(0, ...keywordScores);

    const totalScore = Math.max(idScore, nameScore, maxKeywordScore);

    return { icon, score: totalScore };
  });

  // Filter and sort by score
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      id: s.icon.id,
      name: s.icon.name,
      collection: s.icon.collection
    }));
}

/**
 * Get all icons grouped by collection
 */
export function getIconCatalog(): Record<string, IconSearchResult[]> {
  const catalog: Record<string, IconSearchResult[]> = {};

  for (const icon of ALL_ICONS) {
    if (!catalog[icon.collection]) {
      catalog[icon.collection] = [];
    }
    catalog[icon.collection].push({
      id: icon.id,
      name: icon.name,
      collection: icon.collection
    });
  }

  return catalog;
}

/**
 * Get list of available collections
 */
export function getCollections(): string[] {
  return ['isoflow', 'aws', 'azure', 'gcp', 'kubernetes'];
}

/**
 * Check if an icon ID is valid
 */
export function isValidIcon(iconId: string): boolean {
  return ALL_ICONS.some((icon) => icon.id === iconId);
}
