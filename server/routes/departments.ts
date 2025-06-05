import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";


export async function departmentsRoutes(app: Express) { 
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
            "/api/departments",
            isAuthenticated,
            async (req: Request, res: Response) => {
              try {
                const departments = await storage.getAllDepartments();
                res.json(departments);
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

          app.post("/api/admin/departments", async (req: Request, res: Response) => {
              try {
                const { name, facultyId } = req.body; // Используем деструктуризацию
          
                const [newGroup] = await storage.createDepartment({
                  name,
                  facultyId,
                });
          
                res.status(201).json(newGroup);
              } catch (err) {
                console.error("Ошибка регистрации:", err);
                res.status(500).json({ message: "Ошибка сервера при регистрации" });
              }
            });

            app.delete(
                "/api/admin/departments/:id",
                isAuthenticated,
                hasRole(["admin"]),
                async (req: Request, res: Response) => {
                  try {
                    const userId = parseInt(req.params.id);
            
                    await storage.deleteDepartment(userId);
            
                    res.status(200).json({ message: "Кафедра успешно удалена" });
                  } catch (err) {
                    console.error("Ошибка удаления кафедры:", err);
                    res
                      .status(500)
                      .json({ message: "Ошибка сервера при удалении кафедры" });
                  }
                }
              );

               app.patch(
                  "/api/admin/departments/:id",
                  isAuthenticated,
                  hasRole(["admin"]),
                  async (req, res, next) => {
                    try {
                      const departmentId = parseInt(req.params.id);
                      const { name, facultyId } = req.body;
              
                      const departmentData = {
                        name,
                        facultyId,
                      };
              
                      const updatedDepartment = await storage.updateDepartment(
                        departmentId,
                        departmentData
                      );
              
                      if (!updatedDepartment) {
                        return res.status(404).json({ message: "Department not found" });
                      }
                      res.json(updatedDepartment);
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