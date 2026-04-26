/**
 * Tools Registry
 * 
 * Maintains a registry of available tools and their metadata.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ToolInfo, ToolCapability } from "../core/types.js";
import { TOOL_CAPABILITIES } from "../core/types.js";

export class ToolsRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private discoveryCache: Date | null = null;
  private cacheDuration = 60000; // 1 minute

  constructor() {
    // Initialize with common tools
    this.initializeDefaults();
  }

  /**
   * Discover available tools from pi
   */
  discoverTools(pi: ExtensionAPI): void {
    // Check cache
    if (
      this.discoveryCache &&
      Date.now() - this.discoveryCache.getTime() < this.cacheDuration
    ) {
      return;
    }

    try {
      const allTools = pi.getAllTools();

      for (const tool of allTools) {
        const toolInfo = this.createToolInfo(tool);
        this.tools.set(tool.name, toolInfo);
      }

      this.discoveryCache = new Date();
    } catch (error) {
      console.warn("Failed to discover tools:", error);
    }
  }

  /**
   * Create tool info from pi tool
   */
  private createToolInfo(tool: {
    name: string;
    label?: string;
    description?: string;
    parameters?: unknown;
    sourceInfo?: { source: string; path?: string; scope?: string };
  }): ToolInfo {
    const capabilities = this.inferCapabilities(tool.name);

    return {
      name: tool.name,
      label: tool.label || tool.name,
      description: tool.description || "",
      capabilities,
      cost: this.estimateCost(tool.name),
      priority: this.estimatePriority(tool.name, capabilities),
      weight: 5,
      source: this.inferSource(tool.sourceInfo),
      sourceInfo: tool.sourceInfo as { path: string; scope: string } | undefined,
      isAvailable: true,
      usageCount: 0,
      successRate: 0.95,
      averageDuration: 1000,
    };
  }

  /**
   * Infer capabilities from tool name
   */
  private inferCapabilities(toolName: string): ToolCapability[] {
    const knownCapabilities = TOOL_CAPABILITIES[toolName];

    if (knownCapabilities) {
      return knownCapabilities;
    }

    // Infer from name
    const capabilities: ToolCapability[] = [];
    const lowerName = toolName.toLowerCase();

    if (lowerName.includes("search") || lowerName.includes("find")) {
      capabilities.push("web_search");
    }
    if (lowerName.includes("fetch") || lowerName.includes("read") || lowerName.includes("scrape")) {
      capabilities.push("web_fetch");
    }
    if (lowerName.includes("code") || lowerName.includes("grep")) {
      capabilities.push("code_search", "code_analysis");
    }
    if (lowerName.includes("file") || lowerName.includes("read")) {
      capabilities.push("file_read");
    }
    if (lowerName.includes("edit") || lowerName.includes("write")) {
      capabilities.push("file_edit", "file_write");
    }
    if (lowerName.includes("bash") || lowerName.includes("exec") || lowerName.includes("run")) {
      capabilities.push("bash_exec");
    }

    return capabilities.length > 0 ? capabilities : ["custom"];
  }

  /**
   * Infer tool source
   */
  private inferSource(
    sourceInfo?: { source?: string; scope?: string }
  ): "builtin" | "extension" | "custom" {
    if (!sourceInfo?.source) return "builtin";

    if (sourceInfo.source === "builtin") return "builtin";
    if (sourceInfo.source === "sdk") return "custom";
    return "extension";
  }

  /**
   * Estimate tool cost
   */
  private estimateCost(toolName: string): number {
    const costMap: Record<string, number> = {
      web_search: 0.001,
      ollama_web_search: 0.0005,
      code_search: 0.002,
      fetch_content: 0.0005,
      read: 0.0001,
      grep: 0.0005,
      find: 0.0005,
      edit: 0.0001,
      write: 0.0001,
      bash: 0.001,
    };

    return costMap[toolName] || 0.001;
  }

  /**
   * Estimate tool priority based on capabilities
   */
  private estimatePriority(toolName: string, capabilities: ToolCapability[]): number {
    let priority = 5;

    // Increase priority for comprehensive tools
    if (capabilities.includes("web_search") || capabilities.includes("web_fetch")) {
      priority += 2;
    }
    if (capabilities.includes("code_analysis") || capabilities.includes("code_search")) {
      priority += 2;
    }

    // Adjust based on tool name patterns
    const lowerName = toolName.toLowerCase();
    if (lowerName.includes("ollama")) priority += 1;
    if (lowerName.includes("advanced")) priority += 1;

    return Math.min(10, priority);
  }

  /**
   * Initialize default tools
   */
  private initializeDefaults(): void {
    const defaultTools: ToolInfo[] = [
      {
        name: "web_search",
        label: "Web Search",
        description: "Search the web for real-time information",
        capabilities: ["web_search"],
        cost: 0.001,
        priority: 10,
        weight: 10,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.9,
        averageDuration: 2000,
      },
      {
        name: "ollama_web_search",
        label: "Ollama Web Search",
        description: "Search the web using Ollama's cloud API",
        capabilities: ["web_search"],
        cost: 0.0005,
        priority: 9,
        weight: 9,
        source: "extension",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.95,
        averageDuration: 1500,
      },
      {
        name: "code_search",
        label: "Code Search",
        description: "Search for code examples and documentation",
        capabilities: ["code_search", "code_analysis"],
        cost: 0.002,
        priority: 8,
        weight: 8,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.85,
        averageDuration: 3000,
      },
      {
        name: "fetch_content",
        label: "Fetch Content",
        description: "Fetch and extract content from web pages",
        capabilities: ["web_fetch"],
        cost: 0.0005,
        priority: 7,
        weight: 7,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.9,
        averageDuration: 1500,
      },
      {
        name: "grep",
        label: "Grep",
        description: "Search for patterns in code",
        capabilities: ["code_analysis", "code_search"],
        cost: 0.0005,
        priority: 6,
        weight: 6,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.95,
        averageDuration: 500,
      },
      {
        name: "read",
        label: "Read",
        description: "Read file contents",
        capabilities: ["file_read"],
        cost: 0.0001,
        priority: 5,
        weight: 5,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.99,
        averageDuration: 200,
      },
      {
        name: "edit",
        label: "Edit",
        description: "Edit file contents",
        capabilities: ["file_edit"],
        cost: 0.0001,
        priority: 5,
        weight: 5,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.95,
        averageDuration: 300,
      },
      {
        name: "bash",
        label: "Bash",
        description: "Execute shell commands",
        capabilities: ["bash_exec"],
        cost: 0.001,
        priority: 4,
        weight: 4,
        source: "builtin",
        isAvailable: true,
        usageCount: 0,
        successRate: 0.9,
        averageDuration: 5000,
      },
    ];

    for (const tool of defaultTools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Get all tools
   */
  getAllTools(): ToolInfo[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolInfo | undefined {
    return this.tools.get(name);
  }

  /**
   * Update tool info
   */
  updateTool(name: string, updates: Partial<ToolInfo>): void {
    const tool = this.tools.get(name);
    if (tool) {
      this.tools.set(name, { ...tool, ...updates });
    }
  }

  /**
   * Register custom tool
   */
  registerTool(tool: ToolInfo): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tools by capability
   */
  getToolsByCapability(capability: ToolCapability): ToolInfo[] {
    return this.getAllTools().filter((t) =>
      t.capabilities.includes(capability)
    );
  }

  /**
   * Get available tools
   */
  getAvailableTools(): ToolInfo[] {
    return this.getAllTools().filter((t) => t.isAvailable);
  }

  /**
   * Record tool usage
   */
  recordUsage(toolName: string, success: boolean, duration: number): void {
    const tool = this.tools.get(toolName);
    if (tool) {
      tool.usageCount++;
      
      // Update success rate with exponential moving average
      const alpha = 0.1;
      tool.successRate = tool.successRate * (1 - alpha) + (success ? alpha : 0);

      // Update average duration
      tool.averageDuration =
        tool.averageDuration * 0.9 + duration * 0.1;
    }
  }

  /**
   * Clear cache and re-discover
   */
  invalidateCache(): void {
    this.discoveryCache = null;
  }
}
