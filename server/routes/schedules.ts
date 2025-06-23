import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
export async function schedulesRoutes(app: Express) { 
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
        if (req.session.userId) {
          next();
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      };
        const hasRole = (roles: string[]) => {
          return (req: Request, res: Response, next: Function) => {
            if (req.session.userId && roles.includes(req.session.role || "")) {
              next();
            } else {
              res.status(403).json({ message: "Forbidden" });
            }
          };
        };

         app.get(
            "/api/admin/schedules",
            isAuthenticated,
            hasRole(["admin"]),
            async (req: Request, res: Response) => {
              try {
                const schedules = await storage.getAllSchedules();
                res.json(schedules);
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

            app.get(
            "/api/schedules",
            isAuthenticated,
            hasRole(["teacher", "student"]),
            async (req: Request, res: Response) => {
              try {
                const id = req.session.userId!
                const user = await storage.getUserById(id);
                
                if (user?.role === "teacher") {
                  const schedules = await storage.getTeacherSchedules(id);
                res.json(schedules);
                } else {
                const schedules = await storage.getStudentSchedules(user?.groupId!);
                res.json(schedules);
                }
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

           app.post("/api/admin/schedules", async (req: Request, res: Response) => {
              try {
                const { groupId, subjectId, teacherId, dayOfWeek, startTime, endTime, classroom,  weekType } = req.body;
                const [newSchedule] = await storage.createSchedule({
                  groupId,
                  subjectId,
                  teacherId,
                  dayOfWeek,
                  startTime,
                  endTime,
                  classroom,
                  weekType
                });
                console.log(newSchedule);
                res.status(201).json(newSchedule);
              } catch (err) {
                console.error("Ошибка создания факультета:", err);
                res
                  .status(500)
                  .json({ message: "Ошибка сервера при создании факультета" });
              }
            });

            app.delete(
                "/api/admin/schedules/:id",
                isAuthenticated,
                hasRole(["admin"]),
                async (req: Request, res: Response) => {
                  try {
                    const userId = parseInt(req.params.id);
            
                    await storage.deleteSchedule(userId);
            
                    res.status(200).json({ message: "Пользователь успешно удален" });
                  } catch (err) {
                    console.error("Ошибка удаления факультета:", err);
                    res
                      .status(500)
                      .json({ message: "Ошибка сервера при удалении факультета" });
                  }
                }
              );
            
               app.patch(
                  "/api/admin/schedules/:id",
                  isAuthenticated,
                  hasRole(["admin"]),
                  async (req, res, next) => {
                    try {
                      const scheduleId = parseInt(req.params.id);
                      const { groupId, subjectId, teacherId, dayOfWeek, startTime, endTime, classroom,  weekType } = req.body;
                
                      const facultyData = {
                        groupId,
                        subjectId,
                        teacherId,
                        dayOfWeek,
                        startTime,
                        endTime,
                        classroom,
                        weekType
                      };
                      const updatedFaculty = await storage.updateSchedule(
                        scheduleId,
                        facultyData
                      );
              
                      if (!updatedFaculty) {
                        return res.status(404).json({ message: "Faculty not found" });
                      }
                      res.json(updatedFaculty);
                    } catch (error) {
                      if (error instanceof z.ZodError) {
                        return res.status(400).json({
                          message: "Validation error",
                          errors: error.errors,
                        });
                      }
                      next(error);
                    }
                  }
                );
}