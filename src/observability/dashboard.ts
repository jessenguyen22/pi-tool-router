/**
 * Dashboard Module
 * 
 * Real-time TUI dashboard for monitoring routing decisions.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { RoutingDecision, RouterStats } from "../core/types.js";

export class Dashboard {
  private pi: ExtensionAPI;
  private isAttached = false;
  private stats: RouterStats | null = null;
  private recentDecisions: RoutingDecision[] = [];

  constructor(pi: ExtensionAPI) {
    this.pi = pi;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.pi.events.on("tool-router:routing-decision", (decision) => {
      this.recentDecisions.unshift(decision as RoutingDecision);
      
      // Keep only last 10 decisions
      if (this.recentDecisions.length > 10) {
        this.recentDecisions.pop();
      }
    });

    this.pi.events.on("tool-router:analytics-update", () => {
      this.refreshStats();
    });
  }

  /**
   * Attach dashboard to TUI
   */
  attach(): void {
    if (this.isAttached) return;

    // Set initial widget
    this.pi.events.on("session_start", (_event, ctx) => {
      ctx.ui.setWidget("tool-router", this.getWidgetContent());
    });

    this.isAttached = true;
  }

  /**
   * Detach dashboard from TUI
   */
  detach(): void {
    this.isAttached = false;
    this.recentDecisions = [];
  }

  /**
   * Update stats
   */
  private refreshStats(): void {
    // Stats would be updated via events
  }

  /**
   * Get widget content
   */
  private getWidgetContent(): string[] {
    const lines = [
      "🔀 Tool Router",
      "─────────────────",
    ];

    if (this.recentDecisions.length > 0) {
      const lastDecision = this.recentDecisions[0];
      lines.push(`Selected: ${lastDecision.tool.name}`);
      lines.push(`Confidence: ${(lastDecision.confidence * 100).toFixed(0)}%`);
      lines.push(`Strategy: ${lastDecision.strategy}`);
    } else {
      lines.push("No routing decisions yet");
    }

    return lines;
  }

  /**
   * Get full dashboard content
   */
  getFullDashboard(): string {
    const lines = [
      "╔══════════════════════════════════════════════════════════╗",
      "║              🔀 Tool Router Dashboard                   ║",
      "╠══════════════════════════════════════════════════════════╣",
    ];

    // Recent decisions
    lines.push("║  Recent Decisions:                                     ║");
    if (this.recentDecisions.length === 0) {
      lines.push("║    No decisions yet                                    ║");
    } else {
      for (const decision of this.recentDecisions.slice(0, 5)) {
        const toolName = decision.tool.name.padEnd(15).substring(0, 15);
        const confidence = `${(decision.confidence * 100).toFixed(0)}%`.padStart(4);
        lines.push(
          `║    ${toolName} │ ${confidence} │ ${decision.strategy.padEnd(8).substring(0, 8)}║`
        );
      }
    }

    lines.push("╠══════════════════════════════════════════════════════════╣");
    lines.push("║  Commands: /tool-router-stats │ /tool-router-rules      ║");
    lines.push("╚══════════════════════════════════════════════════════════╝");

    return lines.join("\n");
  }

  /**
   * Show dashboard
   */
  async show(): Promise<void> {
    // This would be called by a command handler
    console.log(this.getFullDashboard());
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit: number = 10): RoutingDecision[] {
    return this.recentDecisions.slice(0, limit);
  }

  /**
   * Filter decisions by tool
   */
  getDecisionsByTool(toolName: string): RoutingDecision[] {
    return this.recentDecisions.filter((d) => d.tool.name === toolName);
  }

  /**
   * Get decisions by strategy
   */
  getDecisionsByStrategy(strategy: string): RoutingDecision[] {
    return this.recentDecisions.filter((d) => d.strategy === strategy);
  }
}
