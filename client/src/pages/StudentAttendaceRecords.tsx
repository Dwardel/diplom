import { useState, useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  useMutation,
  useQueries,
} from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  formatDateTime
} from "@/lib/utils";
import {
  ArrowLeft,

} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { AttendanceRecord, Class, Group, Subject } from "@shared/schema";


interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: string;
  groupId?: number;
}

export default function StudentRecords() {
  const [, setLocation] = useLocation();

  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/student/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery<
    AttendanceRecord[]
  >({
    queryKey: ["/api/student/attendance/"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });


  const { data: teachers, isLoading: teachersLoading } = useQuery<User[]>({
    queryKey: ["/api/student/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isLoading =
    classesLoading || subjectsLoading || classesLoading || teachersLoading || attendanceLoading;
   const getRecentAttendance = () => {
      if (!attendanceRecords || !classes || !subjects || !teachers) return [];
  
      const teachersMap = teachers.reduce(
        (acc: Record<number, User>, teacher: User) => {
          if (teacher.role === "teacher") {
            acc[teacher.id] = teacher;
          }
          return acc;
        },
        {}
      );
  
      const subjectsMap = subjects.reduce(
        (acc: Record<number, Subject>, subject: Subject) => {
          acc[subject.id] = subject;
          return acc;
        },
        {}
      );
  
      const classesMap = classes.reduce(
        (acc: Record<number, Class>, cls: Class) => {
          acc[cls.id] = cls;
          return acc;
        },
        {}
      );
  
      return attendanceRecords
        .sort((a: AttendanceRecord, b: AttendanceRecord) => {
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        })
        .map((record: AttendanceRecord) => {
          const classInfo = classesMap[record.classId];
          const subject = classInfo ? subjectsMap[classInfo.subjectId] : null;
          const teacher = classInfo ? teachersMap[classInfo.teacherId] : null;
  
          return {
            id: record.id,
            date: formatDateTime(record.timestamp),
            subject: subject ? subject.name : "Неизвестный предмет",
            teacher: teacher
              ? `${teacher.lastName} ${teacher.firstName.charAt(0)}.${
                  teacher.middleName ? teacher.middleName.charAt(0) + "." : ""
                }`
              : "Неизвестный преподаватель",
            status: record.status,
          };
        });
    };
  
 const recentAttendance = getRecentAttendance();

  return (
    <div className="mb-6">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setLocation("/student")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {/* Recent Classes */}
          <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-xl font-medium text-gray-800 mb-4">
            Недавние Занятия
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Дата
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Предмет
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Преподаватель
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      Загрузка...
                    </td>
                  </tr>
                ) : recentAttendance.length > 0 ? (
                  recentAttendance.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.teacher}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`status-${item.status}`}
                        >
                          {item.status === "present"
                            ? "Присутствовал"
                            : item.status === "late"
                            ? "Опоздание"
                            : "Отсутствовал"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      Нет данных о посещениях
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-4">
            <Button variant="link" className="text-primary">
              Показать все
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
