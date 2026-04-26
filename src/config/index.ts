/**
 * Configuration Manager
 *
 * Loads, validates, and manages routing configuration.
 * Provides load/save settings, validation, and default configs
 * for tool weights, routing rules, and strategies.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type RoutingStrategyType =
	| "auto"
	| "priority"
	| "cost"
	| "capability"
	| "custom";

export interface ToolWeight {
	toolId: string;
	weight: number;
	category?: string;
}

export interface RuleMatch {
	queryPatterns?: string[];
	capabilities?: string[];
}

export interface RoutingRule {
	id: string;
	name: string;
	enabled: boolean;
	priority: number;
	match?: RuleMatch;
	preferredTools: string[];
}

export interface StrategyConfig {
	enabled: boolean;
	fallbackEnabled: boolean;
	maxCostPerTask?: number;
	strictMatching?: boolean;
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

export interface RouterConfig {
	enabled: boolean;
	defaultStrategy: RoutingStrategyType;
	strategies: Record<RoutingStrategyType, StrategyConfig>;
	toolWeights: Record<string, number>;
	routingRules: RoutingRule[];
	analytics: AnalyticsConfig;
	fallback: FallbackConfig;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG: RouterConfig = {
	enabled: true,
	defaultStrategy: "auto",
	strategies: {
		auto: { enabled: true, fallbackEnabled: true },
		priority: { enabled: true, fallbackEnabled: true },
		cost: { enabled: true, fallbackEnabled: true, maxCostPerTask: 5.0 },
		capability: { enabled: true, fallbackEnabled: true, strictMatching: false },
		custom: { enabled: true, fallbackEnabled: true },
	},
	toolWeights: {
		bash: 8,
		read: 9,
		write: 8,
		edit: 9,
		search: 8,
		subagent: 7,
		ask_user: 6,
		web_search: 7,
		code_search: 8,
	},
	routingRules: [
		{
			id: "web-search-rule",
			name: "Web Search & Information",
			enabled: true,
			priority: 10,
			match: {
				queryPatterns: [
					"news",
					"latest",
					"current",
					"price",
					"weather",
					"stock",
					"live",
					"today",
					"what is",
					"who is",
					"how to",
					"information",
					"about",
					"explain",
				],
				capabilities: ["web_search"],
			},
			preferredTools: ["web_search", "ollama_web_search", "fetch_content"],
		},
		{
			id: "code-search-rule",
			name: "Code Search & Analysis",
			enabled: true,
			priority: 10,
			match: {
				queryPatterns: [
					"function",
					"class",
					"method",
					"api",
					"implementation",
					"source code",
					"how is",
					"trace",
					"usage",
					"where is",
					"import",
					"export",
					"interface",
					"type ",
					"search for",
					"hooks",
					"react ",
				],
				capabilities: ["code_search", "code_analysis"],
			},
			preferredTools: ["code_search", "grep", "read"],
		},
		{
			id: "file-read-rule",
			name: "File Reading",
			enabled: true,
			priority: 8,
			match: {
				queryPatterns: [
					"read",
					"show file",
					"display file",
					"view file",
					"cat ",
					"open file",
					"contents of",
				],
				capabilities: ["file_read"],
			},
			preferredTools: ["read"],
		},
		{
			id: "file-edit-rule",
			name: "File Edit Operations",
			enabled: true,
			priority: 10,
			match: {
				queryPatterns: [
					"edit file",
					"modify code",
					"change file",
					"update file",
					"write to",
					"create file",
				],
				capabilities: ["file_edit", "file_write"],
			},
			preferredTools: ["edit", "write"],
		},
		{
			id: "execution-rule",
			name: "Command Execution",
			enabled: true,
			priority: 10,
			match: {
				queryPatterns: [
					"run ",
					"execute ",
					"command",
					"install ",
					"build ",
					"test ",
					"npm ",
					"git ",
					"start ",
				],
				capabilities: ["bash_exec"],
			},
			preferredTools: ["bash"],
		},
		{
			id: "web-fetch-rule",
			name: "Web Content Fetch",
			enabled: true,
			priority: 8,
			match: {
				queryPatterns: [
					"fetch",
					"scrape",
					"visit url",
					"read webpage",
					"extract from",
				],
				capabilities: ["web_fetch"],
			},
			preferredTools: ["fetch_content", "ollama_web_fetch"],
		},
		{
			id: "parallel-rule",
			name: "Parallel Processing",
			enabled: true,
			priority: 7,
			match: {
				queryPatterns: ["parallel", "concurrent", "async", "multiple tasks"],
				capabilities: ["subagent"],
			},
			preferredTools: ["subagent", "bash"],
		},
		{
			id: "user-input-rule",
			name: "User Interaction",
			enabled: true,
			priority: 6,
			match: {
				queryPatterns: ["ask", "confirm", "choose", "decide", "user input"],
				capabilities: ["user_interaction"],
			},
			preferredTools: ["ask_user"],
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
		fallbackOrder: ["bash", "read", "search"],
	},
};

// ============================================================================
// Validation Functions
// ============================================================================

export function validateConfig(
	config: Partial<RouterConfig>,
): ValidationResult {
	const errors: string[] = [];

	// Validate strategy types
	const validStrategies: RoutingStrategyType[] = [
		"auto",
		"priority",
		"cost",
		"capability",
		"custom",
	];

	if (
		config.defaultStrategy &&
		!validStrategies.includes(config.defaultStrategy)
	) {
		errors.push(`Invalid defaultStrategy: ${config.defaultStrategy}`);
	}

	// Validate tool weights
	if (config.toolWeights) {
		for (const [tool, weight] of Object.entries(config.toolWeights)) {
			if (typeof weight !== "number" || weight < 0 || weight > 100) {
				errors.push(`Invalid weight for ${tool}: ${weight} (must be 0-100)`);
			}
		}
	}

	// Validate routing rules
	if (config.routingRules) {
		for (const rule of config.routingRules) {
			if (!rule.id) {
				errors.push("Rule missing id");
			}
			if (!rule.name) {
				errors.push(`Rule ${rule.id} missing name`);
			}
			if (
				typeof rule.priority !== "number" ||
				rule.priority < 0 ||
				rule.priority > 10
			) {
				errors.push(
					`Rule ${rule.id} invalid priority: ${rule.priority} (must be 0-10)`,
				);
			}
			if (!rule.preferredTools || rule.preferredTools.length === 0) {
				errors.push(`Rule ${rule.id} missing preferredTools`);
			}
			if (!Array.isArray(rule.preferredTools)) {
				errors.push(`Rule ${rule.id} preferredTools must be an array`);
			}
		}
	}

	// Validate analytics
	if (config.analytics) {
		if (config.analytics.retentionDays !== undefined) {
			if (
				typeof config.analytics.retentionDays !== "number" ||
				config.analytics.retentionDays < 1
			) {
				errors.push("Invalid retentionDays (must be >= 1)");
			}
		}
	}

	// Validate fallback
	if (config.fallback) {
		if (config.fallback.maxRetries !== undefined) {
			if (
				typeof config.fallback.maxRetries !== "number" ||
				config.fallback.maxRetries < 0
			) {
				errors.push("Invalid maxRetries (must be >= 0)");
			}
		}
		if (!Array.isArray(config.fallback.fallbackOrder)) {
			errors.push("fallbackOrder must be an array");
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function isValidConfig(config: unknown): config is RouterConfig {
	return validateConfig(config as Partial<RouterConfig>).valid;
}

// ============================================================================
// Config Manager Class
// ============================================================================

export interface ConfigManagerEvents {
	"config-changed": (config: RouterConfig) => void;
	"config-loaded": (config: RouterConfig) => void;
	"config-saved": (config: RouterConfig) => void;
}

export type ConfigEventCallback = (config: RouterConfig) => void;

export class ConfigManager {
	private config: RouterConfig;
	private configPath: string;
	private watchers: Map<string, ConfigEventCallback[]> = new Map();
	private autoSave: boolean = false;

	constructor(configPath?: string) {
		this.configPath = configPath ?? this.getDefaultConfigPath();
		this.config = this.deepClone(DEFAULT_CONFIG);
	}

	// ============================================================================
	// Path Resolution
	// ============================================================================

	private getDefaultConfigPath(): string {
		const homeDir =
			process.env.HOME ?? process.env.USERPROFILE ?? process.cwd();
		return join(homeDir, ".pi", "tool-router-config.json");
	}

	// ============================================================================
	// Core Operations
	// ============================================================================

	/**
	 * Load configuration from file
	 */
	async load(): Promise<RouterConfig> {
		try {
			const content = await readFile(this.configPath, "utf-8");
			const parsed = JSON.parse(content) as Partial<RouterConfig>;

			const validation = validateConfig(parsed);
			if (!validation.valid) {
				throw new Error(
					`Config validation failed:\n  ${validation.errors.join("\n  ")}`,
				);
			}

			this.config = this.mergeWithDefaults(parsed);
			this.emit("config-loaded", this.config);

			return this.getConfig();
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				// Config file doesn't exist, use defaults
				this.config = this.deepClone(DEFAULT_CONFIG);
				this.emit("config-loaded", this.config);
				return this.getConfig();
			}
			throw error;
		}
	}

	/**
	 * Save configuration to file
	 */
	async save(): Promise<void> {
		const validation = validateConfig(this.config);
		if (!validation.valid) {
			throw new Error(
				`Cannot save invalid config:\n  ${validation.errors.join("\n  ")}`,
			);
		}

		// Ensure directory exists
		const dir = dirname(this.configPath);
		await mkdir(dir, { recursive: true });

		await writeFile(
			this.configPath,
			JSON.stringify(this.config, null, 2),
			"utf-8",
		);
		this.emit("config-saved", this.config);
	}

	/**
	 * Get current configuration (deep clone to prevent mutation)
	 */
	getConfig(): RouterConfig {
		return this.deepClone(this.config);
	}

	/**
	 * Update configuration
	 */
	async update(updates: Partial<RouterConfig>): Promise<RouterConfig> {
		const merged = this.mergeWithDefaults(updates);
		const validation = validateConfig(merged);

		if (!validation.valid) {
			throw new Error(
				`Invalid config updates:\n  ${validation.errors.join("\n  ")}`,
			);
		}

		this.config = merged;
		this.emit("config-changed", this.config);

		if (this.autoSave) {
			await this.save();
		}

		return this.getConfig();
	}

	// ============================================================================
	// Tool Weight Management
	// ============================================================================

	/**
	 * Get tool weight
	 */
	getToolWeight(toolId: string): number {
		return this.config.toolWeights[toolId] ?? 5;
	}

	/**
	 * Set tool weight
	 */
	async setToolWeight(toolId: string, weight: number): Promise<void> {
		if (weight < 0 || weight > 100) {
			throw new Error(`Weight must be between 0 and 100, got: ${weight}`);
		}
		this.config.toolWeights[toolId] = weight;
		await this.update({ toolWeights: this.config.toolWeights });
	}

	/**
	 * Get all tool weights
	 */
	getToolWeights(): Record<string, number> {
		return { ...this.config.toolWeights };
	}

	// ============================================================================
	// Routing Rules Management
	// ============================================================================

	/**
	 * Get all routing rules
	 */
	getRoutingRules(): RoutingRule[] {
		return [...this.config.routingRules];
	}

	/**
	 * Get enabled routing rules sorted by priority
	 */
	getEnabledRoutingRules(): RoutingRule[] {
		return this.config.routingRules
			.filter((rule) => rule.enabled)
			.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Get routing rule by ID
	 */
	getRoutingRule(ruleId: string): RoutingRule | undefined {
		return this.config.routingRules.find((r) => r.id === ruleId);
	}

	/**
	 * Add a routing rule
	 */
	async addRoutingRule(rule: RoutingRule): Promise<void> {
		const existingIndex = this.config.routingRules.findIndex(
			(r) => r.id === rule.id,
		);
		if (existingIndex >= 0) {
			throw new Error(`Rule with id '${rule.id}' already exists`);
		}
		this.config.routingRules.push(rule);
		await this.update({ routingRules: this.config.routingRules });
	}

	/**
	 * Update a routing rule
	 */
	async updateRoutingRule(
		ruleId: string,
		updates: Partial<RoutingRule>,
	): Promise<void> {
		const ruleIndex = this.config.routingRules.findIndex(
			(r) => r.id === ruleId,
		);
		if (ruleIndex < 0) {
			throw new Error(`Rule with id '${ruleId}' not found`);
		}

		const mergedRule = {
			...this.config.routingRules[ruleIndex],
			...updates,
			id: ruleId, // Preserve original ID
		};

		this.config.routingRules[ruleIndex] = mergedRule;
		await this.update({ routingRules: this.config.routingRules });
	}

	/**
	 * Remove a routing rule
	 */
	async removeRoutingRule(ruleId: string): Promise<void> {
		const existed = this.config.routingRules.some((r) => r.id === ruleId);
		if (!existed) {
			throw new Error(`Rule with id '${ruleId}' not found`);
		}

		this.config.routingRules = this.config.routingRules.filter(
			(r) => r.id !== ruleId,
		);
		await this.update({ routingRules: this.config.routingRules });
	}

	/**
	 * Enable/disable a routing rule
	 */
	async toggleRoutingRule(ruleId: string, enabled: boolean): Promise<void> {
		await this.updateRoutingRule(ruleId, { enabled });
	}

	// ============================================================================
	// Strategy Management
	// ============================================================================

	/**
	 * Get strategy configuration
	 */
	getStrategyConfig(strategy: RoutingStrategyType): StrategyConfig {
		return {
			...this.config.strategies[strategy],
		};
	}

	/**
	 * Get all strategy configurations
	 */
	getAllStrategyConfigs(): Record<RoutingStrategyType, StrategyConfig> {
		return this.deepClone(this.config.strategies);
	}

	/**
	 * Update strategy configuration
	 */
	async updateStrategyConfig(
		strategy: RoutingStrategyType,
		updates: Partial<StrategyConfig>,
	): Promise<void> {
		this.config.strategies[strategy] = {
			...this.config.strategies[strategy],
			...updates,
		};
		await this.update({ strategies: this.config.strategies });
	}

	/**
	 * Enable/disable a strategy
	 */
	async toggleStrategy(
		strategy: RoutingStrategyType,
		enabled: boolean,
	): Promise<void> {
		await this.updateStrategyConfig(strategy, { enabled });
	}

	// ============================================================================
	// Fallback Management
	// ============================================================================

	/**
	 * Get fallback configuration
	 */
	getFallbackConfig(): FallbackConfig {
		return { ...this.config.fallback };
	}

	/**
	 * Update fallback configuration
	 */
	async updateFallbackConfig(updates: Partial<FallbackConfig>): Promise<void> {
		this.config.fallback = {
			...this.config.fallback,
			...updates,
		};
		await this.update({ fallback: this.config.fallback });
	}

	// ============================================================================
	// Analytics
	// ============================================================================

	/**
	 * Get analytics configuration
	 */
	getAnalyticsConfig(): AnalyticsConfig {
		return { ...this.config.analytics };
	}

	/**
	 * Update analytics configuration
	 */
	async updateAnalyticsConfig(
		updates: Partial<AnalyticsConfig>,
	): Promise<void> {
		this.config.analytics = {
			...this.config.analytics,
			...updates,
		};
		await this.update({ analytics: this.config.analytics });
	}

	// ============================================================================
	// Event Handling
	// ============================================================================

	/**
	 * Subscribe to config changes
	 */
	on(
		event: keyof ConfigManagerEvents,
		callback: ConfigEventCallback,
	): () => void {
		const callbacks = this.watchers.get(event) ?? [];
		callbacks.push(callback);
		this.watchers.set(event, callbacks);

		return () => {
			const cbs = this.watchers.get(event) ?? [];
			this.watchers.set(
				event,
				cbs.filter((cb) => cb !== callback),
			);
		};
	}

	/**
	 * Enable/disable auto-save
	 */
	setAutoSave(enabled: boolean): void {
		this.autoSave = enabled;
	}

	// ============================================================================
	// Reset & Utility
	// ============================================================================

	/**
	 * Reset to default configuration
	 */
	reset(): RouterConfig {
		this.config = this.deepClone(DEFAULT_CONFIG);
		this.emit("config-changed", this.config);
		return this.getConfig();
	}

	/**
	 * Validate current configuration
	 */
	validate(): ValidationResult {
		return validateConfig(this.config);
	}

	// ============================================================================
	// Private Helpers
	// ============================================================================

	private deepClone<T>(obj: T): T {
		return JSON.parse(JSON.stringify(obj)) as T;
	}

	private mergeWithDefaults(config: Partial<RouterConfig>): RouterConfig {
		return {
			...this.deepClone(DEFAULT_CONFIG),
			...config,
			strategies: {
				...this.deepClone(DEFAULT_CONFIG.strategies),
				...(config.strategies ?? {}),
			},
			toolWeights: {
				...this.deepClone(DEFAULT_CONFIG.toolWeights),
				...(config.toolWeights ?? {}),
			},
			routingRules:
				config.routingRules ?? this.deepClone(DEFAULT_CONFIG.routingRules),
			analytics: {
				...this.deepClone(DEFAULT_CONFIG.analytics),
				...(config.analytics ?? {}),
			},
			fallback: {
				...this.deepClone(DEFAULT_CONFIG.fallback),
				...(config.fallback ?? {}),
			},
		};
	}

	private emit(event: keyof ConfigManagerEvents, config: RouterConfig): void {
		const callbacks = this.watchers.get(event) ?? [];
		callbacks.forEach((cb) => cb(config));
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

let globalConfigManager: ConfigManager | null = null;

export function getConfigManager(configPath?: string): ConfigManager {
	if (!globalConfigManager) {
		globalConfigManager = new ConfigManager(configPath);
	}
	return globalConfigManager;
}

export function resetConfigManager(): void {
	globalConfigManager = null;
}

// ============================================================================
// Default Export
// ============================================================================

export default ConfigManager;
