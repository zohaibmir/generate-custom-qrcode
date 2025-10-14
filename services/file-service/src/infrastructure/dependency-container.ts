import { IDependencyContainer } from '../interfaces';

export class DependencyContainer implements IDependencyContainer {
  private dependencies = new Map<string, any>();

  register<T>(token: string, instance: T | (() => T)): void {
    if (typeof instance === 'function') {
      this.dependencies.set(token, instance);
    } else {
      this.dependencies.set(token, () => instance);
    }
  }

  resolve<T>(token: string): T {
    const factory = this.dependencies.get(token);
    if (!factory) {
      throw new Error(`Dependency '${token}' not found`);
    }
    
    if (typeof factory === 'function') {
      return factory();
    }
    
    return factory;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.dependencies.keys());
  }
}