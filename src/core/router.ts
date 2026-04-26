/**
 * Tool Router Core
 * 
 * Main orchestrator for routing decisions and tool selection.
 * Integrates with ConfigManager and Analytics for configurable routing.
 */

import type {
  ToolCapability,
  ToolInfo,
  RoutingContext,
  RoutingDecision,
  RoutingStrategyType,
} from "./types.js";
import { TOOL_CAPABILITIES } from "./types.js";
import { Matcher } from "./matcher.js";
import type { ConfigManager, RoutingRule, RouterConfig } from "../config/index.js";
import type { Analytics } from "./types.js";

/**
 * Router Core class
 * 
 * Manages intelligent tool routing with configurable strategies,
 * rule-based matching, and multi-criteria selection.
 */
export class Router {
  private config: ConfigManager;
  private analytics: Analytics;
  private matcher: Matcher;
  private customStrategies: Map<string, unknown> = new Map();

  constructor(
    config: ConfigManager,
    analytics: Analytics
  ) {
    this.config = config;
    this.analytics = analytics;
    this.matcher = new Matcher();
  }

  /**
   * Route a query to the best available tool
   * 
   * Core routing logic that:
   * 1. Retrieves config and available tools
   * 2. Matches routing rules against query
   * 3. Applies selected strategy for tool selection
   * 4. Returns decision with confidence and reasoning
   */
  async route(context: RoutingContext): Promise<RoutingDecision> {
    const startTime = Date.now();
    const routerConfig = this.config.getConfig();

    // Get all available tools
    const tools = this.analytics.getAvailableTools();

    // Get active routing rules
    const rules = this.config.getRoutingRules();

    // Determine strategy to use
    const strategy = this.resolveStrategy(context.strategy, routerConfig);

    // Find matching rules
    const matchedRules = this.matcher.matchRules(context.query, rules, {
      context: typeof context.context === 'object' ? context.context : undefined,
    });

    // Select tools based on strategy
    let selectedTool: ToolInfo;
    let confidence: number;
    let reasoning: string[] = [];

    switch (strategy) {
      case "priority":
        ({ tool: selectedTool, confidence, reasoning } = this.selectByPriority(
          tools,
          matchedRules,
          context
        ));
        break;

      case "cost":
        ({ tool: selectedTool, confidence, reasoning } = this.selectByCost(
          tools,
          matchedRules,
          context
        ));
        break;

      case "capability":
        ({ tool: selectedTool, confidence, reasoning } = this.selectByCapability(
          tools,
          matchedRules,
          context
        ));
        break;

      default:
        // Auto: combine all strategies
        ({ tool: selectedTool, confidence, reasoning } = this.selectAuto(
          tools,
          matchedRules,
          context,
          routerConfig
        ));
    }

    // Get alternatives
    const alternatives = this.getAlternatives(selectedTool, tools, routerConfig);

    const decision: RoutingDecision = {
      tool: selectedTool,
      confidence,
      strategy,
      alternatives,
      reasoning: [
        ...reasoning,
        `Strategy: ${strategy}`,
        `Confidence: ${(confidence * 100).toFixed(1)}%`,
      ],
      timestamp: new Date(),
    };

    // Record to analytics
    this.analytics.recordRoutingDecision(decision, Date.now() - startTime);

    return decision;
  }

  /**
   * Resolve effective strategy
   */
  private resolveStrategy(
    requested: RoutingStrategyType | undefined,
    config: { defaultStrategy?: string; enabled?: boolean; strategies?: Record<string, { enabled?: boolean }> }
  ): RoutingStrategyType {
    if (!requested || requested === "auto") {
      return (config.defaultStrategy || "auto") as RoutingStrategyType;
    }

    const strategyConfig = config.strategies?.[requested];
    if (!strategyConfig || strategyConfig.enabled !== false) {
      return requested;
    }

    return (config.defaultStrategy || "auto") as RoutingStrategyType;
  }

  /**
   * Select tool by priority
   */
  private selectByPriority(
    tools: ToolInfo[],
    matchedRules: RoutingRule[],
    _context: RoutingContext
  ): { tool: ToolInfo; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // Sort by priority from rules first
    const rulePriorities = new Map<string, number>();
    for (const rule of matchedRules) {
      for (const toolName of rule.preferredTools) {
        const current = rulePriorities.get(toolName) || 0;
        rulePriorities.set(toolName, Math.max(current, rule.priority));
      }
    }

    // Filter available tools and sort
    const availableTools = tools
      .filter((t) => t.isAvailable)
      .map((t) => ({
        tool: t,
        effectivePriority:
          (rulePriorities.get(t.name) || 0) * 10 + t.priority + t.weight,
      }))
      .sort((a, b) => b.effectivePriority - a.effectivePriority);

    if (availableTools.length === 0) {
      throw new Error("No available tools for routing");
    }

    const selected = availableTools[0].tool;
    const confidence = Math.min(0.95, availableTools[0].effectivePriority / 100);

    reasoning.push(`Selected by priority: ${selected.name}`);
    reasoning.push(`Rule-based priority: ${availableTools[0].effectivePriority.toFixed(1)}`);

    return { tool: selected, confidence, reasoning };
  }

  /**
   * Select tool by cost
   */
  private selectByCost(
    tools: ToolInfo[],
    matchedRules: RoutingRule[],
    _context: RoutingContext
  ): { tool: ToolInfo; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // Prefer tools from matched rules
    const ruleToolNames = new Set(
      matchedRules.flatMap((r) => r.preferredTools)
    );

    const availableTools = tools
      .filter((t) => t.isAvailable)
      .map((t) => ({
        tool: t,
        isPreferred: ruleToolNames.has(t.name),
        effectiveCost: t.cost * (ruleToolNames.has(t.name) ? 0.5 : 1),
      }))
      .sort((a, b) => {
        // Prefer matched rules first, then by cost
        if (a.isPreferred !== b.isPreferred) {
          return a.isPreferred ? -1 : 1;
        }
        return a.effectiveCost - b.effectiveCost;
      });

    if (availableTools.length === 0) {
      throw new Error("No available tools for routing");
    }

    const selected = availableTools[0].tool;
    const confidence = 0.85;

    reasoning.push(`Selected by cost: ${selected.name}`);
    reasoning.push(`Estimated cost: $${selected.cost.toFixed(4)}`);

    return { tool: selected, confidence, reasoning };
  }

  /**
   * Select tool by capability match
   */
  private selectByCapability(
    tools: ToolInfo[],
    matchedRules: RoutingRule[],
    context: RoutingContext
  ): { tool: ToolInfo; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // Extract required capabilities from rules
    const requiredCapabilities = new Set<ToolCapability>(
      matchedRules.flatMap((r) => (r.match?.capabilities as ToolCapability[]) || [])
    );

    // If no explicit capabilities, infer from query
    if (requiredCapabilities.size === 0) {
      const inferredCapabilities = this.inferCapabilities(context.query);
      inferredCapabilities.forEach((c) => requiredCapabilities.add(c));
      reasoning.push(`Inferred capabilities: ${[...requiredCapabilities].join(", ")}`);
    }

    // Score tools by capability match
    const scoredTools = tools
      .filter((t) => t.isAvailable)
      .map((t) => {
        const toolCapabilities = TOOL_CAPABILITIES[t.name] || [];
        const matchCount = [...requiredCapabilities].filter((c) =>
          toolCapabilities.includes(c)
        ).length;
        const matchRatio = requiredCapabilities.size > 0 
          ? matchCount / requiredCapabilities.size 
          : 0.5;

        return {
          tool: t,
          matchScore: matchRatio,
          isPreferred: matchedRules.some((r) => r.preferredTools.includes(t.name)),
        };
      })
      .filter((t) => t.matchScore > 0)
      .sort((a, b) => {
        // Prioritize by match score, then by preference
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.isPreferred ? -1 : 1;
      });

    if (scoredTools.length === 0) {
      throw new Error("No tools matching required capabilities");
    }

    const selected = scoredTools[0].tool;
    const confidence = scoredTools[0].matchScore * 0.9;

    reasoning.push(`Capability match: ${selected.name}`);
    reasoning.push(`Match score: ${(scoredTools[0].matchScore * 100).toFixed(1)}%`);

    return { tool: selected, confidence, reasoning };
  }

  /**
   * Auto-select combining all strategies
   */
  private selectAuto(
    tools: ToolInfo[],
    matchedRules: RoutingRule[],
    context: RoutingContext,
    config: RouterConfig
  ): { tool: ToolInfo; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // If we have strong rule matches, use priority
    if (matchedRules.length > 0 && matchedRules[0].priority >= 8) {
      reasoning.push("Using priority strategy (strong rule match)");
      return this.selectByPriority(tools, matchedRules, context);
    }

    // If query suggests cost sensitivity, use cost
    if (this.isCostSensitive(context.query)) {
      reasoning.push("Using cost strategy (cost-sensitive query)");
      return this.selectByCost(tools, matchedRules, context);
    }

    // Otherwise, use weighted combination
    const weights = config.toolWeights;

    const scoredTools = tools
      .filter((t) => t.isAvailable)
      .map((t) => {
        // Calculate weighted score
        const baseWeight = weights[t.name] || 5;
        const ruleBonus = matchedRules.some((r) =>
          r.preferredTools.includes(t.name)
        )
          ? 10
          : 0;
        const capabilityScore = this.matchCapabilities(t, context.query);

        const totalScore =
          baseWeight * 0.3 + ruleBonus * 0.4 + capabilityScore * 0.3;

        return { tool: t, score: totalScore };
      })
      .sort((a, b) => b.score - a.score);

    if (scoredTools.length === 0) {
      throw new Error("No available tools for routing");
    }

    const selected = scoredTools[0].tool;
    const confidence = Math.min(0.9, scoredTools[0].score / 100);

    reasoning.push(`Auto-selected: ${selected.name}`);
    reasoning.push(`Score: ${scoredTools[0].score.toFixed(1)}`);

    return { tool: selected, confidence, reasoning };
  }

  /**
   * Get alternative tools
   */
  private getAlternatives(
    selected: ToolInfo,
    tools: ToolInfo[],
    config: RouterConfig
  ): Array<{ name: string; weight: number }> {
    const weights = config.toolWeights;

    return tools
      .filter((t) => t.isAvailable && t.name !== selected.name)
      .map((t) => ({
        name: t.name,
        weight: weights[t.name] || 5,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }

  /**
   * Infer capabilities from query
   */
  private inferCapabilities(query: string): ToolCapability[] {
    const capabilities: ToolCapability[] = [];
    const lowerQuery = query.toLowerCase();

    // Code-related keywords
    if (
      lowerQuery.includes("function") ||
      lowerQuery.includes("class") ||
      lowerQuery.includes("code") ||
      lowerQuery.includes("implement")
    ) {
      capabilities.push("code_analysis", "code_search");
    }

    // File-related keywords
    if (
      lowerQuery.includes("file") ||
      lowerQuery.includes("create") ||
      lowerQuery.includes("edit")
    ) {
      capabilities.push("file_read", "file_write", "file_edit");
    }

    // Web-related keywords
    if (
      lowerQuery.includes("search") ||
      lowerQuery.includes("find") ||
      lowerQuery.includes("web")
    ) {
      capabilities.push("web_search", "web_fetch");
    }

    return capabilities.length > 0 ? capabilities : ["web_search"];
  }

  /**
   * Match tool capabilities to query
   */
  private matchCapabilities(tool: ToolInfo, query: string): number {
    const toolCaps = tool.capabilities;
    const inferredCaps = this.inferCapabilities(query);

    if (inferredCaps.length === 0) return 0.5;

    const matchCount = inferredCaps.filter((c) =>
      toolCaps.includes(c)
    ).length;

    return matchCount / inferredCaps.length;
  }

  /**
   * Check if query is cost-sensitive
   */
  private isCostSensitive(query: string): boolean {
    const costSensitivePatterns = [
      "cheap",
      "free",
      "budget",
      "low cost",
      "expensive",
      "optimize cost",
      "save money",
    ];

    const lowerQuery = query.toLowerCase();
    return costSensitivePatterns.some((p) => lowerQuery.includes(p));
  }

  /**
   * Register custom strategy
   */
  registerStrategy(name: string, strategy: unknown): void {
    this.customStrategies.set(name, strategy);
  }

  /**
   * Get registered custom strategies
   */
  getCustomStrategies(): string[] {
    return Array.from(this.customStrategies.keys());
  }
}
