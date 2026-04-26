/**
 * Multi-Tenant Demo - Shows pi-tool-router works with ANY user's tools
 *
 * This demo simulates 3 different users with DIFFERENT tool sets
 * and shows that routing still works correctly.
 */

import { ConfigManager } from "../src/config/index.js";
import { Router } from "../src/core/router.js";
import type { ToolInfo } from "../src/core/types.js";
import { Analytics } from "../src/observability/analytics.js";
import { ToolsRegistry } from "../src/tools/registry.js";

// Different users' tool sets
const userToolSets = {
	// User A: Has ollama_web_search (typical power user)
	userA: [
		{
			name: "ollama_web_search",
			capabilities: ["web_search"],
			priority: 9,
			weight: 9,
		},
		{
			name: "web_search",
			capabilities: ["web_search"],
			priority: 8,
			weight: 8,
		},
		{
			name: "code_search",
			capabilities: ["code_search", "code_analysis"],
			priority: 8,
			weight: 8,
		},
		{ name: "bash", capabilities: ["bash_exec"], priority: 7, weight: 7 },
		{ name: "read", capabilities: ["file_read"], priority: 6, weight: 6 },
	] as ToolInfo[],

	// User B: Has tavily_search (alternative tools)
	userB: [
		{
			name: "tavily_search",
			capabilities: ["web_search"],
			priority: 9,
			weight: 9,
		},
		{
			name: "ddg_search",
			capabilities: ["web_search"],
			priority: 8,
			weight: 8,
		},
		{
			name: "grep",
			capabilities: ["code_search", "code_analysis"],
			priority: 8,
			weight: 8,
		},
		{ name: "terminal", capabilities: ["bash_exec"], priority: 7, weight: 7 },
		{ name: "cat", capabilities: ["file_read"], priority: 6, weight: 6 },
	] as ToolInfo[],

	// User C: Minimal tools (basic user)
	userC: [
		{ name: "search", capabilities: ["web_search"], priority: 7, weight: 7 },
		{
			name: "bash",
			capabilities: ["bash_exec", "file_read"],
			priority: 6,
			weight: 6,
		},
	] as ToolInfo[],
};

// Test queries
const testQueries = [
	"Find latest AI news",
	"How is the auth function implemented?",
	"Install npm dependencies",
	"What's the weather?",
];

function createRouter(tools: ToolInfo[]): Router {
	const mockPi = { getAllTools: () => tools } as any;
	const config = new ConfigManager(mockPi);
	const registry = new ToolsRegistry();
	const analytics = new Analytics();
	registry.discoverTools(mockPi);
	return new Router(config, registry, analytics);
}

async function runMultiTenantDemo() {
	console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         pi-tool-router - Multi-Tenant Demo                      ║
║                                                                  ║
║  Shows routing works with ANY user's available tools!            ║
╚══════════════════════════════════════════════════════════════════╝
`);

	for (const [userName, tools] of Object.entries(userToolSets)) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(
			`👤 ${userName.toUpperCase()}'s Tools: ${tools.map((t) => t.name).join(", ")}`,
		);
		console.log("=".repeat(60));

		const router = createRouter(tools as ToolInfo[]);

		for (const query of testQueries) {
			try {
				const decision = await router.route({
					query,
					strategy: "auto",
					timestamp: new Date(),
				});
				const emoji = decision.confidence > 0.7 ? "✅" : "⚠️";
				console.log(`  ${emoji} "${query}"`);
				console.log(
					`     → ${decision.tool.name} (${(decision.confidence * 100).toFixed(0)}%)`,
				);
			} catch (e) {
				console.log(`  ❌ "${query}"`);
				console.log(`     → Error: ${e}`);
			}
		}
	}

	console.log(`
${"=".repeat(60)}
📊 KEY INSIGHT:

The router uses CAPABILITY-BASED routing:
- Rules define REQUIRED CAPABILITIES (web_search, code_search, etc.)
- NOT specific tool names
- Router maps capabilities → user's available tools
- User A with ollama_web_search → works ✅
- User B with tavily_search → works ✅
- User C with just 'search' → works ✅

This is how pi-tool-router works for ANY user's tool set!
${"=".repeat(60)}
`);
}

runMultiTenantDemo().catch(console.error);
