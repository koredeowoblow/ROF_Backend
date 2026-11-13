/**
 * Structured Application Logger (Class-Based, SRP)
 */
export class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  child(subContext) {
    return new Logger(`${this.context}:${subContext}`);
  }

  info(message, meta = {}) {
    this.#write('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.#write('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.#write('ERROR', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.#write('DEBUG', message, meta);
    }
  }

  #write(level, message, meta) {
    if (process.env.NODE_ENV === 'test' && level !== 'ERROR') return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(Object.keys(meta).length > 0 ? { meta } : {}),
    };
    const stream = level === 'ERROR' ? console.error : console.log;
    stream(JSON.stringify(entry));
  }
}

export const logger = new Logger('ROF-Backend');

