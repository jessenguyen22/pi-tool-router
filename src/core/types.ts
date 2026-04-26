/**
 * Core type definitions for pi-tool-router
 * 
 * Defines all interfaces and types used across the routing system.
 */

// ============================================================================
// Tool Capabilities
// ============================================================================

export type ToolCapability = 
  | "web_search"
  | "web_fetch"
  | "code_search"
  | "code_analysis"
  | "file_read"
  | "file_write"
  | "file_edit"
  | "bash_exec"
  | "git_ops"
  | "api_call"
  | "data_processing"
  | "image_generation"
  | "custom";

/**
 * Tool capability registry - maps tool names to their capabilities
 */
export const TOOL_CAPABILITIES: Record<string, ToolCapability[]> = {
  web_search: ["web_search"],
  ollama_web_search: ["web_search"],
  code_search: ["code_search", "code_analysis"],
  fetch_content: ["web_fetch", "web_search"],
  ollama_web_fetch: ["web_fetch"],
  grep: ["code_analysis", "code_search"],
  read: ["file_read"],
  edit: ["file_edit"],
  write: ["file_write"],
  bash: ["bash_exec"],
  ls: ["file_read"],
  find: ["code_analysis", "file_read"],
};

// ============================================================================
// Tool Info
// ============================================================================

export interface ToolInfo {
  name: string;
  label: string;
  description: string;
  capabilities: ToolCapability[];
  cost: number; // Estimated cost per use (in USD)
  priority: number; // Base priority (0-10)
  weight: number; // Computed weight for routing
  source: "builtin" | "extension" | "custom";
  sourceInfo?: {
    path: string;
    scope: string;
  };
  isAvailable: boolean;
  lastUsed?: Date;
  usageCount: number;
  successRate: number;
  averageDuration: number; // ms
}

// ============================================================================
// Routing Context & Decision
// ============================================================================

export type RoutingStrategyType = "auto" | "priority" | "cost" | "capability" | "custom";

export interface RoutingContext {
  query: string;
  strategy?: RoutingStrategyType;
  context?: string;
  cwd?: string;
  userId?: string;
  timestamp?: Date;
}

export interface RoutingDecision {
  tool: ToolInfo;
  confidence: number; // 0-1
  strategy: RoutingStrategyType;
  alternatives: Array<{ name: string; weight: number }>;
  reasoning: string[];
  timestamp: Date;
  executionResult?: ToolExecutionResult;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  cost: number;
}

// ============================================================================
// Router Configuration
// ============================================================================

export interface RouterConfig {
  enabled: boolean;
  defaultStrategy: RoutingStrategyType;
  strategies: {
    priority: StrategyConfig;
    cost: StrategyConfig & { maxCostPerTask?: number };
    capability: StrategyConfig & { strictMatching?: boolean };
    custom?: StrategyConfig;
  };
  toolWeights: Record<string, number>;
  routingRules: RoutingRule[];
  analytics: AnalyticsConfig;
  fallback: FallbackConfig;
}

export interface StrategyConfig {
  enabled: boolean;
  fallbackEnabled: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  trackCosts: boolean;
  trackPerformance: boolean;
}

export interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  fallbackOrder: string[];
}

// ============================================================================
// Routing Rules
// ============================================================================

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // Higher = more priority
  match: RoutingMatch;
  preferredTools: string[];
  excludeTools?: string[];
  strategy?: RoutingStrategyType;
  metadata?: Record<string, unknown>;
}

export interface RoutingMatch {
  queryPatterns?: string[]; // Regex patterns in query
  capabilities?: ToolCapability[]; // Required capabilities
  contextPatterns?: string[]; // Patterns in context string
  filePatterns?: string[]; // File path patterns
  minConfidence?: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface RoutingAnalytics {
  query: string;
  selectedTool: string;
  alternatives: Array<{ name: string; weight: number }>;
  confidence: number;
  duration: number;
  strategy: RoutingStrategyType;
  timestamp: Date;
}

export interface RouterStats {
  totalRequests: number;
  toolUsage: Record<string, number>;
  averageConfidence: number;
  averageDuration: number;
  totalCost: number;
  topTools: Array<{ name: string; count: number; totalDuration: number }>;
  successRate: number;
  strategyUsage: Record<string, number>;
}

export interface ToolSelection {
  toolName: string;
  confidence: number;
  reasoning: string[];
  alternatives?: Array<{ name: string; weight: number }>;
}

export interface RoutingStrategy {
  name: string;
  description: string;
  selectTool(context: RoutingContext, tools: ToolInfo[], rules: RoutingRule[]): ToolSelection;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG: RouterConfig = {
  enabled: true,
  defaultStrategy: "auto",
  strategies: {
    priority: { enabled: true, fallbackEnabled: true },
    cost: { enabled: true, fallbackEnabled: true, maxCostPerTask: 5.0 },
    capability: { enabled: true, fallbackEnabled: true, strictMatching: false },
    custom: { enabled: true, fallbackEnabled: true },
  },
  toolWeights: {
    web_search: 10,
    ollama_web_search: 9,
    code_search: 8,
    fetch_content: 7,
    grep: 6,
    read: 5,
    edit: 5,
    bash: 4,
    write: 4,
    find: 4,
  },
  routingRules: [
    {
      id: "real-time-info",
      name: "Real-time Information",
      enabled: true,
      priority: 10,
      match: {
        queryPatterns: ["news", "latest", "current", "price", "weather", "stock", "live", "today", "2026"],
      },
      preferredTools: ["ollama_web_search", "web_search", "fetch_content"],
    },
    {
      id: "code-analysis",
      name: "Code Analysis",
      enabled: true,
      priority: 9,
      match: {
        queryPatterns: ["function", "class", "api", "implementation", "code", "source", "import", "export"],
        capabilities: ["code_analysis", "code_search"],
      },
      preferredTools: ["code_search", "grep", "read", "find"],
    },
    {
      id: "file-operations",
      name: "File Operations",
      enabled: true,
      priority: 8,
      match: {
        queryPatterns: ["create file", "write file", "edit file", "modify", "add to", "update"],
        capabilities: ["file_write", "file_edit"],
      },
      preferredTools: ["edit", "write"],
    },
    {
      id: "web-fetch",
      name: "Web Content Fetch",
      enabled: true,
      priority: 8,
      match: {
        queryPatterns: ["fetch", "scrape", "extract from", "read url", "visit", "open"],
        capabilities: ["web_fetch"],
      },
      preferredTools: ["ollama_web_fetch", "fetch_content"],
    },
    {
      id: "bash-commands",
      name: "Bash Commands",
      enabled: true,
      priority: 7,
      match: {
        queryPatterns: ["run", "execute", "command", "install", "build", "test", "npm", "git"],
        capabilities: ["bash_exec"],
      },
      preferredTools: ["bash"],
    },
  ],
  analytics: {
    enabled: true,
    retentionDays: 30,
    trackCosts: true,
    trackPerformance: true,
  },
  fallback: {
    enabled: true,
    maxRetries: 3,
    fallbackOrder: ["web_search", "code_search", "read"],
  },
};
