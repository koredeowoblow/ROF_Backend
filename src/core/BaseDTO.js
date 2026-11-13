/**
 * Base Data Transfer Object (SOLID - SRP, OCP, ISP & DRY)
 * Prevents accidental data leakage and mass-assignment vulnerabilities.
 */
export class BaseDTO {
  /**
   * Pick only whitelisted keys from a raw input object (DRY helper)
   */
  static pick(source, allowedKeys = []) {
    if (!source || typeof source !== 'object') return {};
    const result = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Transform a single entity into a DTO plain object
   */
  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const dtoInstance = new this(entity, options);
    return dtoInstance.toJSON();
  }

  /**
   * Transform an array of entities into an array of DTO plain objects
   */
  static fromEntities(entities = [], options = {}) {
    if (!Array.isArray(entities)) return [];
    return entities.map((entity) => this.fromEntity(entity, options));
  }

  /**
   * Default serialization returns all own enumerable properties
   */
  toJSON() {
    return { ...this };
  }
}

