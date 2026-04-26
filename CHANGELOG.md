# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-26

### Added

- Initial release
- Core tool routing with multiple strategies:
  - Priority-based routing
  - Cost-based routing
  - Capability-based routing
  - Auto-selection (combined)
- Tools registry for managing available tools
- Configuration system with customizable routing rules
- Routing rule matching engine
- Analytics tracking for tool usage and performance
- TUI dashboard for real-time monitoring
- Built-in commands:
  - `/tool-router-stats` - View statistics
  - `/tool-router-clear` - Clear analytics
  - `/tool-router-rules` - List routing rules
- Fallback chains for tool execution
- Comprehensive documentation
- Unit and integration tests

### Features

- Intelligent tool selection based on task context
- Configurable tool weights and priorities
- Pattern-based routing rules
- Real-time analytics and performance metrics
- Event system for extensibility
- Support for builtin, extension, and custom tools

### Routing Rules

Pre-configured rules for:
- Real-time information (news, prices, weather)
- Code analysis (functions, classes, APIs)
- File operations (create, edit, modify)
- Web content fetching
- Bash command execution
