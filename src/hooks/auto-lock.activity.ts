let lastActivityTimestamp = Date.now();

export function markActivity(): void {
  lastActivityTimestamp = Date.now();
}

export function getLastActivityTimestamp(): number {
  return lastActivityTimestamp;
}
