import { IDependencyContainer } from '../interfaces';

export class DependencyContainer implements IDependencyContainer {
  private dependencies = new Map<string, any>();

  register<T>(token: string, instance: T): void {
    this.dependencies.set(token, instance);
  }

  resolve<T>(token: string): T {
    const dependency = this.dependencies.get(token);
    if (!dependency) {
      throw new Error(`Dependency not found: ${token}. Available dependencies: ${Array.from(this.dependencies.keys()).join(', ')}`);
    }
    return dependency;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.dependencies.keys());
  }
}