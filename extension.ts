/**
 * Tool Router Extension for pi coding agent
 * 
 * This extension provides intelligent tool routing capabilities:
 * - Automatic tool selection based on task analysis
 * - Configurable routing rules and priorities
 * - Fallback chains for reliability
 * - Real-time analytics and monitoring
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Router } from "./core/router.js";
import { ConfigManager } from "./config/index.js";
import { ToolsRegistry } from "./tools/registry.js";
import { Analytics } from "./observability/analytics.js";
import { Dashboard } from "./observability/dashboard.js";
import type { RouterConfig } from "./core/types.js";

export default function (pi: ExtensionAPI) {
  // Initialize components
  const config = new ConfigManager(pi);
  const registry = new ToolsRegistry();
  const analytics = new Analytics();
  const dashboard = new Dashboard(pi);
  const router = new Router(config, registry, analytics);

  // Register commands
  pi.registerCommand("tool-router-stats", {
    description: "Show tool router statistics and analytics",
    handler: async (_args, ctx) => {
      const stats = analytics.getStats();
      const report = formatStatsReport(stats);
      ctx.ui.notify(report, "info");
    },
  });

  pi.registerCommand("tool-router-clear", {
    description: "Clear tool router analytics data",
    handler: async (_args, _ctx) => {
      analytics.clear();
      pi.events.emit("tool-router:analytics-cleared", {});
    },
  });

  pi.registerCommand("tool-router-rules", {
    description: "List current routing rules",
    handler: async (_args, ctx) => {
      const rules = config.getRoutingRules();
      const report = rules.map((r, i) => 
        `${i + 1}. ${r.name} (priority: ${r.priority}) - ${r.preferredTools.join(", ")}`
      ).join("\n");
      ctx.ui.notify(`Routing Rules:\n${report}`, "info");
    },
  });

  // Event handlers
  pi.on("session_start", async (_event, ctx) => {
    // Load configuration on session start
    await config.load();
    registry.discoverTools(pi);
    analytics.startSession();
    dashboard.attach();
  });

  pi.on("session_shutdown", async () => {
    analytics.endSession();
    dashboard.detach();
  });

  // Register router tool
  pi.registerTool({
    name: "tool_router",
    label: "Tool Router",
    description: "Intelligently routes tasks to the best available tool based on context, capabilities, and routing rules. Use this when you need to select the optimal tool for a task or when multiple tools could handle a request.",
    promptGuidelines: [
      "Use tool_router when: multiple tools could handle the task and you need optimal selection",
      "Use tool_router when: you want to analyze which tool is best for a specific query",
      "Use tool_router for: web searches, code analysis, file operations requiring smart selection"
    ],
    parameters: Type.Object({
      query: Type.String({ description: "The task or query to route" }),
      strategy: Type.Optional(Type.String({
        description: "Routing strategy: 'priority', 'cost', 'capability', or 'auto' (default: auto)",
        default: "auto"
      })),
      context: Type.Optional(Type.String({
        description: "Additional context for routing decisions"
      })),
    }),

    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const startTime = Date.now();
      
      // Make routing decision
      const decision = await router.route({
        query: params.query,
        strategy: params.strategy || "auto",
        context: params.context,
        cwd: ctx.cwd,
      });

      // Track analytics
      analytics.trackRouting({
        query: params.query,
        selectedTool: decision.tool.name,
        alternatives: decision.alternatives,
        confidence: decision.confidence,
        duration: Date.now() - startTime,
        strategy: decision.strategy,
      });

      // Emit event
      pi.events.emit("tool-router:routing-decision", decision);

      return {
        content: [{
          type: "text",
          text: formatRoutingResult(decision)
        }],
        details: {
          tool: decision.tool.name,
          confidence: decision.confidence,
          strategy: decision.strategy,
          alternatives: decision.alternatives,
          reasoning: decision.reasoning,
        },
      };
    },
  });

  // Expose API for other extensions
  pi.events.emit("tool-router:ready", {
    router,
    config,
    registry,
    analytics,
    dashboard,
  });
}

// Import TypeBox for type definitions
import { Type } from "@sinclair/typebox";

/**
 * Format routing result for display
 */
function formatRoutingResult(decision: {
  tool: { name: string; description: string };
  confidence: number;
  strategy: string;
  alternatives: Array<{ name: string; weight: number }>;
  reasoning: string[];
}): string {
  const lines = [
    `🎯 Selected Tool: ${decision.tool.name}`,
    `📊 Confidence: ${(decision.confidence * 100).toFixed(1)}%`,
    `⚡ Strategy: ${decision.strategy}`,
    "",
    "📋 Reasoning:",
    ...decision.reasoning.map(r => `   • ${r}`),
    "",
    "🔄 Alternatives:",
    ...decision.alternatives.map(a => `   • ${a.name} (weight: ${a.weight})`),
  ];

  return lines.join("\n");
}

/**
 * Format statistics report
 */
function formatStatsReport(stats: {
  totalRequests: number;
  toolUsage: Record<string, number>;
  averageConfidence: number;
  averageDuration: number;
  topTools: Array<{ name: string; count: number }>;
}): string {
  const lines = [
    "📊 Tool Router Statistics",
    "══════════════════════════",
    `Total Requests: ${stats.totalRequests}`,
    `Avg Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`,
    `Avg Duration: ${stats.averageDuration.toFixed(0)}ms`,
    "",
    "🏆 Top Tools:",
    ...stats.topTools.map(t => `   ${t.name}: ${t.count} uses`),
  ];

  return lines.join("\n");
}
