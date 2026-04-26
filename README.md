# pi-tool-router

**Intelligent tool routing extension for pi coding agent**

[![npm version](https://img.shields.io/npm/v/@jessenguyen22/pi-tool-router.svg)](https://www.npmjs.com/package/@jessenguyen22/pi-tool-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jessenguyen22/pi-tool-router/pulls)
[![GitHub stars](https://img.shields.io/github/stars/jessenguyen22/pi-tool-router)](https://github.com/jessenguyen22/pi-tool-router/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/jessenguyen22/pi-tool-router)](https://github.com/jessenguyen22/pi-tool-router/commits)

> 🔀 Automatically select the best tool stack for each task using intelligent routing rules

## Features

### 🎯 Intelligent Tool Selection

- **Smart Routing**: AI automatically selects the optimal tool based on task characteristics
- **Configurable Rules**: Define custom routing rules for your workflow
- **Priority System**: Set tool priorities and fallback chains
- **Real-time Analytics**: Track tool usage patterns and effectiveness

### 🔧 Multi-Tool Support

- Web search tools (built-in, ollama, tavily, etc.)
- Code analysis tools (grep, find, read)
- File manipulation tools (edit, write, bash)
- Custom extension tools

### 📊 Observability

- Real-time routing dashboard
- Tool usage statistics
- Performance metrics
- Cost tracking per tool

### ⚙️ Extensible

- Custom routing strategies
- Plugin architecture
- Easy to add new tools and providers

## Installation

```bash
# Global installation
pi install npm:@jessenguyen22/pi-tool-router

# Project-local installation
pi install -l npm:@jessenguyen22/pi-tool-router
```

## Quick Start

### 1. Install the extension

```bash
pi install npm:@jessenguyen22/pi-tool-router
```

### 2. Restart pi

```bash
pi
```

### 3. The extension auto-initializes and registers routing rules

The router will automatically:

- Analyze incoming tasks
- Select optimal tools based on rules
- Execute with fallback support
- Track analytics

## Configuration

Create `~/.pi/agent/settings.json` to customize routing:

```json
{
  "toolRouter": {
    "enabled": true,
    "defaultStrategy": "priority",
    "strategies": {
      "priority": {
        "enabled": true,
        "fallbackEnabled": true
      },
      "cost": {
        "enabled": true,
        "maxCostPerTask": 5.0
      },
      "capability": {
        "enabled": true,
        "strictMatching": false
      }
    },
    "toolWeights": {
      "web_search": 10,
      "ollama_web_search": 8,
      "code_search": 7,
      "fetch_content": 6,
      "read": 5,
      "bash": 4
    },
    "routingRules": [
      {
        "name": "real-time-news",
        "match": {
          "queryPatterns": ["news", "price", "weather", "stock", "live"]
        },
        "preferredTools": ["ollama_web_search", "web_search"],
        "priority": 10
      },
      {
        "name": "code-search",
        "match": {
          "queryPatterns": ["function", "class", "api", "implementation"]
        },
        "preferredTools": ["code_search", "grep", "find"],
        "priority": 9
      }
    ],
    "analytics": {
      "enabled": true,
      "retentionDays": 30
    }
  }
}
```

## Usage

### Automatic Routing (Default)

Just describe your task naturally:

```
User: "Find the latest news about AI agents"
→ Router selects: ollama_web_search (real-time priority)

User: "Show me how the auth function is implemented"
→ Router selects: code_search + read (code analysis)

User: "Search for React performance patterns"
→ Router selects: web_search + code_search (combined)
```

### Manual Tool Override

Force a specific tool:

```
User: "Use tavily to search for X"
→ Router respects: tavily_web_search
```

### Dashboard

View routing analytics:

```bash
/tool-router-stats
```

Shows:

- Tool usage frequency
- Average response times
- Cost per tool
- Success rates
- Routing decisions log

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    pi-tool-router                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Router   │  │   Matcher   │  │  Executor  │          │
│  │   Core     │→ │   Engine    │→ │   Manager  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         ↓               ↓               ↓                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Config   │  │   Rules    │  │   Tools    │          │
│  │   Manager  │  │   Engine   │  │   Registry │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │            Analytics & Dashboard            │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component            | Description                                     |
| -------------------- | ----------------------------------------------- |
| **Router Core**      | Central orchestrator, manages routing decisions |
| **Matcher Engine**   | Analyzes task context and matches routing rules |
| **Executor Manager** | Executes tools with fallback support            |
| **Config Manager**   | Loads and validates configuration               |
| **Rules Engine**     | Evaluates and prioritizes routing rules         |
| **Tools Registry**   | Maintains available tools and their metadata    |
| **Analytics**        | Tracks usage, costs, and performance            |

## Routing Strategies

### Priority Strategy (Default)

Routes to highest-priority tool that matches task requirements.

### Cost Strategy

Routes to lowest-cost tool that can complete the task.

### Capability Strategy

Routes based on tool capabilities matching task requirements.

### Custom Strategy

Implement your own routing logic:

```typescript
import type { RoutingStrategy } from 'pi-tool-router';

const myStrategy: RoutingStrategy = {
  name: 'my-strategy',
  selectTool(context: RoutingContext): ToolSelection {
    // Custom logic
    return { toolName: 'best-tool', confidence: 0.95 };
  },
};
```

## API Reference

### Extension Events

```typescript
// On tool selection
pi.events.on('tool-router:tool-selected', tool => {
  console.log(`Selected: ${tool.name}`);
});

// On routing decision
pi.events.on('tool-router:routing-decision', decision => {
  console.log(`Decision: ${decision.selectedTool}`);
});

// On tool execution complete
pi.events.on('tool-router:tool-complete', result => {
  console.log(`Completed: ${result.toolName}`);
});
```

### Tool Registration

```typescript
// Register custom routing strategy
pi.events.emit('tool-router:register-strategy', myStrategy);

// Register custom tool
pi.events.emit('tool-router:register-tool', {
  name: 'my-custom-tool',
  capabilities: ['web', 'search'],
  cost: 0.001,
  priority: 5,
});
```

## Examples

See [examples/](examples/) for complete examples:

## Installation

```bash
# Global installation
pi install npm:pi-tool-router

# Project-local installation
pi install -l npm:pi-tool-router

# From GitHub (latest)
pi install git:github.com/jessenguyen22/pi-tool-router
```

- [Basic routing](examples/basic-routing.ts)
- [Custom strategy](examples/custom-strategy.ts)
- [Dashboard integration](examples/dashboard.ts)

## Development

```bash
# Clone repository
git clone https://github.com/your-username/pi-tool-router.git
cd pi-tool-router

# Install dependencies
npm install

# Run tests
npm test

# Run in dev mode
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request to [jessenguyen22/pi-tool-router](https://github.com/jessenguyen22/pi-tool-router/pulls)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent) - The coding agent this extends
- [pi-coordinator](https://github.com/skidvis/pi-coordinator) - Multi-agent orchestration
- [pi-coordination](https://github.com/nicobailon/pi-coordination) - Advanced coordination system
- [pi-interactive-shell](https://github.com/nicobailon/pi-interactive-shell) - Interactive CLI spawning

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/jessenguyen22/pi-tool-router/issues)
- 💬 [Discussions](https://github.com/jessenguyen22/pi-tool-router/discussions)
- ⭐ [Star on GitHub](https://github.com/jessenguyen22/pi-tool-router)
