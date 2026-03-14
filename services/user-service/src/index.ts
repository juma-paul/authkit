import { config } from "./config/env";
import { connectDatabase } from "./config/database";

import express from "express";

const app = express();

app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "user-service",
  });
});

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
