/**
 * Tool Executor Manager
 * 
 * Executes selected tools with fallback support.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ToolInfo, RoutingDecision } from "./types.js";

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  cost: number;
}

export class Executor {
  private pi: ExtensionAPI;
  private toolCache: Map<string, unknown> = new Map();

  constructor(pi: ExtensionAPI) {
    this.pi = pi;
  }

  /**
   * Execute a routing decision
   */
  async execute(
    decision: RoutingDecision,
    params: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = decision.tool;

    try {
      // Get the tool implementation
      const toolImpl = await this.getToolImplementation(tool.name);

      if (!toolImpl) {
        throw new Error(`Tool implementation not found: ${tool.name}`);
      }

      // Execute the tool
      const result = await this.executeTool(toolImpl, params, signal);

      return {
        success: true,
        output: typeof result === "string" ? result : JSON.stringify(result),
        duration: Date.now() - startTime,
        cost: tool.cost,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        cost: tool.cost,
      };
    }
  }

  /**
   * Execute with fallback chain
   */
  async executeWithFallback(
    decision: RoutingDecision,
    params: Record<string, unknown>,
    fallbackOrder: string[],
    signal?: AbortSignal
  ): Promise<{
    result: ToolExecutionResult;
    executedTool: string;
    attempts: number;
  }> {
    const attempts: Array<{
      tool: string;
      success: boolean;
      error?: string;
    }> = [];

    // Try primary tool first
    let result = await this.execute(decision, params, signal);
    attempts.push({
      tool: decision.tool.name,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      return {
        result,
        executedTool: decision.tool.name,
        attempts: 1,
      };
    }

    // Try fallback tools
    for (const fallbackName of fallbackOrder) {
      if (fallbackName === decision.tool.name) continue;

      const fallbackTool = this.findTool(fallbackName);
      if (!fallbackTool) continue;

      try {
        const toolImpl = await this.getToolImplementation(fallbackName);
        if (toolImpl) {
          const fallbackResult = await this.executeTool(toolImpl, params, signal);
          attempts.push({
            tool: fallbackName,
            success: fallbackResult.success,
            error: fallbackResult.error,
          });

          if (fallbackResult.success) {
            return {
              result: fallbackResult,
              executedTool: fallbackName,
              attempts: attempts.length,
            };
          }
        }
      } catch (error) {
        attempts.push({
          tool: fallbackName,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      result: {
        success: false,
        error: "All tools in fallback chain failed",
        duration: 0,
        cost: 0,
      },
      executedTool: decision.tool.name,
      attempts: attempts.length,
    };
  }

  /**
   * Get tool implementation
   */
  private async getToolImplementation(
    toolName: string
  ): Promise<unknown | null> {
    // Check cache first
    if (this.toolCache.has(toolName)) {
      return this.toolCache.get(toolName)!;
    }

    // Get all available tools
    const allTools = this.pi.getAllTools();

    // Find matching tool
    const tool = allTools.find((t) => t.name === toolName);

    if (!tool) {
      return null;
    }

    // Store in cache
    this.toolCache.set(toolName, tool);

    return tool;
  }

  /**
   * Find tool by name
   */
  private findTool(toolName: string): ToolInfo | null {
    const allTools = this.pi.getAllTools() as unknown as ToolInfo[];
    return allTools.find((t) => t.name === toolName) || null;
  }

  /**
   * Execute a tool
   */
  private async executeTool(
    tool: unknown,
    params: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolExecutionResult> {
    // For pi tools, we typically just return the tool info
    // Actual execution is handled by pi's internal system
    // This is a placeholder for extensibility
    if (tool && typeof tool === "object" && "execute" in tool) {
      const executeFn = (tool as { execute: unknown }).execute;
      if (typeof executeFn === "function") {
        const result = await executeFn(params, signal);
        return {
          success: true,
          output: typeof result === "string" ? result : JSON.stringify(result),
          duration: 0,
          cost: 0,
        };
      }
    }

    return {
      success: true,
      output: JSON.stringify({
        toolName: (tool as { name?: string }).name || "unknown",
        params,
        status: "routed",
      }),
      duration: 0,
      cost: 0,
    };
  }

  /**
   * Clear tool cache
   */
  clearCache(): void {
    this.toolCache.clear();
  }

  /**
   * Validate tool parameters
   */
  validateParams(
    toolName: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation - can be extended
    if (!params || typeof params !== "object") {
      errors.push("Parameters must be an object");
      return { valid: false, errors };
    }

    return { valid: errors.length === 0, errors };
  }
}
