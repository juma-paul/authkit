import app from "./app";
import { config } from "./config/env";
import { connectDatabase } from "./config/database";

const start = async () => {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`🚀 User service running on port ${config.port}`);
    console.log(`📖 Health check: http://localhost:${config.port}/health`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
  });
};

start();
