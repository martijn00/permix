const ids = new WeakMap<object, number>()
let sequence = 0

export function instanceId(value: object): number {
  const existing = ids.get(value)
  if (existing !== undefined) {
    return existing
  }
  sequence += 1
  ids.set(value, sequence)
  return sequence
}
