import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (combined for all roles)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "student", "teacher", "admin"
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  groupId: integer("group_id"),
  departmentId: integer("department_id"),
});

// User Groups (student groups)
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id"),
});

// Departments (for teachers)
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id"),
});

// Faculties
export const faculties = pgTable("faculties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Subjects
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Classes/Lectures
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  groupId: integer("group_id").notNull(),
  classroom: text("classroom").notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  qrCode: text("qr_code"),
  isActive: boolean("is_active").default(false),
});

// Attendance Records
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  studentId: integer("student_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull(), // "present", "late", "absent"
});

// Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  period: text("period").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  format: text("format").notNull(),
  data: json("data"),
});

// Schema for inserting a new user
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Schema for inserting a new group
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true });

// Schema for inserting a new department
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });

// Schema for inserting a new faculty
export const insertFacultySchema = createInsertSchema(faculties).omit({ id: true });

// Schema for inserting a new subject
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true });

// Schema for inserting a new class
export const insertClassSchema = createInsertSchema(classes).omit({ id: true });

// Schema for inserting a new attendance record
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({ id: true });

// Schema for inserting a new report
export const insertReportSchema = createInsertSchema(reports).omit({ id: true });

// Types for DB operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertFaculty = z.infer<typeof insertFacultySchema>;
export type Faculty = typeof faculties.$inferSelect;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Authentication types
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password1: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password1: z.string().min(6),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  middleName: z.string().optional(),
  groupId: z.number(),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
