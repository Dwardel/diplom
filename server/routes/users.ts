import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function usersRoutes(app: Express) { 

    
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

app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      console.log(req.body);
      // Создаем пользователя с ролью "student" по умолчанию
      const {
        username,
        password1,
        role,
        firstName,
        lastName,
        middleName,
        groupId,
        departmentId,
      } = req.body;
      // Проверяем, существует ли пользователь с таким именем
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким именем уже существует" });
      }

      // Создаем нового пользователя
      const [newUser] = await storage.createUser({
        username,
        password: password1,
        role: role, // По умолчанию все новые пользователи - студенты
        firstName,
        lastName,
        middleName: middleName || null,
        groupId: groupId || null,
        departmentId: departmentId || null,
      });

      // Удаляем пароль из ответа
      const { password, ...userWithoutPassword } = newUser;

      console.log("Создан новый пользователь:", username);
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      res.status(500).json({ message: "Ошибка сервера при регистрации" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      console.log("Login attempt received for:", req.body.username);
      const credentials = loginSchema.parse(req.body);
      console.log(credentials);
      // Обычный путь через базу данных
      const user = await storage.getUserByUsername(credentials.username);

      if (!user) {
        console.log("User not found:", credentials.username);
        return res
          .status(401)
          .json({ message: "Неверное имя пользователя или пароль" });
      }

      // Простая проверка паролей для демо-версии
      const passwordMatch = await bcrypt.compare(
        credentials.password1,
        user.password
      );

      if (!passwordMatch) {
        console.log("Invalid password for user:", credentials.username);
        return res
          .status(401)
          .json({ message: "Неверное имя пользователя или пароль" });
      }

      console.log("Authentication successful for:", credentials.username);

      // Set session data
      req.session.userId = user.id;
      req.session.role = user.role;

      // Return user info without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors });
      } else {
        res
          .status(401)
          .json({ message: "Неверное имя пользователя или пароль" });
      }
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get(
    "/api/auth/me",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserById(req.session.userId!);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return user info without password
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

   app.get(
      "/api/teacher/group/student/:id",
      isAuthenticated,
      hasRole(["teacher", "admin"]),
      async (req: Request, res: Response) => {
        try {
          const id = parseInt(req.params.id);
          const classes = await storage.getUsersByGroupId(id);
          res.json(classes);
        } catch (err) {
          res.status(500).json({ message: "Internal server error" });
        }
      }
    );

    app.get(
        "/api/admin/users",
        isAuthenticated,
        hasRole(["teacher", "admin"]),
        async (req: Request, res: Response) => {
          try {
            const users = await storage.getAllUsers();
            // Remove passwords from the response
            const sanitizedUsers = users?.map((user) => {
              const { password, ...userWithoutPassword } = user;
              return userWithoutPassword;
            });
            res.json(sanitizedUsers);
          } catch (err) {
            res.status(500).json({ message: "Internal server error" });
          }
        }
      );

       app.get(
          "/api/student/users",
          isAuthenticated,
          async (req: Request, res: Response) => {
            try {
              const users = await storage.getTeachers();
              // Remove passwords from the response
              const sanitizedUsers = users?.map((user) => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
              });
              res.json(sanitizedUsers);
            } catch (err) {
              res.status(500).json({ message: "Internal server error" });
            }
          }
        );

        app.get(
            "/api/admin/users/:id",
            isAuthenticated,
            hasRole(["admin"]),
            async (req: Request, res: Response) => {
              try {
                const userId = parseInt(req.params.id);
        
                // Получаем пользователя
                const user = await storage.getUserById(userId);
                if (!user) {
                  return res.status(404).json({ message: "Пользователь не найден" });
                }
        
                // Удаляем пароль из ответа
                const { password, ...userWithoutPassword } = user;
        
                res.json(userWithoutPassword);
              } catch (err) {
                console.error("Ошибка получения пользователя:", err);
                res.status(500).json({
                  message: "Ошибка сервера при получении данных пользователя",
                });
              }
            }
          );

           app.put(
              "/api/admin/users/:id",
              isAuthenticated,
              hasRole(["admin"]),
              async (req: Request, res: Response) => {
                try {
                  const userId = parseInt(req.params.id);
                  const {
                    username,
                    password,
                    role,
                    firstName,
                    lastName,
                    middleName,
                    groupId,
                    departmentId,
                  } = req.body;
          
                  // Проверяем, существует ли пользователь
                  const user = await storage.getUserById(userId);
                  if (!user) {
                    return res.status(404).json({ message: "Пользователь не найден" });
                  }
          
                  // Если изменился username, проверяем, что он не занят
                  if (username !== user.username) {
                    const existingUser = await storage.getUserByUsername(username);
                    if (existingUser && existingUser.id !== userId) {
                      return res
                        .status(400)
                        .json({ message: "Пользователь с таким именем уже существует" });
                    }
                  }
          
                  // Обновляем пользователя
                  const updatedUser = await storage.updateUser(userId, {
                    username,
                    ...(password ? { password } : {}), // Обновляем пароль только если он был предоставлен
                    role,
                    firstName,
                    lastName,
                    middleName: middleName || null,
                    groupId: groupId || null,
                    departmentId: departmentId || null,
                  });
          
                  if (updatedUser) {
                    const { password: _, ...userWithoutPassword } = updatedUser;
          
                    console.log(
                      `Обновлен пользователь администратором: ${username}, ID: ${userId}`
                    );
                    res.json(userWithoutPassword);
                  }
                } catch (err) {
                  console.error("Ошибка обновления пользователя:", err);
                  res
                    .status(500)
                    .json({ message: "Ошибка сервера при обновлении пользователя" });
                }
              }
            );

            app.put(
                "/api/user/change",
                isAuthenticated,
                async (req: Request, res: Response) => {
                  try {
                    const {
                      username,
                      password,
                      role,
                      firstName,
                      lastName,
                      middleName,
                      groupId,
                      departmentId,
                    } = req.body;
            
                    // Проверяем, существует ли пользователь
                    if (!req.session.userId) {
                      return res.status(401).json({ message: "Unauthorized" });
                    }
                    const user = await storage.getUserById(req.session.userId);
                    if (!user) {
                      return res.status(404).json({ message: "Пользователь не найден" });
                    }
            
                    // Если изменился username, проверяем, что он не занят
                    if (username !== user.username) {
                      const existingUser = await storage.getUserByUsername(username);
                      if (existingUser && existingUser.id !== req.session.userId) {
                        return res
                          .status(400)
                          .json({ message: "Пользователь с таким именем уже существует" });
                      }
                    }
            
                    // Обновляем пользователя
                    const updatedUser = await storage.updateUser(req.session.userId, {
                      username,
                      ...(password ? { password } : {}), // Обновляем пароль только если он был предоставлен
                      role,
                      firstName,
                      lastName,
                      middleName: middleName || null,
                      groupId: groupId || null,
                      departmentId: departmentId || null,
                    });
            
                    if (updatedUser) {
                      const { password: _, ...userWithoutPassword } = updatedUser;
            
                      console.log(
                        `Обновлен пользователь администратором: ${username}, ID: ${req.session.userId}`
                      );
                      res.json(userWithoutPassword);
                    }
                  } catch (err) {
                    console.error("Ошибка обновления пользователя:", err);
                    res
                      .status(500)
                      .json({ message: "Ошибка сервера при обновлении пользователя" });
                  }
                }
              );

              app.delete(
                  "/api/admin/users/:id",
                  isAuthenticated,
                  hasRole(["admin"]),
                  async (req: Request, res: Response) => {
                    try {
                      const userId = parseInt(req.params.id);
              
                      // Проверяем, существует ли пользователь
                      const user = await storage.getUserById(userId);
                      if (!user) {
                        return res.status(404).json({ message: "Пользователь не найден" });
                      }
              
                      // Предотвращаем удаление текущего пользователя
                      if (userId === req.session.userId) {
                        return res
                          .status(400)
                          .json({ message: "Нельзя удалить текущего пользователя" });
                      }
              
                      // Удаляем пользователя
                      await storage.deleteUser(userId);
              
                      console.log(
                        `Пользователь удален администратором: ${user.username}, ID: ${userId}`
                      );
                      res.status(200).json({ message: "Пользователь успешно удален" });
                    } catch (err) {
                      console.error("Ошибка удаления пользователя:", err);
                      res
                        .status(500)
                        .json({ message: "Ошибка сервера при удалении пользователя" });
                    }
                  }
                );
}