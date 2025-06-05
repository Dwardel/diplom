import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
export async function facultiessRoutes(app: Express) { 
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
            "/api/admin/faculties",
            isAuthenticated,
            async (req: Request, res: Response) => {
              try {
                const faculties = await storage.getAllFaculties();
                res.json(faculties);
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

           app.post("/api/admin/faculties", async (req: Request, res: Response) => {
              try {
                const { name } = req.body;
                const [newGroup] = await storage.createFaculty({
                  name,
                });
          
                res.status(201).json(newGroup);
              } catch (err) {
                console.error("Ошибка создания факультета:", err);
                res
                  .status(500)
                  .json({ message: "Ошибка сервера при создании факультета" });
              }
            });

            app.delete(
                "/api/admin/faculties/:id",
                isAuthenticated,
                hasRole(["admin"]),
                async (req: Request, res: Response) => {
                  try {
                    const userId = parseInt(req.params.id);
            
                    await storage.deleteFaculty(userId);
            
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
                  "/api/admin/faculties/:id",
                  isAuthenticated,
                  hasRole(["admin"]),
                  async (req, res, next) => {
                    try {
                      const facultyId = parseInt(req.params.id);
                      const { name } = req.body;
              
                      const facultyData = {
                        name,
                      };
                      const updatedFaculty = await storage.updateFaculty(
                        facultyId,
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