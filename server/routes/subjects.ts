import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

export async function subjectsRoutes(app: Express) { 
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
            "/api/subjects",
            isAuthenticated,
            async (req: Request, res: Response) => {
              try {
                const subjects = await storage.getAllSubjects();
                res.json(subjects);
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

           app.post("/api/admin/subjects", async (req: Request, res: Response) => {
              try {
                const { name } = req.body;
                const [newGroup] = await storage.createSubject({
                  name,
                });
          
                res.status(201).json(newGroup);
              } catch (err) {
                console.error("Ошибка создания предмета:", err);
                res.status(500).json({ message: "Ошибка сервера при создании предмета" });
              }
            });

            app.patch(
                "/api/admin/subjects/:id",
                isAuthenticated,
                hasRole(["admin"]),
                async (req, res, next) => {
                  try {
                    const subjectId = parseInt(req.params.id);
                    const { name } = req.body;
            
                    const subjectData = {
                      name,
                    };
                    const updatedSubject = await storage.updateSubject(
                      subjectId,
                      subjectData
                    );
            
                    if (!updatedSubject) {
                      return res.status(404).json({ message: "Subject not found" });
                    }
                    res.json(updatedSubject);
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

              app.delete(
                  "/api/admin/subjects/:id",
                  isAuthenticated,
                  hasRole(["admin"]),
                  async (req: Request, res: Response) => {
                    try {
                      const userId = parseInt(req.params.id);
              
                      await storage.deleteSubject(userId);
              
                      res.status(200).json({ message: "Предмет успешно удален" });
                    } catch (err) {
                      console.error("Ошибка удаления предмета:", err);
                      res
                        .status(500)
                        .json({ message: "Ошибка сервера при удалении предмета" });
                    }
                  }
                );
              
}