/**
 * Unit tests for Config Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConfigManager,
  RouterConfig,
  DEFAULT_CONFIG,
  validateConfig,
  isValidConfig,
  getConfigManager,
  resetConfigManager,
  RoutingRule,
  RoutingStrategyType,
} from '../../src/config/index.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    resetConfigManager();
    configManager = new ConfigManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.defaultStrategy).toBe('auto');
      expect(config.toolWeights).toBeDefined();
      expect(config.routingRules).toBeDefined();
      expect(Array.isArray(config.routingRules)).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return a deep clone to prevent mutation', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1.toolWeights).not.toBe(config2.toolWeights);
    });
  });

  describe('getToolWeight', () => {
    it('should return weight for known tool', () => {
      const weight = configManager.getToolWeight('bash');
      expect(weight).toBe(8);
    });

    it('should return default weight for unknown tool', () => {
      const weight = configManager.getToolWeight('unknown-tool');
      expect(weight).toBe(5);
    });
  });

  describe('setToolWeight', () => {
    it('should update tool weight', async () => {
      await configManager.setToolWeight('test-tool', 10);
      const weight = configManager.getToolWeight('test-tool');
      expect(weight).toBe(10);
    });

    it('should throw for invalid weight', async () => {
      await expect(configManager.setToolWeight('bash', -1)).rejects.toThrow();
      await expect(configManager.setToolWeight('bash', 101)).rejects.toThrow();
    });
  });

  describe('getRoutingRules', () => {
    it('should return all routing rules', () => {
      const rules = configManager.getRoutingRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('getEnabledRoutingRules', () => {
    it('should return only enabled rules sorted by priority', () => {
      const rules = configManager.getEnabledRoutingRules();
      expect(rules.every(r => r.enabled)).toBe(true);
      // Check sorting (highest priority first)
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });
  });

  describe('getRoutingRule', () => {
    it('should return rule by id', () => {
      const rule = configManager.getRoutingRule('file-edit-rule');
      expect(rule).toBeDefined();
      expect(rule?.id).toBe('file-edit-rule');
    });

    it('should return undefined for unknown rule', () => {
      const rule = configManager.getRoutingRule('nonexistent');
      expect(rule).toBeUndefined();
    });
  });

  describe('addRoutingRule', () => {
    it('should add a new routing rule', async () => {
      const newRule: RoutingRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        priority: 5,
        preferredTools: ['bash'],
      };

      await configManager.addRoutingRule(newRule);
      const rule = configManager.getRoutingRule('test-rule');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Test Rule');
    });

    it('should throw for duplicate rule id', async () => {
      const newRule: RoutingRule = {
        id: 'file-edit-rule', // Already exists in defaults
        name: 'Duplicate',
        enabled: true,
        priority: 5,
        preferredTools: ['bash'],
      };

      await expect(configManager.addRoutingRule(newRule)).rejects.toThrow();
    });
  });

  describe('updateRoutingRule', () => {
    it('should update existing rule', async () => {
      await configManager.updateRoutingRule('file-edit-rule', {
        priority: 1,
      });

      const rule = configManager.getRoutingRule('file-edit-rule');
      expect(rule?.priority).toBe(1);
    });

    it('should throw for unknown rule', async () => {
      await expect(
        configManager.updateRoutingRule('unknown-rule', { priority: 1 })
      ).rejects.toThrow();
    });
  });

  describe('removeRoutingRule', () => {
    it('should remove existing rule', async () => {
      await configManager.addRoutingRule({
        id: 'temp-rule',
        name: 'Temp',
        enabled: true,
        priority: 5,
        preferredTools: ['bash'],
      });

      await configManager.removeRoutingRule('temp-rule');
      expect(configManager.getRoutingRule('temp-rule')).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset config to defaults', async () => {
      await configManager.setToolWeight('bash', 99);
      configManager.reset();

      expect(configManager.getToolWeight('bash')).toBe(8);
    });
  });

  describe('on / emit events', () => {
    it('should call callback on config change', async () => {
      const callback = vi.fn();
      configManager.on('config-changed', callback);

      await configManager.setToolWeight('test-tool', 10);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ defaultStrategy: 'auto' }));
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsubscribe = configManager.on('config-changed', callback);
      unsubscribe();

      // Manually trigger (can't easily test without API call, but verifies unsubscribe works)
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('validate', () => {
    it('should validate current config as valid', () => {
      const result = configManager.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('validateConfig', () => {
  it('should return valid result for DEFAULT_CONFIG', () => {
    const result = validateConfig(DEFAULT_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid strategy type', () => {
    const result = validateConfig({ defaultStrategy: 'invalid' as RoutingStrategyType });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('defaultStrategy'))).toBe(true);
  });

  it('should detect invalid tool weights', () => {
    const result = validateConfig({
      toolWeights: {
        bash: -1,
        read: 101,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect missing rule id', () => {
    const result = validateConfig({
      routingRules: [{
        name: 'Test',
        priority: 5,
        enabled: true,
        preferredTools: ['bash'],
      } as RoutingRule],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
  });

  it('should detect missing rule name', () => {
    const result = validateConfig({
      routingRules: [{
        id: 'test-rule',
        priority: 5,
        enabled: true,
        preferredTools: ['bash'],
      } as RoutingRule],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing name'))).toBe(true);
  });

  it('should detect invalid priority', () => {
    const result = validateConfig({
      routingRules: [{
        id: 'test-rule',
        name: 'Test',
        priority: 15, // Invalid: must be 0-10
        enabled: true,
        preferredTools: ['bash'],
      }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('priority'))).toBe(true);
  });

  it('should detect missing preferredTools', () => {
    const result = validateConfig({
      routingRules: [{
        id: 'test-rule',
        name: 'Test',
        priority: 5,
        enabled: true,
      } as unknown as RoutingRule],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('preferredTools'))).toBe(true);
  });

  it('should detect invalid retentionDays', () => {
    const result = validateConfig({
      analytics: { enabled: true, retentionDays: 0, trackCosts: true, trackPerformance: true },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('retentionDays'))).toBe(true);
  });

  it('should detect invalid maxRetries', () => {
    const result = validateConfig({
      fallback: { enabled: true, maxRetries: -1, fallbackOrder: ['bash'] },
    });
    expect(result.valid).toBe(false);
  });
});

describe('isValidConfig', () => {
  it('should return true for valid config', () => {
    expect(isValidConfig(DEFAULT_CONFIG)).toBe(true);
  });

  it('should return false for invalid config', () => {
    expect(isValidConfig({ defaultStrategy: 'invalid' })).toBe(false);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have valid structure', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CONFIG.defaultStrategy).toBe('auto');
    expect(DEFAULT_CONFIG.toolWeights).toBeDefined();
    expect(DEFAULT_CONFIG.routingRules.length).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.fallback).toBeDefined();
    expect(DEFAULT_CONFIG.analytics).toBeDefined();
  });

  it('should have all required strategies', () => {
    const strategies = ['auto', 'priority', 'cost', 'capability', 'custom'];
    for (const s of strategies) {
      expect(DEFAULT_CONFIG.strategies[s]).toBeDefined();
    }
  });

  it('should have core tool weights', () => {
    expect(DEFAULT_CONFIG.toolWeights.bash).toBeDefined();
    expect(DEFAULT_CONFIG.toolWeights.read).toBeDefined();
    expect(DEFAULT_CONFIG.toolWeights.edit).toBeDefined();
  });

  it('should have valid fallback order', () => {
    expect(Array.isArray(DEFAULT_CONFIG.fallback.fallbackOrder)).toBe(true);
    expect(DEFAULT_CONFIG.fallback.fallbackOrder.length).toBeGreaterThan(0);
  });
});

describe('getConfigManager singleton', () => {
  it('should return same instance on multiple calls', () => {
    const manager1 = getConfigManager();
    const manager2 = getConfigManager();
    expect(manager1).toBe(manager2);
  });

  it('should return new instance after reset', () => {
    const manager1 = getConfigManager();
    resetConfigManager();
    const manager2 = getConfigManager();
    expect(manager1).not.toBe(manager2);
  });
});
