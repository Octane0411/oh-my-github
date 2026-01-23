/**
 * Test H2 Event System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { H2EventEmitter, H2Event } from '../events';

describe('H2EventEmitter', () => {
  let emitter: H2EventEmitter;
  let receivedEvents: H2Event[];

  beforeEach(() => {
    emitter = new H2EventEmitter();
    receivedEvents = [];
  });

  it('should emit and receive events', async () => {
    emitter.on((event) => {
      receivedEvents.push(event);
    });

    await emitter.emit('workflow:start', { query: 'test' }, 'Starting workflow');
    await emitter.emit('translator:start', {}, 'Translating query');
    await emitter.emit('translator:complete', { keywords: ['test'] }, 'Translation complete');

    expect(receivedEvents).toHaveLength(3);
    expect(receivedEvents[0].type).toBe('workflow:start');
    expect(receivedEvents[0].message).toBe('Starting workflow');
    expect(receivedEvents[1].type).toBe('translator:start');
    expect(receivedEvents[2].type).toBe('translator:complete');
  });

  it('should support multiple subscribers', async () => {
    const events1: H2Event[] = [];
    const events2: H2Event[] = [];

    emitter.on((event) => events1.push(event));
    emitter.on((event) => events2.push(event));

    await emitter.emit('scout:start', {}, 'Scouting');

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0].type).toBe('scout:start');
    expect(events2[0].type).toBe('scout:start');
  });

  it('should unsubscribe correctly', async () => {
    const callback = (event: H2Event) => receivedEvents.push(event);

    emitter.on(callback);
    await emitter.emit('screener:start', {}, 'Screening');
    expect(receivedEvents).toHaveLength(1);

    emitter.off(callback);
    await emitter.emit('screener:complete', {}, 'Complete');
    expect(receivedEvents).toHaveLength(1); // Should not increase
  });

  it('should include timestamp in events', async () => {
    emitter.on((event) => receivedEvents.push(event));

    const beforeTime = Date.now();
    await emitter.emit('workflow:complete', {}, 'Done');
    const afterTime = Date.now();

    expect(receivedEvents[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(receivedEvents[0].timestamp).toBeLessThanOrEqual(afterTime);
  });
});
