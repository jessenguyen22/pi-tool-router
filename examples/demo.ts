/**
 * Live Demo Script - Shows pi-tool-router in action
 *
 * Run this to see the router in action.
 */

import { Router } from "../src/core/router.js";
import { ConfigManager } from "../src/config/index.js";
import { ToolsRegistry } from "../src/tools/registry.js";
import { Analytics } from "../src/observability/analytics.js";

// Demo queries
const demoQueries = [
	"Find the latest news about AI",
	"How is the auth function implemented?",
	"Install npm dependencies",
	"What's the weather in Tokyo?",
	"Read the config file",
	"Search for React hooks implementation",
	"Fetch content from https://example.com",
	"Run the build command",
];

async function runDemo() {
	console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           pi-tool-router Demo - Live Routing Examples          ║
╚══════════════════════════════════════════════════════════════════╝
`);

	// Create mocks
	const mockPi = {
		getAllTools: () => [
			{
				name: "web_search",
				label: "Web Search",
				description: "Search the web",
				capabilities: ["web_search"],
				cost: 0.001,
				priority: 10,
				weight: 10,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.9,
				averageDuration: 2000,
			},
			{
				name: "ollama_web_search",
				label: "Ollama Web Search",
				description: "Search via Ollama",
				capabilities: ["web_search"],
				cost: 0.0005,
				priority: 9,
				weight: 9,
				source: "extension" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.95,
				averageDuration: 1500,
			},
			{
				name: "code_search",
				label: "Code Search",
				description: "Search code",
				capabilities: ["code_search", "code_analysis"],
				cost: 0.002,
				priority: 8,
				weight: 8,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.85,
				averageDuration: 3000,
			},
			{
				name: "grep",
				label: "Grep",
				description: "Search patterns",
				capabilities: ["code_analysis", "code_search"],
				cost: 0.0005,
				priority: 6,
				weight: 6,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.95,
				averageDuration: 500,
			},
			{
				name: "fetch_content",
				label: "Fetch Content",
				description: "Fetch web content",
				capabilities: ["web_fetch"],
				cost: 0.0005,
				priority: 7,
				weight: 7,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.9,
				averageDuration: 1500,
			},
			{
				name: "read",
				label: "Read",
				description: "Read files",
				capabilities: ["file_read"],
				cost: 0.0001,
				priority: 5,
				weight: 5,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.99,
				averageDuration: 200,
			},
			{
				name: "bash",
				label: "Bash",
				description: "Execute commands",
				capabilities: ["bash_exec"],
				cost: 0.001,
				priority: 4,
				weight: 4,
				source: "builtin" as const,
				isAvailable: true,
				usageCount: 0,
				successRate: 0.9,
				averageDuration: 5000,
			},
		],
	} as any;

	const config = new ConfigManager(mockPi);
	const registry = new ToolsRegistry();
	const analytics = new Analytics();

	registry.discoverTools(mockPi);

	const router = new Router(config, registry, analytics);

	console.log("Running 8 demo queries...\n");

	for (const query of demoQueries) {
		try {
			const decision = await router.route({
				query,
				strategy: "auto",
				timestamp: new Date(),
			});

			const emoji =
				decision.confidence > 0.8
					? "🟢"
					: decision.confidence > 0.6
						? "🟡"
						: "🔴";

			console.log(`${emoji} Query: "${query}"`);
			console.log(`   └─ Tool: ${decision.tool.name} (${decision.tool.label})`);
			console.log(
				`   └─ Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
			);
			console.log(`   └─ Strategy: ${decision.strategy}`);
			console.log(`   └─ Reasoning: ${decision.reasoning[0]}`);
			console.log();
		} catch (error) {
			console.log(`🔴 Query: "${query}"`);
			console.log(`   └─ Error: ${error}`);
			console.log();
		}
	}

	const stats = analytics.getStats();
	console.log("────────────────────────────────────────────────────────────");
	console.log("📊 Summary Statistics:");
	console.log(`   Total Requests: ${stats.totalRequests}`);
	console.log(
		`   Avg Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`,
	);
	console.log(`   Avg Duration: ${stats.averageDuration.toFixed(0)}ms`);
	console.log();
	console.log("✅ Demo complete!");
}

// Run if executed directly
runDemo().catch(console.error);
