# Configuration Guide

Complete configuration reference for pi-tool-router.

## Settings File

Configuration is stored in `~/.pi/agent/settings.json` under the `toolRouter` key:

```json
{
  "toolRouter": {
    "enabled": true,
    "defaultStrategy": "auto"
  }
}
```

## Full Configuration Schema

```typescript
interface RouterConfig {
  // Enable/disable the router
  enabled: boolean;
  
  // Default routing strategy
  // Options: "auto" | "priority" | "cost" | "capability"
  defaultStrategy: "auto";
  
  // Strategy-specific configurations
  strategies: {
    priority: {
      enabled: boolean;
      fallbackEnabled: boolean;
    };
    cost: {
      enabled: boolean;
      fallbackEnabled: boolean;
      maxCostPerTask: number; // Max USD per task
    };
    capability: {
      enabled: boolean;
      fallbackEnabled: boolean;
      strictMatching: boolean; // Require exact capability match
    };
  };
  
  // Tool weights (0-100, higher = preferred)
  toolWeights: Record<string, number>;
  
  // Routing rules
  routingRules: RoutingRule[];
  
  // Analytics configuration
  analytics: {
    enabled: boolean;
    retentionDays: number;
    trackCosts: boolean;
    trackPerformance: boolean;
  };
  
  // Fallback configuration
  fallback: {
    enabled: boolean;
    maxRetries: number;
    fallbackOrder: string[];
  };
}
```

## Tool Weights

Adjust tool preferences based on your workflow:

```json
{
  "toolWeights": {
    "web_search": 10,        // Highest priority for web search
    "ollama_web_search": 9,   // Ollama slightly lower
    "code_search": 8,         // Code search important
    "fetch_content": 7,        // Content fetching
    "grep": 6,
    "read": 5,
    "edit": 5,
    "bash": 4,
    "write": 4,
    "find": 4
  }
}
```

## Routing Rules

### Basic Rule Structure

```json
{
  "id": "unique-rule-id",
  "name": "Human-readable name",
  "enabled": true,
  "priority": 1-10,
  "match": { ... },
  "preferredTools": ["tool1", "tool2"],
  "excludeTools": ["tool3"]
}
```

### Match Types

#### Query Patterns

Match based on keywords in the query:

```json
{
  "match": {
    "queryPatterns": [
      "news",           // Contains "news"
      "latest",         // Contains "latest"
      "/\\d{4}-\\d{2}/" // Regex for year-month
    ]
  }
}
```

#### Capability Matching

Match based on required tool capabilities:

```json
{
  "match": {
    "capabilities": [
      "web_search",
      "code_analysis"
    ]
  }
}
```

#### Context Patterns

Match based on context string:

```json
{
  "match": {
    "contextPatterns": [
      "shopping",
      "product"
    ]
  }
}
```

#### File Patterns

Match based on file paths:

```json
{
  "match": {
    "filePatterns": [
      "**/*.ts",
      "**/*.js"
    ]
  }
}
```

### Complete Rule Example

```json
{
  "routingRules": [
    {
      "id": "real-time-pricing",
      "name": "Real-time Price Checking",
      "enabled": true,
      "priority": 10,
      "match": {
        "queryPatterns": [
          "price",
          "cost",
          "pricing",
          "$"
        ],
        "capabilities": ["web_search"]
      },
      "preferredTools": [
        "ollama_web_search",
        "web_search"
      ],
      "excludeTools": ["code_search"]
    },
    {
      "id": "api-documentation",
      "name": "API Documentation Lookup",
      "enabled": true,
      "priority": 9,
      "match": {
        "queryPatterns": [
          "api",
          "documentation",
          "docs",
          "endpoint"
        ],
        "filePatterns": ["**/api/**/*.ts"]
      },
      "preferredTools": [
        "code_search",
        "read",
        "grep"
      ]
    }
  ]
}
```

## Strategy Configuration

### Priority Strategy

Routes to highest-priority tool:

```json
{
  "strategies": {
    "priority": {
      "enabled": true,
      "fallbackEnabled": true
    }
  }
}
```

### Cost Strategy

Routes to lowest-cost tool:

```json
{
  "strategies": {
    "cost": {
      "enabled": true,
      "fallbackEnabled": true,
      "maxCostPerTask": 0.01
    }
  }
}
```

### Capability Strategy

Routes based on capability matching:

```json
{
  "strategies": {
    "capability": {
      "enabled": true,
      "fallbackEnabled": true,
      "strictMatching": false
    }
  }
}
```

## Fallback Configuration

```json
{
  "fallback": {
    "enabled": true,
    "maxRetries": 3,
    "fallbackOrder": [
      "ollama_web_search",
      "web_search",
      "code_search",
      "read"
    ]
  }
}
```

## Example Configuration

```json
{
  "toolRouter": {
    "enabled": true,
    "defaultStrategy": "auto",
    "strategies": {
      "priority": { "enabled": true, "fallbackEnabled": true },
      "cost": { "enabled": true, "fallbackEnabled": true, "maxCostPerTask": 0.01 },
      "capability": { "enabled": true, "fallbackEnabled": true, "strictMatching": false }
    },
    "toolWeights": {
      "web_search": 10,
      "ollama_web_search": 9,
      "code_search": 8,
      "fetch_content": 7,
      "grep": 6,
      "read": 5,
      "edit": 5,
      "bash": 4,
      "write": 4,
      "find": 4
    },
    "routingRules": [
      {
        "id": "real-time-info",
        "name": "Real-time Information",
        "enabled": true,
        "priority": 10,
        "match": {
          "queryPatterns": ["news", "latest", "current", "price", "weather", "stock"]
        },
        "preferredTools": ["ollama_web_search", "web_search"]
      },
      {
        "id": "code-analysis",
        "name": "Code Analysis",
        "enabled": true,
        "priority": 9,
        "match": {
          "queryPatterns": ["function", "class", "api", "code"],
          "capabilities": ["code_analysis", "code_search"]
        },
        "preferredTools": ["code_search", "grep", "read"]
      }
    ],
    "analytics": {
      "enabled": true,
      "retentionDays": 30,
      "trackCosts": true,
      "trackPerformance": true
    },
    "fallback": {
      "enabled": true,
      "maxRetries": 3,
      "fallbackOrder": ["web_search", "code_search", "read"]
    }
  }
}
```
