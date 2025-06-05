import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";


export async function attendanceRecordsRoutes(app: Express) { 
      const hasRole = (roles: string[]) => {
        return (req: Request, res: Response, next: Function) => {
          if (req.session.userId && roles.includes(req.session.role || "")) {
            next();
          } else {
            res.status(403).json({ message: "Forbidden" });
          }
        };
      };
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
        if (req.session.userId) {
          next();
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      };
       app.get(
          "/api/admin/attendanceRecords",
          isAuthenticated,
          hasRole(["admin", "teacher"]),
          async (req: Request, res: Response) => {
            try {
              const classes = await storage.getAttendanceRecords();
              res.json(classes);
            } catch (err) {
              res.status(500).json({ message: "Internal server error" });
            }
          }
        );

        app.get(
            "/api/teacher/classes/:id/attendance",
            isAuthenticated,
            hasRole(["teacher", "admin"]),
            async (req: Request, res: Response) => {
              try {
                const classId = parseInt(req.params.id);
                const classItem = await storage.getClass(classId);
        
                if (!classItem) {
                  return res.status(404).json({ message: "Class not found" });
                }
        
                // Check if the teacher is authorized for this class
                if (
                  classItem.teacherId !== req.session.userId &&
                  req.session.role !== "admin"
                ) {
                  return res.status(403).json({ message: "Unauthorized" });
                }
        
                const attendanceRecords = await storage.getAttendanceRecordsByClass(
                  classId
                );
                res.json(attendanceRecords);
              } catch (err) {
                res.status(500).json({ message: "Internal server error" });
              }
            }
          );

          app.get(
              "/api/student/attendance",
              isAuthenticated,
              hasRole(["student"]),
              async (req: Request, res: Response) => {
                try {
                  const attendanceRecords = await storage.getAttendanceRecordsByStudent(
                    req.session.userId!
                  );
                  res.json(attendanceRecords);
                } catch (err) {
                  res.status(500).json({ message: "Internal server error" });
                }
              }
            );
          
            app.post(
                "/api/student/attendance",
                isAuthenticated,
                hasRole(["student"]),
                async (req: Request, res: Response) => {
                  try {
                    const { qrCode } = req.body;
            
                    if (!qrCode) {
                      return res.status(400).json({ message: "QR code is required" });
                    }
            
                    // Find the class with this QR code
                    const classItem = await storage.getActiveClassByQrCode(qrCode);
            
                    if (!classItem) {
                      return res
                        .status(404)
                        .json({ message: "Invalid or expired QR code" });
                    }
            
                    // Check if the student belongs to the class's group
                    const student = await storage.getUserById(req.session.userId!);
                    if (!student || student.groupId !== classItem.groupId) {
                      return res
                        .status(403)
                        .json({ message: "You are not enrolled in this class" });
                    }
            
                    // Check if attendance already recorded
                    const existingRecords = await storage.getAttendanceRecordsByClass(
                      classItem.id
                    );
                    const alreadyRecorded = existingRecords?.some(
                      (r) => r.studentId === req.session.userId
                    );
            
                    if (alreadyRecorded) {
                      return res
                        .status(400)
                        .json({ message: "Attendance already recorded" });
                    }
            
                    // Determine if the student is late
                    const now = new Date();
                    const lateThreshold = new Date(classItem.startTime);
                    lateThreshold.setMinutes(lateThreshold.getMinutes() + 15); // 15 min grace period
            
                    const status = now > lateThreshold ? "late" : "present";
            
                    // Record attendance
                    const attendanceData = {
                      classId: classItem.id,
                      studentId: req.session.userId!,
                      timestamp: now,
                      status,
                    };
            
                    const record = await storage.createAttendanceRecord(attendanceData);
                    res.status(201).json(record);
                  } catch (err) {
                    if (err instanceof z.ZodError) {
                      res.status(400).json({ message: err.errors });
                    } else {
                      res.status(500).json({ message: "Internal server error" });
                    }
                  }
                }
              );

            app.get(
                "/api/admin/attendance",
                isAuthenticated,
                hasRole(["admin"]),
                async (req: Request, res: Response) => {
                  try {
                    // Since we don't have a direct method to get all records, we'll combine class-specific ones
                    const classes = await storage.getAllClasses();
                    let allRecords: any[] = [];
            
                    // Fetch attendance records for each class
                    if (classes)
                      for (const cls of classes) {
                        const records = await storage.getAttendanceRecordsByClass(cls.id);
                        allRecords = [...allRecords, ...records];
                      }
            
                    res.json(allRecords);
                  } catch (err) {
                    res.status(500).json({ message: "Internal server error" });
                  }
                }
              );  
            
}