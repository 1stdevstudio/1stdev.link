/** Keep writes in intent order, including after a failed request. */
export class MutationQueue {
  private tail: Promise<void> = Promise.resolve();

  run(task: () => Promise<void>): Promise<void> {
    const next = this.tail.then(task);
    this.tail = next.catch(() => {});
    return next;
  }
}

/** A collection read is usable only when no mutation overlaps its lifetime. */
export class CollectionRevision {
  private revision = 0;
  private pending = 0;

  capture(): number | null {
    return this.pending === 0 ? this.revision : null;
  }

  accepts(snapshot: number | null): boolean {
    return snapshot !== null && this.pending === 0 && snapshot === this.revision;
  }

  begin(): () => void {
    this.pending++;
    this.revision++;
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.pending--;
      this.revision++;
    };
  }
}
