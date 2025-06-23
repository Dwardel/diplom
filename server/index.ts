import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDemoAccounts } from "./seed";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import {initializeScheduler} from './scheduler';
// Загрузка .env переменных
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Промежуточный логгер для API-запросов
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Подключение к базе данных
    const connection = postgres(process.env.DATABASE_URL!);
    const db = drizzle(connection);
    (globalThis as any).db = db; // делаем БД глобальной, если нужно в других местах

    // Создание демонстрационных аккаунтов
    await seedDemoAccounts();

    // Роуты API
    const server = await registerRoutes(app);
    initializeScheduler();
    // Обработка ошибок (после роутов)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(`[error] ${status}: ${message}`);
    });

    // Vite (в dev) или статика (в prod)
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`[server] Running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("[fatal] Failed to start server:", err);
    process.exit(1);
  }
})();
