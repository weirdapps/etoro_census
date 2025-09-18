/**
 * Storage service for handling large census data
 * Uses IndexedDB for large datasets that exceed sessionStorage quota
 */

class StorageService {
  private dbName = 'etoroV2Census';
  private storeName = 'censusData';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async setItem(key: string, value: unknown): Promise<void> {
    // Try sessionStorage first (faster for small data)
    try {
      const stringValue = JSON.stringify(value);
      if (stringValue.length < 4 * 1024 * 1024) { // Less than 4MB
        sessionStorage.setItem(key, stringValue);
        return;
      }
    } catch {
      console.log('SessionStorage failed, using IndexedDB');
    }

    // Fall back to IndexedDB for large data
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getItem(key: string): Promise<unknown> {
    // Try sessionStorage first
    try {
      const value = sessionStorage.getItem(key);
      if (value) {
        return JSON.parse(value);
      }
    } catch {
      console.log('SessionStorage read failed, trying IndexedDB');
    }

    // Try IndexedDB
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    // Remove from both storages
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }

    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storageService = new StorageService();