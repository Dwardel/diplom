import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

export async function classesRoutes(app: Express) { 
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
          "/api/teacher/classes",
          isAuthenticated,
          hasRole(["teacher", "admin"]),
          async (req: Request, res: Response) => {
            try {
              const classes = await storage.getClassesByTeacher(req.session.userId!);
              res.json(classes);
            } catch (err) {
              res.status(500).json({ message: "Internal server error" });
            }
          }
        );

         app.post(
            "/api/teacher/classes",
            isAuthenticated,
            hasRole(["teacher", "admin"]),
            async (req: Request, res: Response) => {
              try {
                const newClass = {
                  ...req.body,
        
                  teacherId: req.session.userId!,
                  qrCode: null,
                  isActive: true,
                };
        
                const classItem = await storage.createClass(newClass);
                res.status(201).json(classItem);
              } catch (err) {
                if (err instanceof z.ZodError) {
                  res.status(400).json({ message: err.errors });
                } else {
                  res.status(500).json({ message: "Internal server error" });
                }
              }
            }
          );

           app.put(
              "/api/teacher/classes/:id/end",
              isAuthenticated,
              hasRole(["teacher"]),
              async (req: Request, res: Response) => {
                try {
                  const classId = parseInt(req.params.id);
                  const classItem = await storage.getClass(classId);
          
                  if (!classItem) {
                    return res.status(404).json({ message: "Class not found" });
                  }
          
                  if (
                    classItem.teacherId !== req.session.userId &&
                    req.session.role !== "teacher"
                  ) {
                    return res.status(403).json({ message: "Unauthorized" });
                  }
          
                  const updatedClass = await storage.updateClass(classId, {
                    isActive: false,
                    qrCode: null,
                  });
          
                  res.json(updatedClass);
                } catch (err) {
                  res.status(500).json({ message: "Internal server error" });
                }
              }
            );
          
            app.post(
              "/api/teacher/classes/:id/miss",
              isAuthenticated,
              hasRole(["teacher"]),
              async (req: Request, res: Response) => {
                try {
                  const classId = parseInt(req.params.id);
          
                  const cls = await storage.getClass(classId);
                  if (!cls) {
                    return res.status(404).json({ message: "Class not found" });
                  }
          
                  const students = await storage.getUsersByGroupId(cls.groupId);
                  if (!students || students.length === 0) {
                    return res.status(404).json({ message: "No students in group" });
                  }
          
                  // Получить всех студентов из группы
                  const existingRecords = await storage.getAttendanceRecordsByClass(
                    classId
                  );
                  const existingStudentIds = new Set(
                    existingRecords.map((r) => r.studentId)
                  );
          
                  // Отфильтровать студентов, у которых ещё нет записи
                  const missingStudents = students.filter(
                    (student) => !existingStudentIds.has(student.id)
                  );
          
                  if (missingStudents.length === 0) {
                    return res
                      .status(200)
                      .json({ message: "All students already marked" });
                  }
          
                  for (const student of missingStudents) {
                    await storage.createAttendanceRecord({
                      classId: classId,
                      studentId: student.id,
                      timestamp: new Date(),
                      status: "absent",
                    });
                  }
          
                  res
                    .status(201)
                    .json({ message: "Attendance records created successfully" });
                } catch (err) {
                  console.error("Error in /classes/:id/miss:", err);
                  res.status(500).json({ message: "Internal server error" });
                }
              }
            );

            app.get(
                "/api/student/classes",
                isAuthenticated,
                hasRole(["student"]),
                async (req: Request, res: Response) => {
                  try {
                    const student = await storage.getUserById(req.session.userId!);
                    if (!student || !student.groupId) {
                      return res
                        .status(404)
                        .json({ message: "Student or group not found" });
                    }
            
                    const classes = await storage.getClassesByGroup(student.groupId);
                    res.json(classes);
                  } catch (err) {
                    res.status(500).json({ message: "Internal server error" });
                  }
                }
              );
            app.get(
                "/api/admin/classes",
                isAuthenticated,
                hasRole(["admin"]),
                async (req: Request, res: Response) => {
                  try {
                    const classes = await storage.getAllClasses();
                    res.json(classes);
                  } catch (err) {
                    res.status(500).json({ message: "Internal server error" });
                  }
                }
              );

}