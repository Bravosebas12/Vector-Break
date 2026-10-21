// Preallocated event ring (design D2). Overflow overwrites the oldest event and bumps `overflow`.
// Only presentation, audio and tests consume it; game logic never reads it, so a drop is harmless.

export const RING_CAPACITY = 1024;

export class EventRing {
  constructor(capacity = RING_CAPACITY) {
    this.capacity = capacity;
    this.slots = Array.from({ length: capacity }, () => ({ type: '', a: 0, b: 0 }));
    this.head = 0; // index of the oldest event
    this.length = 0;
    this.overflow = 0;
  }

  push(type, a = 0, b = 0) {
    if (this.length === this.capacity) {
      this.head = (this.head + 1) % this.capacity;
      this.length--;
      this.overflow++;
    }
    const slot = this.slots[(this.head + this.length) % this.capacity];
    slot.type = type;
    slot.a = a;
    slot.b = b;
    this.length++;
  }

  // Calls fn(type, a, b) oldest first and empties the ring (the overflow counter is kept).
  drain(fn) {
    while (this.length > 0) {
      const slot = this.slots[this.head];
      this.head = (this.head + 1) % this.capacity;
      this.length--;
      fn(slot.type, slot.a, slot.b);
    }
  }
}
