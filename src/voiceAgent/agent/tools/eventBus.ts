// src/eventBus.ts

type Listener<T = any> = (payload: T) => void;

class EventBus {
  private events: Map<string, Listener[]> = new Map();

  on<T = any>(event: string, listener: Listener<T>) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(listener);
  }

  off<T = any>(event: string, listener: Listener<T>) {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event)!.filter((l) => l !== listener);
    this.events.set(event, listeners);
  }

  emit<T = any>(event: string, payload: T) {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach((listener) => listener(payload));
  }
}

const eventBus = new EventBus();
export default eventBus;
