// Queue presses until a simulation step consumes them. A quick tap must not
// disappear when pointerup/keyup arrives before requestAnimationFrame.
export class TetrisInput {
  private held = new Map<string, number>()
  private taps = 0
  press(source: string, bit: number) {
    if (!this.held.has(source)) this.taps |= bit
    this.held.set(source, bit)
  }
  release(source: string) { this.held.delete(source) }
  tap(bit: number) { this.taps |= bit }
  sample() {
    let mask = this.taps
    for (const bit of this.held.values()) mask |= bit
    this.taps = 0
    return mask
  }
  clear() { this.held.clear(); this.taps = 0 }
}
