const EventEmitter = require('events');

/**
 * EventBus Singleton (Observer Pattern & Event-Driven Architecture)
 * Utilizes Node.js native EventEmitter to decouple business logic from real-time dispatchers.
 */
class LandAcquisitionEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase listener limits if many SSE clients connect
    this.setMaxListeners(100);
  }

  // Helper method to emit typed domain events
  emitEvent(eventName, payload) {
    const timestamp = new Date().toISOString();
    const eventPayload = {
      event: eventName,
      timestamp,
      data: payload
    };
    console.log(`📡 [EventBus Emitted] ${eventName} at ${timestamp}`);
    this.emit(eventName, eventPayload);
    // Also emit to universal channel for global SSE stream
    this.emit('system:event', eventPayload);
  }
}

const eventBus = new LandAcquisitionEventBus();

module.exports = eventBus;
