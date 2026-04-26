/**
 * Integration tests for end-to-end routing
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Router } from "../../src/core/router.js";
import { ConfigManager } from "../../src/config/index.js";
import { ToolsRegistry } from "../../src/tools/registry.js";
import { Analytics } from "../../src/observability/analytics.js";

describe("End-to-End Routing", () => {
  let router: Router;
  let configManager: ConfigManager;
  let registry: ToolsRegistry;
  let analytics: Analytics;

  const mockTools = [
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
      successRate: 0.95,
      averageDuration: 2000,
    },
    {
      name: "ollama_web_search",
      label: "Ollama Web Search",
      description: "Ollama cloud search",
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
  ];

  beforeEach(() => {
    const mockPi = {
      getAllTools: () => mockTools,
    } as any;

    configManager = {
      getConfig: () => ({
        enabled: true,
        defaultStrategy: "auto",
        strategies: {
          priority: { enabled: true, fallbackEnabled: true },
          cost: { enabled: true, fallbackEnabled: true },
          capability: { enabled: true, fallbackEnabled: true },
          custom: { enabled: true, fallbackEnabled: true },
        },
        toolWeights: {
          web_search: 10,
          ollama_web_search: 9,
          code_search: 8,
          fetch_content: 7,
          grep: 6,
        },
        routingRules: [
          {
            id: "real-time-info",
            name: "Real-time Information",
            enabled: true,
            priority: 10,
            match: {
              queryPatterns: ["news", "latest", "current", "price", "weather", "stock", "live"],
            },
            preferredTools: ["ollama_web_search", "web_search", "fetch_content"],
          },
          {
            id: "code-analysis",
            name: "Code Analysis",
            enabled: true,
            priority: 9,
            match: {
              queryPatterns: ["function", "class", "api", "implementation", "code", "source"],
              capabilities: ["code_analysis", "code_search"],
            },
            preferredTools: ["code_search", "grep"],
          },
          {
            id: "web-fetch",
            name: "Web Content Fetch",
            enabled: true,
            priority: 8,
            match: {
              queryPatterns: ["fetch", "scrape", "extract from", "read url", "visit"],
              capabilities: ["web_fetch"],
            },
            preferredTools: ["fetch_content"],
          },
        ],
        analytics: { enabled: true, retentionDays: 30, trackCosts: true, trackPerformance: true },
        fallback: { enabled: true, maxRetries: 3, fallbackOrder: ["web_search", "code_search", "grep"] },
      }),
      getRoutingRules: () => [
        {
          id: "real-time-info",
          name: "Real-time Information",
          enabled: true,
          priority: 10,
          match: {
            queryPatterns: ["news", "latest", "current", "price", "weather", "stock", "live"],
          },
          preferredTools: ["ollama_web_search", "web_search", "fetch_content"],
        },
        {
          id: "code-analysis",
          name: "Code Analysis",
          enabled: true,
          priority: 9,
          match: {
            queryPatterns: ["function", "class", "api", "implementation", "code", "source"],
            capabilities: ["code_analysis", "code_search"],
          },
          preferredTools: ["code_search", "grep"],
        },
        {
          id: "web-fetch",
          name: "Web Content Fetch",
          enabled: true,
          priority: 8,
          match: {
            queryPatterns: ["fetch", "scrape", "extract from", "read url", "visit"],
            capabilities: ["web_fetch"],
          },
          preferredTools: ["fetch_content"],
        },
      ],
    } as any;

    registry = new ToolsRegistry();
    registry.discoverTools(mockPi);

    analytics = new Analytics();

    router = new Router(configManager, registry, analytics);
  });

  describe("Real-time Information Queries", () => {
    it("should route 'latest AI news' to ollama_web_search or web_search", async () => {
      const decision = await router.route({
        query: "Find the latest AI news",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(["ollama_web_search", "web_search"]).toContain(decision.tool.name);
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it("should route 'current stock price AAPL' to web search", async () => {
      const decision = await router.route({
        query: "What's the current stock price of AAPL?",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(["ollama_web_search", "web_search"]).toContain(decision.tool.name);
    });

    it("should route 'weather in Tokyo' to web search", async () => {
      const decision = await router.route({
        query: "What's the weather in Tokyo today?",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(["ollama_web_search", "web_search"]).toContain(decision.tool.name);
    });
  });

  describe("Code Analysis Queries", () => {
    it("should route 'how is the auth function implemented' to code_search", async () => {
      const decision = await router.route({
        query: "How is the authentication function implemented?",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(["code_search", "grep"]).toContain(decision.tool.name);
    });

    it("should route 'find class User' to grep or code_search", async () => {
      const decision = await router.route({
        query: "Find the User class definition",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(["code_search", "grep"]).toContain(decision.tool.name);
    });
  });

  describe("Web Fetch Queries", () => {
    it("should route 'fetch content from https://example.com' to fetch_content", async () => {
      const decision = await router.route({
        query: "Fetch the content from https://example.com",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(decision.tool.name).toBe("fetch_content");
    });
  });

  describe("Fallback Chains", () => {
    it("should provide alternatives when primary tool is selected", async () => {
      const decision = await router.route({
        query: "search for something",
        strategy: "auto",
        timestamp: new Date(),
      });

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("Strategy Selection", () => {
    it("should respect explicit priority strategy", async () => {
      const decision = await router.route({
        query: "search the web",
        strategy: "priority",
        timestamp: new Date(),
      });

      expect(decision.strategy).toBe("priority");
      expect(decision.tool).toBeDefined();
    });

    it("should respect explicit cost strategy", async () => {
      const decision = await router.route({
        query: "find information",
        strategy: "cost",
        timestamp: new Date(),
      });

      expect(decision.strategy).toBe("cost");
    });

    it("should respect explicit capability strategy", async () => {
      const decision = await router.route({
        query: "analyze this code",
        strategy: "capability",
        timestamp: new Date(),
      });

      expect(decision.strategy).toBe("capability");
    });
  });

  describe("Analytics Tracking", () => {
    it("should track routing decisions", async () => {
      const initialCount = analytics.getStats().totalRequests;

      await router.route({
        query: "latest news",
        strategy: "auto",
        timestamp: new Date(),
      });

      const finalCount = analytics.getStats().totalRequests;
      expect(finalCount).toBe(initialCount + 1);
    });

    it("should record tool usage", async () => {
      const decision = await router.route({
        query: "search",
        strategy: "auto",
        timestamp: new Date(),
      });

      registry.recordUsage(decision.tool.name, true, 1500);

      const toolStats = analytics.getToolStats(decision.tool.name);
      expect(toolStats.usageCount).toBeGreaterThan(0);
    });
  });
});
