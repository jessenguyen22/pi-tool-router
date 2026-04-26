/**
 * Analytics Module
 * 
 * Tracks tool usage patterns, costs, and performance metrics.
 */

import type { RouterStats, RoutingAnalytics, RoutingStrategyType } from "../core/types.js";

export class Analytics {
  private events: RoutingAnalytics[] = [];
  private sessionStart: Date | null = null;
  private retentionDays = 30;

  /**
   * Start a new analytics session
   */
  startSession(): void {
    this.sessionStart = new Date();
    this.cleanupOldEvents();
  }

  /**
   * End the current session
   */
  endSession(): void {
    this.sessionStart = null;
  }

  /**
   * Track a routing event
   */
  trackRouting(data: RoutingAnalytics): void {
    this.events.push(data);

    // Emit event for real-time updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tool-router:analytics-update", { detail: data })
      );
    }
  }

  /**
   * Get all events
   */
  getEvents(): RoutingAnalytics[] {
    return [...this.events];
  }

  /**
   * Get filtered events
   */
  getEventsFiltered(options: {
    startDate?: Date;
    endDate?: Date;
    toolName?: string;
    strategy?: RoutingStrategyType;
  }): RoutingAnalytics[] {
    return this.events.filter((event) => {
      if (options.startDate && event.timestamp < options.startDate) {
        return false;
      }
      if (options.endDate && event.timestamp > options.endDate) {
        return false;
      }
      if (options.toolName && event.selectedTool !== options.toolName) {
        return false;
      }
      if (options.strategy && event.strategy !== options.strategy) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get statistics summary
   */
  getStats(): RouterStats {
    if (this.events.length === 0) {
      return {
        totalRequests: 0,
        toolUsage: {},
        averageConfidence: 0,
        averageDuration: 0,
        totalCost: 0,
        topTools: [],
        successRate: 0,
        strategyUsage: {},
      };
    }

    // Calculate tool usage
    const toolUsage: Record<string, number> = {};
    const strategyUsage: Record<string, number> = {};
    let totalConfidence = 0;
    let totalDuration = 0;
    let totalCost = 0;

    for (const event of this.events) {
      toolUsage[event.selectedTool] = (toolUsage[event.selectedTool] || 0) + 1;
      strategyUsage[event.strategy] = (strategyUsage[event.strategy] || 0) + 1;
      totalConfidence += event.confidence;
      totalDuration += event.duration;
      totalCost += 0.001; // Placeholder cost calculation
    }

    // Calculate top tools
    const topTools = Object.entries(toolUsage)
      .map(([name, count]) => ({
        name,
        count,
        totalDuration: 0, // Would need to track this per tool
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.events.length,
      toolUsage,
      averageConfidence: totalConfidence / this.events.length,
      averageDuration: totalDuration / this.events.length,
      totalCost,
      topTools,
      successRate: 0.95, // Placeholder
      strategyUsage,
    };
  }

  /**
   * Get tool-specific statistics
   */
  getToolStats(toolName: string): {
    usageCount: number;
    averageConfidence: number;
    averageDuration: number;
    successRate: number;
  } {
    const toolEvents = this.events.filter(
      (e) => e.selectedTool === toolName
    );

    if (toolEvents.length === 0) {
      return {
        usageCount: 0,
        averageConfidence: 0,
        averageDuration: 0,
        successRate: 0,
      };
    }

    const totalConfidence = toolEvents.reduce(
      (sum, e) => sum + e.confidence,
      0
    );
    const totalDuration = toolEvents.reduce((sum, e) => sum + e.duration, 0);

    return {
      usageCount: toolEvents.length,
      averageConfidence: totalConfidence / toolEvents.length,
      averageDuration: totalDuration / toolEvents.length,
      successRate: 0.95, // Would need actual success tracking
    };
  }

  /**
   * Get daily statistics
   */
  getDailyStats(days: number = 7): Array<{
    date: string;
    requests: number;
    topTool: string;
    averageConfidence: number;
  }> {
    const stats: Map<string, {
      requests: number;
      tools: Record<string, number>;
      confidence: number;
    }> = new Map();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const event of this.events) {
      if (event.timestamp < cutoff) continue;

      const dateKey = event.timestamp.toISOString().split("T")[0];
      
      if (!stats.has(dateKey)) {
        stats.set(dateKey, {
          requests: 0,
          tools: {},
          confidence: 0,
        });
      }

      const dayStats = stats.get(dateKey)!;
      dayStats.requests++;
      dayStats.tools[event.selectedTool] = (dayStats.tools[event.selectedTool] || 0) + 1;
      dayStats.confidence += event.confidence;
    }

    const result: Array<{
      date: string;
      requests: number;
      topTool: string;
      averageConfidence: number;
    }> = [];

    for (const [date, dayStats] of stats.entries()) {
      const topTool = Object.entries(dayStats.tools).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "none";

      result.push({
        date,
        requests: dayStats.requests,
        topTool,
        averageConfidence: dayStats.confidence / dayStats.requests,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Clear analytics data
   */
  clear(): void {
    this.events = [];
    this.sessionStart = null;
  }

  /**
   * Export analytics data
   */
  export(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      sessionStart: this.sessionStart?.toISOString(),
      events: this.events,
      stats: this.getStats(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import analytics data
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.sessionStart) {
        this.sessionStart = new Date(data.sessionStart);
      }
      
      if (data.events) {
        this.events = data.events.map((e: RoutingAnalytics) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to import analytics:", error);
    }
  }

  /**
   * Clean up old events based on retention policy
   */
  private cleanupOldEvents(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    this.events = this.events.filter((e) => e.timestamp >= cutoff);
  }

  /**
   * Set retention days
   */
  setRetentionDays(days: number): void {
    this.retentionDays = days;
    this.cleanupOldEvents();
  }
}
