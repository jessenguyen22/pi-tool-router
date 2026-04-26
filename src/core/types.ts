/**
 * Core types for Router and routing engine
 * 
 * These types are designed to be compatible with ConfigManager types.
 */

// ============================================================================
// Tool Capabilities
// ============================================================================

export type ToolCapability =
  | "web_search"
  | "web_fetch"
  | "code_search"
  | "code_analysis"
  | "code_edit"
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
 * Tool capability registry
 */
export const TOOL_CAPABILITIES: Record<string, ToolCapability[]> = {
  web_search: ["web_search"],
  code_search: ["code_search", "code_analysis"],
  fetch_content: ["web_fetch", "web_search"],
  read: ["file_read"],
  bash: ["bash_exec"],
  write: ["file_write"],
  edit: ["file_edit"],
  search: ["code_search", "file_read", "web_search"],
  "lsp-navigation": ["code_analysis", "code_search"],
  "ast-grep": ["code_search", "code_analysis"],
  gitnexus: ["git_ops"],
  brainstorming: ["data_processing"],
  ideate: ["data_processing"],
  librarian: ["web_search", "web_fetch"],
};

// ============================================================================
// Tool Info
// ============================================================================

export interface ToolSourceInfo {
  path?: string;
  scope?: string;
  url?: string;
}

export interface ToolInfo {
  name: string;
  label?: string;
  description: string;
  capabilities: ToolCapability[];
  cost: number;
  priority: number;
  weight: number;
  source: "builtin" | "extension" | "custom";
  sourceInfo?: ToolSourceInfo;
  isAvailable: boolean;
  usageCount?: number;
  successRate?: number;
  averageDuration?: number;
  schema?: Record<string, unknown>;
}

// ============================================================================
// Routing Context & Decision
// ============================================================================

export type RoutingStrategyType = "auto" | "priority" | "cost" | "capability" | string;

export interface RoutingContext {
  query: string;
  strategy?: RoutingStrategyType;
  context?: string | Record<string, unknown>;
  cwd?: string;
  userId?: string;
}

export interface RoutingDecision {
  tool: ToolInfo;
  confidence: number;
  strategy: RoutingStrategyType;
  alternatives: Array<{ name: string; weight: number }>;
  reasoning: string[];
  timestamp: Date;
}

// ============================================================================
// Router Configuration (aligned with ConfigManager)
// ============================================================================

export interface RouterConfig {
  version: string;
  toolWeights: Array<{ toolId: string; weight: number; category?: string }>;
  routingRules: RoutingRule[];
  strategies: Strategy[];
  defaults: {
    strategy: string;
    timeout: number;
    maxRetries: number;
  };
}

export interface RoutingRule {
  id: string;
  pattern: string | RegExp;
  priority: number;
  targetTools: string[];
  conditions?: Record<string, unknown>;
  enabled: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  weights: Array<{ toolId: string; weight: number }>;
  rules: string[];
  fallbackTool?: string;
  maxRetries?: number;
  timeout?: number;
  enabled: boolean;
}

export interface ToolWeight {
  toolId: string;
  weight: number;
  category?: string;
}

// ============================================================================
// Rule Matching Types
// ============================================================================

export interface RuleMatchContext {
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface RouterStats {
  totalRequests: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageConfidence: number;
  averageDuration: number;
  totalCost: number;
  topTools: Array<{ name: string; count: number; totalDuration?: number }>;
  successRate: number;
  strategyUsage: Record<string, number>;
  toolUsage: Record<string, number>;
}

export interface RoutingAnalytics {
  timestamp: Date;
  selectedTool: string;
  strategy: RoutingStrategyType;
  confidence: number;
  duration: number;
  success: boolean;
}

/**
 * Analytics interface for Router
 */
export interface Analytics {
  getAvailableTools(): ToolInfo[];
  recordRoutingDecision(decision: RoutingDecision, durationMs: number): void;
  getMetrics(): RouterStats;
  getAnalytics?(): RoutingAnalytics[];
}

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_CONFIG: RouterConfig = {
  version: "1.0.0",
  toolWeights: [
    { toolId: "bash", weight: 1.0, category: "execution" },
    { toolId: "read", weight: 1.0, category: "file-access" },
    { toolId: "write", weight: 1.0, category: "file-access" },
    { toolId: "edit", weight: 1.0, category: "file-access" },
    { toolId: "search", weight: 0.9, category: "discovery" },
    { toolId: "subagent", weight: 0.8, category: "delegation" },
  ],
  routingRules: [],
  strategies: [],
  defaults: {
    strategy: "auto",
    timeout: 30000,
    maxRetries: 3,
  },
};
