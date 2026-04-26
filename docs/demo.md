# pi-tool-router Demo & Evidence

## 🎯 What is pi-tool-router?

An intelligent tool routing extension for pi coding agent that automatically selects the best tool stack for each task.

---

## ✅ Test Results

```
Test Files  5 passed (5)
Tests       110 passed (110)
Duration    960ms
```

### Test Coverage:

| Test File                          | Tests    | Status |
| ---------------------------------- | -------- | ------ |
| `tests/core/types.test.ts`         | 17 tests | ✅     |
| `tests/unit/matcher.test.ts`       | 37 tests | ✅     |
| `tests/unit/ConfigManager.test.ts` | 36 tests | ✅     |
| `tests/unit/router.test.ts`        | 8 tests  | ✅     |
| `tests/unit/e2e-routing.test.ts`   | 12 tests | ✅     |

---

## 🔧 How It Works

### Routing Strategies

1. **Priority Strategy** - Selects tool based on configured priority
2. **Cost Strategy** - Selects lowest cost tool that can complete the task
3. **Capability Strategy** - Matches tool capabilities to task requirements
4. **Auto Strategy** - Combines all strategies intelligently

### Example Routing Decisions

| Query                   | Selected Tool       | Confidence | Strategy                  |
| ----------------------- | ------------------- | ---------- | ------------------------- |
| "Find latest AI news"   | `ollama_web_search` | 92%        | Priority (Real-time rule) |
| "Search for function X" | `code_search`       | 88%        | Capability                |
| "Read file config.json" | `read`              | 95%        | Priority (File ops rule)  |
| "Install dependencies"  | `bash`              | 85%        | Priority (Bash rule)      |

---

## 📊 Pre-configured Routing Rules

```typescript
// Real-time Information (Priority: 10)
{
  queryPatterns: ["news", "latest", "price", "weather", "stock", "live"],
  preferredTools: ["ollama_web_search", "web_search", "fetch_content"]
}

// Code Analysis (Priority: 9)
{
  queryPatterns: ["function", "class", "api", "implementation", "code"],
  preferredTools: ["code_search", "grep", "read", "find"]
}

// File Operations (Priority: 8)
{
  queryPatterns: ["create file", "write file", "edit file"],
  preferredTools: ["edit", "write"]
}

// Web Content Fetch (Priority: 8)
{
  queryPatterns: ["fetch", "scrape", "extract from", "visit"],
  preferredTools: ["fetch_content"]
}

// Bash Commands (Priority: 7)
{
  queryPatterns: ["run", "execute", "command", "npm", "git"],
  preferredTools: ["bash"]
}
```

---

## 🚀 Installation & Usage

```bash
# Install from npm
pi install npm:@jessenguyen22/pi-tool-router

# Or from GitHub
pi install git:github.com/jessenguyen22/pi-tool-router
```

### Commands

```
/tool-router-stats   # View statistics
/tool-router-rules  # List routing rules
/tool-router-clear  # Clear analytics
```

### Tool Usage

```
Use tool_router to find the best tool for "search for latest AI news"
```

---

## 📈 Analytics

The extension tracks:

- Tool usage frequency
- Average confidence scores
- Average response times
- Success rates per tool
- Strategy usage distribution

---

## 🏗️ Architecture

```
pi-tool-router/
├── src/
│   ├── core/
│   │   ├── types.ts      # Type definitions
│   │   ├── router.ts     # Main routing logic
│   │   ├── matcher.ts    # Rule matching engine
│   │   └── executor.ts   # Tool execution
│   ├── config/           # Configuration manager
│   ├── tools/            # Tools registry
│   └── observability/    # Analytics & dashboard
├── tests/                # 110 tests
└── docs/                 # Documentation
```

---

## 📦 Package Info

- **Name:** `@jessenguyen22/pi-tool-router`
- **Version:** 0.1.0
- **License:** MIT
- **NPM:** https://www.npmjs.com/package/@jessenguyen22/pi-tool-router
- **GitHub:** https://github.com/jessenguyen22/pi-tool-router

---

## 🔗 Related Projects

- [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent) - Base agent
- [pi-coordinator](https://github.com/skidvis/pi-coordinator) - Multi-agent orchestration
- [pi-coordination](https://github.com/nicobailon/pi-coordination) - Advanced coordination
