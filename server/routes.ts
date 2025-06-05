import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { attendanceRecordsRoutes } from "./routes/attendanceRecords";
import { classesRoutes } from "./routes/classes";
import { groupsRoutes } from "./routes/groups";
import { reportsRoutes } from "./routes/reports";
import { facultiessRoutes } from "./routes/faculties";
import { usersRoutes } from "./routes/users";
import { departmentsRoutes } from "./routes/departments";
import { subjectsRoutes } from "./routes/subjects";
declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize session middleware
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "attendance-tracking-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  attendanceRecordsRoutes(app);
  classesRoutes(app);
  groupsRoutes(app)
  reportsRoutes(app);
  facultiessRoutes(app);
  usersRoutes(app);
  departmentsRoutes(app);
  subjectsRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
