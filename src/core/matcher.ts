/**
 * Matcher Engine - Task analysis and rule matching
 *
 * Implements intelligent matching between user queries and routing rules.
 * Provides multi-dimensional analysis including:
 * - Query pattern matching with regex support
 * - Task complexity assessment
 * - Capability requirement inference
 * - Priority-based scoring
 * - Context-aware matching
 */

import type { RoutingRule } from "../config/index.js";
import type { ToolCapability } from "./types.js";

interface RuleMatchContext {
	context?: string;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Task complexity levels
 */
export type TaskComplexity = "simple" | "moderate" | "complex" | "expert";

/**
 * Task analysis result
 */
export interface TaskAnalysis {
	complexity: TaskComplexity;
	complexityScore: number;
	keywords: string[];
	inferredCapabilities: ToolCapability[];
	requiresParallel: boolean;
	requiresConfirmation: boolean;
	estimatedDuration: number;
	confidence: number;
}

/**
 * Match result for a single rule
 */
export interface RuleMatchResult {
	rule: RoutingRule;
	matched: boolean;
	matchScore: number;
	matchedPatterns: string[];
	matchedGroups?: string[];
	priority: number;
}

/**
 * Detailed match results with multiple candidates
 */
export interface MatchDetails {
	matches: RuleMatchResult[];
	bestMatch: RuleMatchResult | null;
	capabilityCoverage: number;
	totalScore: number;
}

// ============================================================================
// Keyword Categories
// ============================================================================

const COMPLEXITY_KEYWORDS: Record<TaskComplexity, string[]> = {
	simple: [
		"read",
		"show",
		"list",
		"get",
		"find one",
		"simple",
		"basic",
		"what is",
		"who is",
		"where is",
		"quick",
	],
	moderate: [
		"search",
		"analyze",
		"compare",
		"explain",
		"how",
		"why",
		"summary",
		"overview",
		"review",
		"check",
	],
	complex: [
		"implement",
		"create",
		"build",
		"design",
		"architect",
		"optimize",
		"refactor",
		"migrate",
		"integrate",
		"develop",
	],
	expert: [
		"debug",
		"trace",
		"investigate",
		"deep dive",
		"comprehensive",
		"multi-step",
		"orchestrate",
		"automate complex",
		"benchmark",
	],
};

const CAPABILITY_KEYWORDS: Record<ToolCapability, string[]> = {
	code_analysis: [
		"function",
		"class",
		"method",
		"code",
		"implementation",
		"algorithm",
		"logic",
	],
	code_search: ["find", "search", "grep", "locate", "where", "trace", "usage"],
	file_read: ["read", "show", "display", "view", "cat", "contents", "file"],
	file_write: ["create", "write", "new file", "save", "generate"],
	file_edit: ["edit", "modify", "change", "update file"],
	web_search: ["search", "find online", "google", "web", "internet", "latest"],
	web_fetch: ["fetch", "scrape", "visit", "get page", "download", "url"],
	bash_exec: [
		"run",
		"execute",
		"command",
		"bash",
		"shell",
		"npm",
		"git",
		"install",
	],
	git_ops: ["git", "commit", "branch", "merge", "push", "pull", "checkout"],
	api_call: ["api", "request", "http", "endpoint", "fetch data", "rest"],
	data_processing: ["process", "transform", "parse", "convert", "analyze data"],
	image_generation: ["generate image", "create image", "draw", "image"],
	custom: [],
};

const PARALLEL_INDICATORS = [
	"parallel",
	"concurrent",
	"simultaneously",
	"all at once",
	"multiple",
	"batch",
	"many at once",
	"in parallel",
];

const CONFIRMATION_INDICATORS = [
	"careful",
	"dangerous",
	"risky",
	"delete",
	"remove",
	"drop",
	"critical",
	"important",
	"confirm",
	"are you sure",
	"warning",
];

// ============================================================================
// Query Preprocessing
// ============================================================================

/**
 * Preprocess query text for matching
 */
function preprocessQuery(query: string): string {
	return query
		.toLowerCase()
		.replace(/[^\w\s]/g, " ") // Remove punctuation
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();
}

/**
 * Tokenize query into words
 */
function tokenizeQuery(query: string): string[] {
	return preprocessQuery(query).split(" ").filter(Boolean);
}

// ============================================================================
// Matcher Engine Class
// ============================================================================

/**
 * Matcher Engine
 *
 * Provides intelligent task analysis and rule matching for routing.
 * Supports multi-dimensional scoring and capability inference.
 */
export class Matcher {
	private readonly enableFuzzyMatching: boolean;
	private readonly fuzzyThreshold: number;
	private readonly stemmer?: (word: string) => string;

	constructor(options?: {
		enableFuzzyMatching?: boolean;
		fuzzyThreshold?: number;
	}) {
		this.enableFuzzyMatching = options?.enableFuzzyMatching ?? true;
		this.fuzzyThreshold = options?.fuzzyThreshold ?? 0.8;
	}

	// ============================================================================
	// Task Analysis
	// ============================================================================

	/**
	 * Analyze a task/query to determine complexity and requirements
	 */
	analyzeTask(query: string, context?: RuleMatchContext): TaskAnalysis {
		const normalizedQuery = preprocessQuery(query);
		const tokens = tokenizeQuery(query);

		// Calculate complexity score based on keyword matching
		const complexityScore = this.calculateComplexityScore(normalizedQuery);
		const complexity = this.getComplexityLevel(complexityScore);

		// Extract keywords
		const keywords = this.extractKeywords(tokens);

		// Infer capabilities
		const inferredCapabilities = this.inferCapabilities(normalizedQuery);

		// Check for parallel execution need
		const requiresParallel = this.checkParallelRequirement(normalizedQuery);

		// Check for confirmation requirement
		const requiresConfirmation =
			this.checkConfirmationRequirement(normalizedQuery);

		// Estimate duration based on complexity
		const estimatedDuration = this.estimateDuration(complexity);

		return {
			complexity,
			complexityScore,
			keywords,
			inferredCapabilities,
			requiresParallel,
			requiresConfirmation,
			estimatedDuration,
			confidence: this.calculateAnalysisConfidence(query, inferredCapabilities),
		};
	}

	/**
	 * Calculate complexity score (0-1)
	 */
	private calculateComplexityScore(query: string): number {
		let score = 0;
		let matches = 0;
		let totalWeight = 0;

		const weights: Record<TaskComplexity, number> = {
			simple: 1,
			moderate: 2,
			complex: 3,
			expert: 4,
		};

		for (const [complexity, keywords] of Object.entries(COMPLEXITY_KEYWORDS)) {
			for (const keyword of keywords) {
				totalWeight += weights[complexity as TaskComplexity];
				if (query.includes(keyword)) {
					score += weights[complexity as TaskComplexity];
					matches++;
				}
			}
		}

		// Normalize to 0-1 range
		return Math.min(1, score / (totalWeight * 0.1));
	}

	/**
	 * Determine complexity level from score
	 */
	private getComplexityLevel(score: number): TaskComplexity {
		if (score < 0.2) return "simple";
		if (score < 0.4) return "moderate";
		if (score < 0.7) return "complex";
		return "expert";
	}

	/**
	 * Extract significant keywords from query
	 */
	private extractKeywords(tokens: string[]): string[] {
		// Filter out common stop words
		const stopWords = new Set([
			"the",
			"a",
			"an",
			"is",
			"are",
			"was",
			"were",
			"be",
			"been",
			"being",
			"have",
			"has",
			"had",
			"do",
			"does",
			"did",
			"will",
			"would",
			"could",
			"should",
			"may",
			"might",
			"must",
			"shall",
			"can",
			"need",
			"to",
			"of",
			"in",
			"for",
			"on",
			"with",
			"at",
			"by",
			"from",
			"as",
			"into",
			"through",
			"during",
			"before",
			"after",
			"above",
			"below",
			"between",
			"under",
			"again",
			"further",
			"then",
			"once",
			"here",
			"there",
			"when",
			"where",
			"why",
			"how",
			"all",
			"each",
			"few",
			"more",
			"most",
			"other",
			"some",
			"such",
			"no",
			"nor",
			"not",
			"only",
			"own",
			"same",
			"so",
			"than",
			"too",
			"very",
			"just",
			"and",
			"but",
			"if",
			"or",
			"because",
			"until",
			"while",
			"about",
			"this",
			"that",
			"these",
			"those",
			"am",
		]);

		return tokens.filter((token) => token.length > 2 && !stopWords.has(token));
	}

	/**
	 * Infer required capabilities from query
	 */
	private inferCapabilities(query: string): ToolCapability[] {
		const capabilities = new Set<ToolCapability>();

		for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
			for (const keyword of keywords) {
				if (query.includes(keyword)) {
					capabilities.add(capability as ToolCapability);
				}
			}
		}

		// Default to web_search if no capabilities inferred
		if (capabilities.size === 0) {
			capabilities.add("web_search");
		}

		return Array.from(capabilities);
	}

	/**
	 * Check if task requires parallel execution
	 */
	private checkParallelRequirement(query: string): boolean {
		return PARALLEL_INDICATORS.some((indicator) => query.includes(indicator));
	}

	/**
	 * Check if task requires user confirmation
	 */
	private checkConfirmationRequirement(query: string): boolean {
		return CONFIRMATION_INDICATORS.some((indicator) =>
			query.includes(indicator),
		);
	}

	/**
	 * Estimate task duration in milliseconds
	 */
	private estimateDuration(complexity: TaskComplexity): number {
		const baseTimes: Record<TaskComplexity, number> = {
			simple: 1000,
			moderate: 5000,
			complex: 15000,
			expert: 60000,
		};
		return baseTimes[complexity];
	}

	/**
	 * Calculate confidence in task analysis
	 */
	private calculateAnalysisConfidence(
		query: string,
		capabilities: ToolCapability[],
	): number {
		const queryLength = query.length;
		const capabilityCount = capabilities.length;

		// Longer queries with specific capabilities = higher confidence
		if (queryLength > 50 && capabilityCount > 0) return 0.9;
		if (queryLength > 20 && capabilityCount > 0) return 0.75;
		if (capabilityCount > 0) return 0.6;
		return 0.4;
	}

	// ============================================================================
	// Rule Matching
	// ============================================================================

	/**
	 * Match rules against a query with detailed results
	 */
	matchRulesDetailed(
		query: string,
		rules: RoutingRule[],
		context?: RuleMatchContext,
	): MatchDetails {
		const results: RuleMatchResult[] = [];

		for (const rule of rules) {
			if (!rule.enabled) continue;
			const result = this.matchRuleDetailed(query, rule, context);
			if (result.matched) {
				results.push(result);
			}
		}

		// Sort by score
		results.sort((a, b) => b.matchScore - a.matchScore);

		const totalScore = results.reduce((sum, r) => sum + r.matchScore, 0);
		const capabilityCoverage = this.calculateCapabilityCoverage(query, results);

		return {
			matches: results,
			bestMatch: results[0] || null,
			capabilityCoverage,
			totalScore,
		};
	}

	/**
	 * Match rules against a query
	 *
	 * @param query - The query string to match against
	 * @param rules - Array of routing rules to evaluate
	 * @param context - Additional context for matching
	 * @returns Matched rules sorted by match score (highest first)
	 */
	matchRules(
		query: string,
		rules: RoutingRule[],
		context?: RuleMatchContext,
	): RoutingRule[] {
		const detailed = this.matchRulesDetailed(query, rules, context);
		// Only return rules that actually matched (matched=true)
		return detailed.matches
			.filter((r) => r.matched)
			.sort((a, b) => b.matchScore - a.matchScore)
			.map((r) => r.rule);
	}

	/**
	 * Match a single rule against a query with detailed result
	 */
	matchRuleDetailed(
		query: string,
		rule: RoutingRule,
		_context?: RuleMatchContext,
	): RuleMatchResult {
		const patterns = rule.match?.queryPatterns || [];
		const matchedPatterns: string[] = [];
		let matchScore = 0;

		if (patterns.length === 0) {
			// No patterns means match by priority only
			return {
				rule,
				matched: true,
				matchScore: rule.priority,
				matchedPatterns: [],
				priority: rule.priority,
			};
		}

		// Test each pattern
		for (const pattern of patterns) {
			if (this.testPattern(query, pattern)) {
				matchedPatterns.push(pattern);
				matchScore += rule.priority;
			}
		}

		const matched = matchedPatterns.length > 0;

		// Calculate final score considering number of matched patterns
		if (matched) {
			const patternBonus = (matchedPatterns.length / patterns.length) * 10;
			matchScore += patternBonus;
		}

		return {
			rule,
			matched,
			matchScore,
			matchedPatterns,
			priority: rule.priority,
		};
	}

	/**
	 * Match a single rule against a query
	 */
	matchRule(
		query: string,
		rule: RoutingRule,
		context?: RuleMatchContext,
	): RuleMatchResult {
		return this.matchRuleDetailed(query, rule, context);
	}

	/**
	 * Test if a query matches a pattern
	 */
	testPattern(query: string, pattern: string): boolean {
		const normalizedQuery = preprocessQuery(query);

		try {
			// Try regex first
			const regex = new RegExp(pattern, "i");
			if (regex.test(normalizedQuery)) {
				return true;
			}
		} catch {
			// Fallback to substring match
		}

		// Fallback to simple substring match
		return normalizedQuery.includes(pattern.toLowerCase());
	}

	/**
	 * Extract matched groups from a query
	 */
	extractGroups(query: string, pattern: string): string[] | null {
		try {
			const regex = new RegExp(pattern, "i");
			const match = query.match(regex);
			return match ? match.slice(1) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Score a query against multiple patterns
	 */
	scorePatterns(query: string, patterns: string[]): number {
		let totalScore = 0;

		for (const pattern of patterns) {
			if (this.testPattern(query, pattern)) {
				totalScore += 1;
			}
		}

		return totalScore;
	}

	// ============================================================================
	// Scoring Helpers
	// ============================================================================

	/**
	 * Calculate capability coverage across matched rules
	 */
	private calculateCapabilityCoverage(
		query: string,
		matches: RuleMatchResult[],
	): number {
		if (matches.length === 0) return 0;

		const taskCapabilities = this.inferCapabilities(query);
		const ruleCapabilities = new Set(
			matches.flatMap((m) => m.rule.match?.capabilities || []),
		);

		if (ruleCapabilities.size === 0) return 0.5;

		const covered = taskCapabilities.filter((c) => ruleCapabilities.has(c));
		return covered.length / taskCapabilities.length;
	}

	/**
	 * Calculate weighted score combining multiple factors
	 */
	calculateWeightedScore(params: {
		patternScore: number;
		capabilityScore: number;
		priorityScore: number;
		weights?: {
			pattern?: number;
			capability?: number;
			priority?: number;
		};
	}): number {
		const weights = {
			pattern: params.weights?.pattern ?? 0.4,
			capability: params.weights?.capability ?? 0.3,
			priority: params.weights?.priority ?? 0.3,
		};

		return (
			params.patternScore * weights.pattern +
			params.capabilityScore * weights.capability +
			params.priorityScore * weights.priority
		);
	}

	// ============================================================================
	// Utility Methods
	// ============================================================================

	/**
	 * Check if query requires a specific capability
	 */
	requiresCapability(query: string, capability: ToolCapability): boolean {
		const keywords = CAPABILITY_KEYWORDS[capability] || [];
		const normalizedQuery = preprocessQuery(query);
		return keywords.some((keyword) => normalizedQuery.includes(keyword));
	}

	/**
	 * Get suggested tools based on task analysis
	 */
	suggestTools(query: string, availableTools: string[]): string[] {
		const analysis = this.analyzeTask(query);
		const suggestions: Array<{ tool: string; score: number }> = [];

		for (const tool of availableTools) {
			let score = 0;

			// Score based on capability match
			const toolKeywords = CAPABILITY_KEYWORDS[tool as ToolCapability] || [];
			for (const keyword of toolKeywords) {
				if (preprocessQuery(query).includes(keyword)) {
					score += 1;
				}
			}

			// Adjust based on complexity
			if (analysis.complexity === "expert" && tool === "bash") {
				score += 2;
			}

			suggestions.push({ tool, score });
		}

		return suggestions
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((s) => s.tool);
	}
}
