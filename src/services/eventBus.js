// Publishes application events to listeners.

const EventEmitter = require('events');

class LandAcquisitionEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow up to 100 concurrent SSE browser connections without warnings
    this.setMaxListeners(100);
  }
emitEvent(eventName, payload) {
    const timestamp = new Date().toISOString();
    const eventPayload = {
      event: eventName,
      timestamp,
      data: payload
    };

    console.log(`📡 [EventBus Emitted] ${eventName} at ${timestamp}`);

    this.emit(eventName, eventPayload);

    this.emit('system:event', eventPayload);
  }
}

// Exports the shared event bus instance.
const eventBus = new LandAcquisitionEventBus();

module.exports = eventBus;
