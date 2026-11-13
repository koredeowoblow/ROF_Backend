import { createApp } from './app.js';
import { config } from './config/index.js';
import { mongoDatabase } from './database/MongoDatabase.js';
import { DatabaseSeeder } from './database/seed.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    // 1. Connect to MongoDB and ensure initial seed dataset is present
    await mongoDatabase.connect();
    await DatabaseSeeder.seed({ forceReset: false });

    // 2. Start HTTP Server
    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`ROF RAGE Backend listening on http://localhost:${config.port}/api/v1`, {
        env: config.env,
        port: config.port,
      });
    });

    // 3. Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Closing HTTP server and MongoDB connection...`);
      server.close(async () => {
        await mongoDatabase.disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to bootstrap ROF RAGE server', { error: error.message });
    process.exit(1);
  }
}

bootstrap();

