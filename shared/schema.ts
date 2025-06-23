import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { start } from "repl";
import { z } from "zod";

// Faculties
export const faculties = pgTable("faculties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Departments (for teachers)
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id").references(() => faculties.id),
});

// User Groups (student groups)
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
});

// Users table (combined for all roles)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "student", "teacher", "admin"
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  groupId: integer("group_id").references(() => groups.id),
  departmentId: integer("department_id").references(() => departments.id),
});

// Subjects
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
});

// Classes/Lectures
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
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
  classId: integer("class_id").notNull().references(() => classes.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull(), // "present", "late", "absent"
});

// Schedules
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  teacherId: integer("user_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 (Monday-Sunday)
  classroom: text("classroom").notNull(),
  weekType: text("week_type").default("both"), // "odd", "even", "both"
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

// Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  period: text("period").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  format: text("format").notNull(),
  data: json("data"),
});

// Schema for inserting a new user
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Schema for inserting a new group
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true });

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });

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

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

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
