export interface BiometricState {
  isLocked: boolean;
  lastUnlockedAt: number | null;
}

export class BiometricAuthService {
  private static locked = false;
  private static listeners: Array<(state: BiometricState) => void> = [];

  public static isLocked(): boolean {
    return this.locked;
  }

  public static subscribe(listener: (state: BiometricState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public static triggerChallenge(): boolean {
    this.locked = false;
    this.notify();
    return true;
  }

  public static simulateBackgroundResume(seconds = 15): void {
    this.locked = true;
    this.notify();
  }

  private static notify() {
    const state: BiometricState = {
      isLocked: this.locked,
      lastUnlockedAt: this.locked ? null : Date.now(),
    };
    this.listeners.forEach((l) => l(state));
  }
}
