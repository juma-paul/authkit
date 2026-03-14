import express from "express";

import { config } from "./config/env";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/response";
import authRouter from "./routes/auth.routes";

const app = express();

app.use(express.json());
app.use('/api/v1/auth', authRouter)

// Health check route
app.get("/health", (req, res) => {
  sendSuccess(res, {
    status: "healthy",
    service: "user-service",
    environment: config.nodeEnv,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`🚀 User service running on port ${config.port}`);
    console.log(`📖 Health check: http://localhost:${config.port}/health`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
  });
};

start();
