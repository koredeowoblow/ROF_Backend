import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { Logger } from '../utils/logger.js';

/**
 * Class-Based MongoDB Connection Manager (SOLID - SRP & DIP)
 * Manages Mongoose connection lifecycle, health status, and graceful shutdown.
 */
export class MongoDatabase {
  constructor(uri = config.mongodb.uri, options = config.mongodb.options) {
    this.uri = uri;
    this.options = options;
    this.logger = new Logger('MongoDatabase');
    this.#registerEvents();
  }

  async connect() {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    try {
      await mongoose.connect(this.uri, this.options);
      this.logger.info('Connected to MongoDB successfully', {
        host: mongoose.connection.host,
        dbName: mongoose.connection.name,
      });
      return mongoose.connection;
    } catch (error) {
      this.logger.error('MongoDB initial connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.logger.info('Disconnected from MongoDB cleanly');
    }
  }

  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return {
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState] || 'unknown',
      dbName: mongoose.connection.name || null,
    };
  }

  #registerEvents() {
    mongoose.connection.on('error', (err) => {
      this.logger.error('MongoDB runtime connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
  }
}

export const mongoDatabase = new MongoDatabase();

