/**
 * H2 Discovery Workflow Events
 *
 * Event system for streaming progress updates during H2 pipeline execution
 */

export type H2EventType =
  | 'workflow:start'
  | 'workflow:complete'
  | 'workflow:error'
  | 'translator:start'
  | 'translator:complete'
  | 'translator:error'
  | 'scout:start'
  | 'scout:searching'
  | 'scout:complete'
  | 'scout:error'
  | 'screener:start'
  | 'screener:evaluating'
  | 'screener:complete'
  | 'screener:error';

export interface H2Event {
  type: H2EventType;
  timestamp: number;
  data?: any;
  message?: string;
}

export type H2EventCallback = (event: H2Event) => void | Promise<void>;

/**
 * H2 Event Emitter - Simple callback-based event system
 */
export class H2EventEmitter {
  private callbacks: H2EventCallback[] = [];

  /**
   * Subscribe to H2 events
   */
  on(callback: H2EventCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from H2 events
   */
  off(callback: H2EventCallback): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Emit an event to all subscribers
   */
  async emit(type: H2EventType, data?: any, message?: string): Promise<void> {
    const event: H2Event = {
      type,
      timestamp: Date.now(),
      data,
      message,
    };

    // Call all callbacks (don't await to prevent blocking)
    for (const callback of this.callbacks) {
      try {
        await callback(event);
      } catch (error) {
        console.error('H2 event callback error:', error);
      }
    }
  }
}
