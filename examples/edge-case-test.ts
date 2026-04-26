/**
 * Edge Case Testing - Complex queries and edge cases
 */

import { ConfigManager } from "../src/config/index.js";
import { Router } from "../src/core/router.js";
import { Analytics } from "../src/observability/analytics.js";
import { ToolsRegistry } from "../src/tools/registry.js";

// Complex edge case queries - each tests different routing challenges
const edgeCaseQueries = [
	// Ambiguous queries
	{ query: "search", desc: "Ambiguous single word" },
	{ query: "run search on the file", desc: "Mixed intent - execute + search" },

	// Negation patterns
	{ query: "don't use web search for this", desc: "Negation - exclude tool" },
	{ query: "avoid bash commands", desc: "Negation - avoid execution" },

	// Multi-intent queries
	{
		query: "search the web AND read the config file",
		desc: "Multiple tool needs",
	},
	{
		query: "find the function AND explain how it works",
		desc: "Search + analyze",
	},

	// Context-dependent queries
	{ query: "install it", desc: "Deictic - depends on context" },
	{ query: "run the build", desc: "Vague - needs context" },

	// Technical jargon
	{
		query: "grep the logs for exceptions using regex",
		desc: "Specific technical command",
	},
	{
		query: "show me the diff between branches",
		desc: "Version control operation",
	},

	// Time-sensitive queries
	{
		query: "what's the current stock price right now?",
		desc: "Real-time data",
	},
	{ query: "latest commits on main branch", desc: "Recent information" },

	// Compound queries
	{
		query: "read file1, then edit file2 based on content",
		desc: "Sequential operations",
	},
	{
		query: "install dependencies and run tests",
		desc: "Multiple bash commands",
	},

	// Edge: synonyms and variations
	{ query: "fetch me the docs", desc: "Synonym for read" },
	{ query: "grab the latest version", desc: "Get + time-sensitive" },
	{ query: "pull the code and install", desc: "Git + npm combined" },

	// Edge: tool name mentions
	{ query: "use bash to install npm packages", desc: "Explicit tool mention" },
	{ query: "should I use grep or search?", desc: "Tool comparison request" },

	// Edge: uncertain/approximate
	{ query: "maybe find some files related to auth", desc: "Uncertain intent" },
	{ query: "probably check if there are any bugs", desc: "Hedged query" },

	// Edge: non-English hints
	{ query: "tìm file config", desc: "Non-English 'find'" },
	{ query: "đọc file README", desc: "Non-English 'read'" },

	// Very short vs very long
	{ query: "?", desc: "Single character query" },
	{
		query:
			"This is a very long query that contains many words and tries to be as verbose as possible to test how the router handles very long input strings that might exceed typical query lengths",
		desc: "Very long query",
	},

	// Special characters
	{ query: "search for `function` in *.ts files", desc: "Special characters" },
	{ query: "run: npm install --save-dev typescript", desc: "Colon command" },

	// Edge: repeated words
	{ query: "read read read the file", desc: "Repeated words" },
	{ query: "search search search search", desc: "Repeated search" },
];

// Test tools (similar to multi-tenant demo)
const testTools = [
	{
		name: "bash",
		capabilities: ["bash_exec", "file_write"],
		priority: 8,
		weight: 8,
	},
	{ name: "read", capabilities: ["file_read"], priority: 8, weight: 8 },
	{ name: "web_search", capabilities: ["web_search"], priority: 7, weight: 7 },
	{
		name: "code_search",
		capabilities: ["code_search", "code_analysis"],
		priority: 8,
		weight: 8,
	},
	{
		name: "edit",
		capabilities: ["file_write", "file_edit"],
		priority: 7,
		weight: 7,
	},
	{
		name: "fetch_content",
		capabilities: ["web_fetch"],
		priority: 7,
		weight: 7,
	},
];

function createRouter(): Router {
	const mockPi = { getAllTools: () => testTools } as any;
	const config = new ConfigManager(mockPi);
	const registry = new ToolsRegistry();
	const analytics = new Analytics();
	registry.discoverTools(mockPi);
	return new Router(config, registry, analytics);
}

async function runEdgeCaseTests() {
	console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         pi-tool-router - EDGE CASE TESTING                     ║
║                                                                  ║
║  Testing complex queries, ambiguous intents, edge cases          ║
╚══════════════════════════════════════════════════════════════════╝
`);

	const router = createRouter();
	const results: Array<{
		query: string;
		desc: string;
		tool: string;
		confidence: number;
		ok: boolean;
	}> = [];

	for (const { query, desc } of edgeCaseQueries) {
		try {
			const decision = await router.route({
				query,
				strategy: "auto",
				timestamp: new Date(),
			});
			const ok = decision.tool !== undefined && decision.confidence > 0;
			results.push({
				query,
				desc,
				tool: decision.tool.name,
				confidence: decision.confidence,
				ok,
			});

			const status = ok ? "✅" : "❌";
			console.log(`  ${status} "${desc}"`);
			console.log(`     Query: "${query}"`);
			console.log(
				`     → ${decision.tool.name} (${(decision.confidence * 100).toFixed(0)}%)`,
			);
			console.log();
		} catch (e: any) {
			results.push({ query, desc, tool: "ERROR", confidence: 0, ok: false });
			console.log(`  ❌ "${desc}"`);
			console.log(`     Query: "${query}"`);
			console.log(`     → ERROR: ${e.message}`);
			console.log();
		}
	}

	// Summary
	const passed = results.filter((r) => r.ok).length;
	const failed = results.filter((r) => !r.ok).length;

	console.log(`
══════════════════════════════════════════════════════════════════
📊 EDGE CASE TEST SUMMARY:
   Total: ${results.length}
   Passed: ${passed} ✅
   Failed: ${failed} ${failed > 0 ? "❌" : ""}
   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%

══════════════════════════════════════════════════════════════════
`);

	// Failed cases analysis
	if (failed > 0) {
		console.log("📋 FAILED CASES NEED ATTENTION:");
		results
			.filter((r) => !r.ok)
			.forEach((r) => {
				console.log(`   - "${r.desc}": "${r.query}"`);
			});
		console.log();
	}

	return { passed, failed, results };
}

runEdgeCaseTests().catch(console.error);
