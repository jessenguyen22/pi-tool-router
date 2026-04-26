# API Reference

## Extension API

### Events

#### `tool-router:ready`

Fired when the extension is fully initialized:

```typescript
pi.events.on("tool-router:ready", ({ router, config, registry, analytics, dashboard }) => {
  console.log("Tool Router ready!");
});
```

#### `tool-router:routing-decision`

Fired on every routing decision:

```typescript
pi.events.on("tool-router:routing-decision", (decision) => {
  console.log(`Selected: ${decision.tool.name}`);
});
```

#### `tool-router:tool-selected`

Fired when a tool is selected:

```typescript
pi.events.on("tool-router:tool-selected", (event) => {
  console.log(`Tool: ${event.selectedTool.name}`);
});
```

#### `tool-router:tool-executed`

Fired when tool execution completes:

```typescript
pi.events.on("tool-router:tool-executed", (event) => {
  console.log(`Duration: ${event.duration}ms`);
});
```

#### `tool-router:config-changed`

Fired when configuration is updated:

```typescript
pi.events.on("tool-router:config-changed", (config) => {
  console.log("Config updated");
});
```

## Router Class

### Methods

#### `route(context)`

Route a query to the best tool:

```typescript
const decision = await router.route({
  query: "Find the latest AI news",
  strategy: "auto",
  context: "research",
  cwd: process.cwd()
});
```

**Parameters:**
- `context.query`: The task/query to route
- `context.strategy`: Strategy type ("auto", "priority", "cost", "capability")
- `context.context`: Additional context
- `context.cwd`: Current working directory

**Returns:** `RoutingDecision`

#### `registerStrategy(name, strategy)`

Register a custom routing strategy:

```typescript
router.registerStrategy("my-strategy", {
  name: "my-strategy",
  description: "Custom routing logic",
  selectTool: (context, tools, rules) => {
    return {
      toolName: "best-tool",
      confidence: 0.9,
      reasoning: ["Custom logic applied"]
    };
  }
});
```

## ToolsRegistry Class

### Methods

#### `getAllTools()`

Get all registered tools:

```typescript
const tools = registry.getAllTools();
```

#### `getTool(name)`

Get a specific tool:

```typescript
const tool = registry.getTool("web_search");
```

#### `registerTool(tool)`

Register a custom tool:

```typescript
registry.registerTool({
  name: "my-tool",
  label: "My Tool",
  description: "Custom tool description",
  capabilities: ["web_search"],
  cost: 0.001,
  priority: 8,
  weight: 8,
  source: "custom",
  isAvailable: true,
  usageCount: 0,
  successRate: 0.95,
  averageDuration: 1000
});
```

#### `getToolsByCapability(capability)`

Get tools by capability:

```typescript
const webTools = registry.getToolsByCapability("web_search");
```

#### `recordUsage(toolName, success, duration)`

Record tool usage for analytics:

```typescript
registry.recordUsage("web_search", true, 1500);
```

## ConfigManager Class

### Methods

#### `load()`

Load configuration from settings:

```typescript
const config = await configManager.load();
```

#### `getConfig()`

Get current configuration:

```typescript
const config = configManager.getConfig();
```

#### `getRoutingRules()`

Get all routing rules:

```typescript
const rules = configManager.getRoutingRules();
```

#### `addRule(rule)`

Add a routing rule:

```typescript
await configManager.addRule({
  id: "my-rule",
  name: "My Rule",
  enabled: true,
  priority: 8,
  match: {
    queryPatterns: ["specific keyword"]
  },
  preferredTools: ["my-tool"]
});
```

#### `removeRule(ruleId)`

Remove a routing rule:

```typescript
await configManager.removeRule("my-rule");
```

#### `getToolWeight(toolName)`

Get tool weight:

```typescript
const weight = configManager.getToolWeight("web_search");
```

#### `setToolWeight(toolName, weight)`

Set tool weight:

```typescript
await configManager.setToolWeight("web_search", 10);
```

## Analytics Class

### Methods

#### `startSession()`

Start analytics session:

```typescript
analytics.startSession();
```

#### `endSession()`

End analytics session:

```typescript
analytics.endSession();
```

#### `trackRouting(data)`

Track a routing event:

```typescript
analytics.trackRouting({
  query: "Find AI news",
  selectedTool: "ollama_web_search",
  alternatives: [{ name: "web_search", weight: 8 }],
  confidence: 0.95,
  duration: 1500,
  strategy: "auto"
});
```

#### `getStats()`

Get statistics summary:

```typescript
const stats = analytics.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Average confidence: ${stats.averageConfidence}`);
```

#### `getToolStats(toolName)`

Get tool-specific statistics:

```typescript
const toolStats = analytics.getToolStats("web_search");
console.log(`Usage count: ${toolStats.usageCount}`);
```

#### `getDailyStats(days)`

Get daily statistics:

```typescript
const dailyStats = analytics.getDailyStats(7);
```

#### `clear()`

Clear all analytics data:

```typescript
analytics.clear();
```

#### `export()`

Export analytics as JSON:

```typescript
const data = analytics.export();
```

#### `import(jsonData)`

Import analytics from JSON:

```typescript
analytics.import(data);
```

## Types

### RoutingContext

```typescript
interface RoutingContext {
  query: string;
  strategy: RoutingStrategyType;
  context?: string;
  cwd?: string;
  userId?: string;
  timestamp: Date;
}
```

### RoutingDecision

```typescript
interface RoutingDecision {
  tool: ToolInfo;
  confidence: number;
  strategy: RoutingStrategyType;
  alternatives: Array<{ name: string; weight: number }>;
  reasoning: string[];
  timestamp: Date;
  executionResult?: ToolExecutionResult;
}
```

### ToolInfo

```typescript
interface ToolInfo {
  name: string;
  label: string;
  description: string;
  capabilities: ToolCapability[];
  cost: number;
  priority: number;
  weight: number;
  source: "builtin" | "extension" | "custom";
  sourceInfo?: { path: string; scope: string };
  isAvailable: boolean;
  lastUsed?: Date;
  usageCount: number;
  successRate: number;
  averageDuration: number;
}
```

### RoutingRule

```typescript
interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: RoutingMatch;
  preferredTools: string[];
  excludeTools?: string[];
  strategy?: RoutingStrategyType;
  metadata?: Record<string, unknown>;
}
```

### RoutingMatch

```typescript
interface RoutingMatch {
  queryPatterns?: string[];
  capabilities?: ToolCapability[];
  contextPatterns?: string[];
  filePatterns?: string[];
  minConfidence?: number;
}
```
