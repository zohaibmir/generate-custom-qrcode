import { IDependencyContainer } from '../interfaces';

export class DependencyContainer implements IDependencyContainer {
  private dependencies = new Map<string, any>();

  register<T>(token: string, instance: T): void {
    this.dependencies.set(token, instance);
  }

  resolve<T>(token: string): T {
    const instance = this.dependencies.get(token);
    if (!instance) {
      throw new Error(`Dependency '${token}' not found. Make sure it's registered.`);
    }
    return instance as T;
  }

  has(token: string): boolean {
    return this.dependencies.has(token);
  }

  clear(): void {
    this.dependencies.clear();
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.dependencies.keys());
  }
}