// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Fixed-size pool. Objects need an `active` flag and `reset()`. The first `count`
// entries of `items` are the active ones; release is swap-remove (no splice).
// The pool never grows: sizing is a level-load concern.

export class ObjectPool {
  constructor(factory, size) {
    this.items = new Array(size);
    for (let i = 0; i < size; i++) {
      const obj = factory();
      obj.active = false;
      obj.poolIndex = i;
      this.items[i] = obj;
    }
    this.size = size;
    this.created = size;
    this.count = 0;
  }

  // Returns an active object, or null when the pool is exhausted (never allocates).
  acquire() {
    if (this.count === this.size) return null;
    const obj = this.items[this.count];
    obj.poolIndex = this.count;
    obj.active = true;
    this.count++;
    return obj;
  }

  // Swap-remove: the last active object takes the freed slot. Returns false when
  // `obj` is not active.
  release(obj) {
    if (!obj.active) return false;
    const last = this.count - 1;
    const index = obj.poolIndex;
    const tail = this.items[last];
    this.items[index] = tail;
    tail.poolIndex = index;
    this.items[last] = obj;
    obj.poolIndex = last;
    obj.active = false;
    this.count = last;
    obj.reset();
    return true;
  }
}
