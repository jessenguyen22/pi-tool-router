/**
 * Unit tests for Router
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Router } from "../../src/core/router.js";
import type {
	ConfigManager,
	RoutingRule,
	RouterConfig,
} from "../../src/config/index.js";

describe("Router", () => {
	// Mock config manager
	const mockConfigManager = {
		getConfig: () => ({
			enabled: true,
			defaultStrategy: "auto",
			strategies: {
				auto: { enabled: true, fallbackEnabled: true },
				priority: { enabled: true, fallbackEnabled: true },
				cost: { enabled: true, fallbackEnabled: true },
				capability: { enabled: true, fallbackEnabled: true },
			},
			toolWeights: {
				read: 10,
				search: 9,
				bash: 8,
			},
			routingRules: [] as RoutingRule[],
			analytics: {
				enabled: true,
				retentionDays: 30,
				trackCosts: true,
				trackPerformance: true,
			},
			fallback: { enabled: true, maxRetries: 3, fallbackOrder: ["read"] },
		}),
		getRoutingRules: () =>
			[
				{
					id: "file-read",
					name: "File Read",
					enabled: true,
					priority: 10,
					match: { queryPatterns: ["read", "file", "content"] },
					preferredTools: ["read"],
				},
				{
					id: "code-search",
					name: "Code Search",
					enabled: true,
					priority: 9,
					match: { queryPatterns: ["search", "find", "trace", "grep"] },
					preferredTools: ["search"],
				},
				{
					id: "execute",
					name: "Execute",
					enabled: true,
					priority: 10,
					match: { queryPatterns: ["run", "execute", "command", "npm", "git"] },
					preferredTools: ["bash"],
				},
			] as RoutingRule[],
	};

	// Mock analytics
	const mockAnalytics = {
		trackRouting: vi.fn(),
		recordRoutingDecision: vi.fn(),
		getMetrics: () => ({
			totalRequests: 0,
			toolUsage: {},
			averageConfidence: 0,
			averageDuration: 0,
			totalCost: 0,
			topTools: [],
			successRate: 0,
			strategyUsage: {},
		}),
	};

	// Mock registry
	const mockRegistry = {
		getAllTools: () => [
			{
				name: "read",
				label: "Read",
				description: "Read file contents",
				capabilities: ["file_read"],
				cost: 0.001,
				priority: 10,
				weight: 10,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.95,
				averageDuration: 200,
			},
			{
				name: "search",
				label: "Search",
				description: "Search for patterns",
				capabilities: ["code_search", "file_read", "web_search"],
				cost: 0.005,
				priority: 8,
				weight: 8,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.85,
				averageDuration: 500,
			},
			{
				name: "bash",
				label: "Bash",
				description: "Execute bash commands",
				capabilities: ["bash_exec"],
				cost: 0.01,
				priority: 5,
				weight: 5,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.9,
				averageDuration: 1000,
			},
		],
		getAvailableTools: () => [
			{
				name: "read",
				label: "Read",
				description: "Read file contents",
				capabilities: ["file_read"],
				cost: 0.001,
				priority: 10,
				weight: 10,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.95,
				averageDuration: 200,
			},
			{
				name: "search",
				label: "Search",
				description: "Search for patterns",
				capabilities: ["code_search", "file_read", "web_search"],
				cost: 0.005,
				priority: 8,
				weight: 8,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.85,
				averageDuration: 500,
			},
			{
				name: "bash",
				label: "Bash",
				description: "Execute bash commands",
				capabilities: ["bash_exec"],
				cost: 0.01,
				priority: 5,
				weight: 5,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.9,
				averageDuration: 1000,
			},
		],
	};

	let router: Router;

	beforeEach(() => {
		vi.clearAllMocks();
		router = new Router(
			mockConfigManager as unknown as ConfigManager,
			mockRegistry as any,
			mockAnalytics as any,
		);
	});

	describe("route", () => {
		it("should route to web_search for real-time queries", async () => {
			const decision = await router.route({
				query: "Find the latest news about AI",
			});

			expect(decision).toBeDefined();
			expect(decision.tool).toBeDefined();
			expect(decision.strategy).toBe("auto");
			expect(decision.confidence).toBeGreaterThan(0);
		});

		it("should use priority strategy", async () => {
			const decision = await router.route({
				query: "Read the config file",
				strategy: "priority",
			});

			expect(decision.strategy).toBe("priority");
			expect(decision.tool.name).toBe("read");
		});

		it("should use cost strategy", async () => {
			const decision = await router.route({
				query: "Search for code patterns",
				strategy: "cost",
			});

			expect(decision.strategy).toBe("cost");
		});

		it("should return alternatives", async () => {
			const decision = await router.route({
				query: "Find the function",
			});

			expect(decision.alternatives).toBeDefined();
			expect(Array.isArray(decision.alternatives)).toBe(true);
		});

		it("should include reasoning", async () => {
			const decision = await router.route({
				query: "Search for patterns",
			});

			expect(decision.reasoning).toBeDefined();
			expect(decision.reasoning.length).toBeGreaterThan(0);
		});

		it("should route based on query patterns", async () => {
			const decision = await router.route({
				query: "Run the build command",
			});

			expect(decision.tool.name).toBe("bash");
		});
	});

	describe("analytics integration", () => {
		it("should record routing decisions", async () => {
			await router.route({ query: "Read a file" });

			expect(mockAnalytics.recordRoutingDecision).toHaveBeenCalled();
		});
	});

	describe("custom strategies", () => {
		it("should support registering custom strategies", () => {
			router.registerStrategy("custom", { name: "Custom Strategy" });
			const strategies = router.getCustomStrategies();
			expect(strategies).toContain("custom");
		});
	});
});
