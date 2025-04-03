type WalletEventType = 'wallet-removed' | 'wallet-added' | 'wallet-updated';

type EventCallback = (data?: unknown) => void;

class WalletEventEmitter {
  private listeners: Record<WalletEventType, EventCallback[]> = {
    'wallet-removed': [],
    'wallet-added': [],
    'wallet-updated': [],
  };

  public subscribe(event: WalletEventType, callback: EventCallback): () => void {
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  public emit(event: WalletEventType, data?: unknown): void {
    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in wallet event listener for ${event}:`, error);
      }
    });
  }
}

export const walletEvents = new WalletEventEmitter();
