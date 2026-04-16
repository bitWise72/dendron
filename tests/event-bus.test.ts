// ============================================================
// DENDRON SDK — EVENT BUS TESTS
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../src/events/bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should emit and receive events', () => {
    const handler = vi.fn();
    bus.on('ready', handler);
    bus.emit('ready', undefined as void);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should pass data to handlers', () => {
    const handler = vi.fn();
    bus.on('error', handler);
    const err = new Error('test error');
    bus.emit('error', err);
    expect(handler).toHaveBeenCalledWith(err);
  });

  it('should support multiple handlers for same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('ready', h1);
    bus.on('ready', h2);
    bus.emit('ready', undefined as void);
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe via returned function', () => {
    const handler = vi.fn();
    const unsub = bus.on('ready', handler);
    unsub();
    bus.emit('ready', undefined as void);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off()', () => {
    const handler = vi.fn();
    bus.on('ready', handler);
    bus.off('ready', handler);
    bus.emit('ready', undefined as void);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('ready', h1);
    bus.on('error', h2);
    bus.clear();
    bus.emit('ready', undefined as void);
    bus.emit('error', new Error('test'));
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('should report listener count', () => {
    expect(bus.listenerCount('ready')).toBe(0);
    bus.on('ready', vi.fn());
    bus.on('ready', vi.fn());
    expect(bus.listenerCount('ready')).toBe(2);
  });

  it('should not throw if emitting event with no handlers', () => {
    expect(() => bus.emit('ready', undefined as void)).not.toThrow();
  });

  it('should catch handler errors without affecting other handlers', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errHandler = vi.fn(() => {
      throw new Error('handler crash');
    });
    const okHandler = vi.fn();

    bus.on('ready', errHandler);
    bus.on('ready', okHandler);
    bus.emit('ready', undefined as void);

    expect(errHandler).toHaveBeenCalled();
    expect(okHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
