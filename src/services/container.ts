/**
 * Service Container
 * Simple dependency injection container for managing service instances
 */

export class ServiceContainer {
  private services = new Map<string, any>();

  /**
   * Register a service instance
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }
    return service;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
  }
}

// Global container instance
export const container = new ServiceContainer();
