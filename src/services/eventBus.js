// ============================================================================
// 📡 REAL-TIME EVENT BUS (OBSERVER PATTERN & EVENT-DRIVEN ARCHITECTURE)
// File: src/services/eventBus.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "EventEmitter, Event-Driven Programming, Observer Pattern, Event Methods"
//
// 💡 WHAT IS THE OBSERVER PATTERN? (THE "YOUTUBE SUBSCRIBER" ANALOGY):
// Imagine you want to know when your favorite YouTuber uploads a new video.
// - BAD WAY (Polling): You refresh their channel every 5 seconds asking "Did you upload yet?".
//   This wastes server CPU, internet bandwidth, and battery!
// - GOOD WAY (Observer / Event-Driven): You click the "Subscribe" bell button.
//   Whenever a video is uploaded, the creator "Emits" an event, and YouTube pushes
//   a notification directly to your phone!
//
// In our Land Acquisition System:
// Whenever an Admin advances an acquisition status, or a payout is disbursed,
// our EventBus emits an event. The Server-Sent Events (SSE) stream catches it
// and pushes it LIVE to all open administrator and landowner browsers in real-time!
// ============================================================================

const EventEmitter = require('events');

class LandAcquisitionEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow up to 100 concurrent SSE browser connections without warnings
    this.setMaxListeners(100);
  }

  /**
   * Helper function to publish / emit a domain event with standard metadata
   * @param {string} eventName - e.g. 'acquisition:status_changed', 'compensation:paid'
   * @param {object} payload - The details of what changed
   */
  emitEvent(eventName, payload) {
    const timestamp = new Date().toISOString();
    const eventPayload = {
      event: eventName,
      timestamp,
      data: payload
    };

    console.log(`📡 [EventBus Emitted] ${eventName} at ${timestamp}`);

    // 1. Emit to the specific event listener (e.g. 'acquisition:status_changed')
    this.emit(eventName, eventPayload);

    // 2. Also emit to the universal channel so our SSE stream can broadcast it to all clients
    this.emit('system:event', eventPayload);
  }
}

// Export a single shared instance (Singleton Pattern) so the whole app uses one EventBus
const eventBus = new LandAcquisitionEventBus();

module.exports = eventBus;
