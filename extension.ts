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
import { ConfigManager } from "./src/config/index.js";
import { Router } from "./src/core/router.js";
import { Analytics } from "./src/observability/analytics.js";
import { Dashboard } from "./src/observability/dashboard.js";
import { ToolsRegistry } from "./src/tools/registry.js";

export default function (pi: ExtensionAPI) {
	// Initialize components
	const config = new ConfigManager(pi);
	const registry = new ToolsRegistry();
	const analytics = new Analytics();
	const dashboard = new Dashboard(pi);
	const router = new Router(config, registry, analytics);

	// Auto-routing state
	let autoRoutingEnabled = false;
	let autoRoutingConfidenceThreshold = 0.7;
	let lastRoutingSuggestion: {
		toolName: string;
		suggestedTool: string;
		reason: string;
	} | null = null;

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
			const report = rules
				.map(
					(r, i) =>
						`${i + 1}. ${r.name} (priority: ${r.priority}) - ${r.preferredTools.join(", ")}`,
				)
				.join("\n");
			ctx.ui.notify(`Routing Rules:\n${report}`, "info");
		},
	});

	pi.registerCommand("tool-router-auto", {
		description: "Toggle auto-routing mode",
		handler: async (_args, ctx) => {
			autoRoutingEnabled = !autoRoutingEnabled;
			ctx.ui.notify(
				`Auto-routing ${autoRoutingEnabled ? "enabled" : "disabled"}`,
				autoRoutingEnabled ? "info" : "warning",
			);
			pi.events.emit("tool-router:auto-routing-toggled", {
				enabled: autoRoutingEnabled,
			});
		},
	});

	pi.registerCommand("tool-router-auto-status", {
		description: "Show auto-routing status and settings",
		handler: async (_args, ctx) => {
			const configData = config.getConfig();
			const report = [
				`🔄 Auto-Routing Status`,
				`══════════════════════════`,
				`Enabled: ${autoRoutingEnabled ? "✅ Yes" : "❌ No"}`,
				`Confidence Threshold: ${(autoRoutingConfidenceThreshold * 100).toFixed(0)}%`,
				`Router Enabled: ${configData.enabled ? "✅ Yes" : "❌ No"}`,
				`Default Strategy: ${configData.defaultStrategy}`,
			].join("\n");
			ctx.ui.notify(report, "info");
		},
	});

	pi.registerCommand("tool-router-set-threshold", {
		description: "Set auto-routing confidence threshold (0.0-1.0)",
		handler: async (args, ctx) => {
			const threshold = parseFloat(args);
			if (isNaN(threshold) || threshold < 0 || threshold > 1) {
				ctx.ui.notify(
					"Invalid threshold. Use value between 0.0 and 1.0",
					"error",
				);
				return;
			}
			autoRoutingConfidenceThreshold = threshold;
			ctx.ui.notify(
				`Confidence threshold set to ${(threshold * 100).toFixed(0)}%`,
				"info",
			);
			pi.events.emit("tool-router:threshold-changed", { threshold });
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
		description:
			"Intelligently routes tasks to the best available tool based on context, capabilities, and routing rules. Use this when you need to select the optimal tool for a task or when multiple tools could handle a request.",
		promptGuidelines: [
			"Use tool_router when: multiple tools could handle the task and you need optimal selection",
			"Use tool_router when: you want to analyze which tool is best for a specific query",
			"Use tool_router for: web searches, code analysis, file operations requiring smart selection",
		],
		parameters: Type.Object({
			query: Type.String({ description: "The task or query to route" }),
			strategy: Type.Optional(
				Type.String({
					description:
						"Routing strategy: 'priority', 'cost', 'capability', or 'auto' (default: auto)",
					default: "auto",
				}),
			),
			context: Type.Optional(
				Type.String({
					description: "Additional context for routing decisions",
				}),
			),
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
				content: [
					{
						type: "text",
						text: formatRoutingResult(decision),
					},
				],
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

	// ============================================================================
	// AUTO-ROUTING: tool_call hook
	// ============================================================================

	pi.on("tool_call", async (event, ctx) => {
		if (!autoRoutingEnabled) {
			return;
		}

		const toolName = event.toolName;
		if (toolName === "tool_router" || toolName === "tool_router_auto") {
			return;
		}

		const shouldAnalyze = analyzeToolCall(toolName, event.input);
		if (!shouldAnalyze.shouldAnalyze) {
			return;
		}

		const contextQuery = buildContextFromToolCall(toolName, event.input);

		try {
			const decision = await router.route({
				query: contextQuery,
				strategy: "auto",
				cwd: ctx.cwd,
			});

			analytics.trackRouting({
				query: contextQuery,
				selectedTool: toolName,
				alternatives: decision.alternatives,
				confidence: decision.confidence,
				duration: 0,
				strategy: decision.strategy,
				timestamp: new Date(),
			});

			const currentToolIsOptimal = decision.tool.name === toolName;
			const confidenceIsHigh =
				decision.confidence >= autoRoutingConfidenceThreshold;

			if (!currentToolIsOptimal && confidenceIsHigh) {
				lastRoutingSuggestion = {
					toolName,
					suggestedTool: decision.tool.name,
					reason: decision.reasoning[0] || "Better tool for this task",
				};

				pi.events.emit("tool-router:auto-routing-suggestion", {
					currentTool: toolName,
					suggestedTool: decision.tool.name,
					confidence: decision.confidence,
					reason: lastRoutingSuggestion.reason,
				});

				const suggestionMessage = formatRoutingSuggestion(
					lastRoutingSuggestion,
					decision.confidence,
				);

				pi.sendMessage(
					{
						customType: "tool-router-suggestion",
						content: suggestionMessage,
						display: false,
					},
					{
						deliverAs: "steer",
					},
				);
			}
		} catch (error) {
			console.warn("Tool router analysis failed:", error);
		}
	});

	// ============================================================================
	// AUTO-ROUTING CONFIGURATION TOOL
	// ============================================================================

	pi.registerTool({
		name: "tool_router_auto",
		label: "Tool Router Auto",
		description:
			"Configure and control auto-routing behavior. Use to enable/disable automatic tool suggestion or check routing status.",
		promptGuidelines: [
			"Use tool_router_auto to: enable/disable auto-routing mode",
			"Use tool_router_auto to: check current routing configuration",
			"Use tool_router_auto to: set confidence threshold for suggestions",
		],
		parameters: Type.Object({
			action: Type.String({
				description:
					"Action to perform: 'enable', 'disable', 'status', or 'set-threshold'",
				enum: ["enable", "disable", "status", "set-threshold"],
			}),
			threshold: Type.Optional(
				Type.Number({
					description:
						"Confidence threshold (0.0-1.0) for set-threshold action",
					minimum: 0,
					maximum: 1,
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			let result: string;

			switch (params.action) {
				case "enable":
					autoRoutingEnabled = true;
					result =
						"✅ Auto-routing enabled. Tool calls will be analyzed and suggestions will be made.";
					break;

				case "disable":
					autoRoutingEnabled = false;
					result = "❌ Auto-routing disabled. Manual routing only.";
					break;

				case "status":
					result = [
						`🔄 Auto-Routing Status`,
						`══════════════════════════`,
						`Enabled: ${autoRoutingEnabled ? "✅ Yes" : "❌ No"}`,
						`Confidence Threshold: ${(autoRoutingConfidenceThreshold * 100).toFixed(0)}%`,
						`Last Suggestion: ${
							lastRoutingSuggestion
								? `${lastRoutingSuggestion.toolName} → ${lastRoutingSuggestion.suggestedTool}`
								: "None"
						}`,
					].join("\n");
					break;

				case "set-threshold":
					if (params.threshold === undefined) {
						return {
							content: [
								{
									type: "text",
									text: "❌ Threshold value required for set-threshold action",
								},
							],
							details: { error: "threshold_required" },
						};
					}
					autoRoutingConfidenceThreshold = params.threshold;
					result = `✅ Confidence threshold set to ${(params.threshold * 100).toFixed(0)}%`;
					break;

				default:
					result = "Unknown action";
			}

			pi.events.emit(`tool-router:auto-${params.action}`, {
				enabled: autoRoutingEnabled,
				threshold: autoRoutingConfidenceThreshold,
			});

			return {
				content: [{ type: "text", text: result }],
				details: {},
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
		...decision.reasoning.map((r) => `   • ${r}`),
		"",
		"🔄 Alternatives:",
		...decision.alternatives.map((a) => `   • ${a.name} (weight: ${a.weight})`),
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
		...stats.topTools.map((t) => `   ${t.name}: ${t.count} uses`),
	];

	return lines.join("\n");
}
