import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
export async function groupsRoutes(app: Express) { 
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

          app.get("/api/groups", async (req: Request, res: Response) => {
            try {
              const groups = await storage.getAllGroups();
              res.json(groups);
            } catch (err) {
              res.status(500).json({ message: "Internal server error" });
            }
          });

           app.post("/api/admin/groups", async (req: Request, res: Response) => {
              try {
                const { name, facultyId } = req.body; // Используем деструктуризацию
          
                const [newGroup] = await storage.createGroup({
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
              "/api/admin/groups/:id",
              isAuthenticated,
              hasRole(["admin"]),
              async (req: Request, res: Response) => {
                try {
                  const userId = parseInt(req.params.id);
          
                  await storage.deleteGroup(userId);
          
                  res.status(200).json({ message: "Пользователь успешно удален" });
                } catch (err) {
                  console.error("Ошибка удаления пользователя:", err);
                  res
                    .status(500)
                    .json({ message: "Ошибка сервера при удалении пользователя" });
                }
              }
            );

             app.patch(
                "/api/admin/groups/:id",
                isAuthenticated,
                hasRole(["admin"]),
                async (req, res, next) => {
                  try {
                    const groupId = parseInt(req.params.id);
                    const { name, facultyId } = req.body;
            
                    const groupData = {
                      name,
                      facultyId,
                    };
                    const updatedGroup = await storage.updateGroup(groupId, groupData);
            
                    if (!updatedGroup) {
                      return res.status(404).json({ message: "Group not found" });
                    }
                    res.json(updatedGroup);
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