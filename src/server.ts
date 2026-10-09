import app from "./app.js";
import prisma from "./config/database.js";
import { env } from "./config/env.js";

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;


    console.log("MySQL database connected successfully");

    const port = Number(process.env.PORT) || env.PORT;

    app.listen(port, "0.0.0.0", () => {
      console.log(`LKS LMS Backend running on port ${port} `);
    });


  } catch (error) {
    console.error("Failed to start server:", error);


    await prisma.$disconnect();
    process.exit(1);

  }
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received.Shutting down gracefully...`);

  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
