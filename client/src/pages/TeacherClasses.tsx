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
  formatDateTime,
  getTimeRemaining,
  calculateAttendancePercentage,
} from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

export default function TeacherClasses() {
  const [, setLocation] = useLocation();

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/teacher/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch all students
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const queries =
    classes
      ?.sort(
        (a: Class, b: Class) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .map((classItem) => ({
        queryKey: [`/api/teacher/classes/${classItem.id}/attendance`],
        queryFn: async (): Promise<AttendanceRecord[]> => {
          const res = await fetch(
            `/api/teacher/classes/${classItem.id}/attendance`
          );
          if (!res.ok) throw new Error("Failed to fetch class attendance ");
          return res.json();
        },
      })) || [];
  const results = useQueries({ queries });

  // Calculate class attendance
  const getClassAttendance = (classId: number, index: number) => {
    if (!users || !classes) return { present: 0, total: 0, percentage: 0 };

    const classItem = classes.find((cls: Class) => cls.id === classId);
    if (!classItem) return { present: 0, total: 0, percentage: 0 };

    // Get all students in this group
    const studentsInGroup = users.filter(
      (user: User) =>
        user.role === "student" && user.groupId === classItem.groupId
    );

    const totalStudents = studentsInGroup.length;
    if (results[index].data === undefined) return null;
    const presentStudents = results ? results[index].data.length : 0;

    return {
      present: presentStudents,
      total: totalStudents,
      percentage: calculateAttendancePercentage(presentStudents, totalStudents),
    };
  };

  // Get recent classes
  const getRecentClasses = () => {
    if (!classes || !subjects || !groups) return [];

    return [...classes]
      .sort(
        (a: Class, b: Class) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .map((cls: Class, index: number) => {
        const subject = subjects.find((s: Subject) => s.id === cls.subjectId);
        const group = groups.find((g: Group) => g.id === cls.groupId);

        const attendanceStats = getClassAttendance(cls.id, index);

        return {
          id: cls.id,
          date: cls.date,
          subject: subject ? subject.name : "Неизвестный предмет",
          group: group ? group.name : "Неизвестная группа",
          attendance: attendanceStats,
        };
      });
  };

  const isLoading =
    classesLoading || subjectsLoading || groupsLoading || usersLoading;
  const recentClasses = getRecentClasses();
  // Get attendance stats for each subject-group combination
  const getAttendanceBySubject = () => {
    if (!classes || !subjects || !groups) return [];

    const subjectGroupMap = new Map();

    classes.forEach((cls: Class) => {
      const key = `${cls.subjectId}-${cls.groupId}`;
      if (!subjectGroupMap.has(key)) {
        subjectGroupMap.set(key, {
          subjectId: cls.subjectId,
          groupId: cls.groupId,
          classes: [],
        });
      }
      subjectGroupMap.get(key).classes.push(cls);
    });

    return Array.from(subjectGroupMap.values()).map((item) => {
      const subject = subjects.find((s: Subject) => s.id === item.subjectId);
      const group = groups.find((g: Group) => g.id === item.groupId);

      // Calculate average attendance (mock data for now)
      const attendancePercentage = Math.floor(Math.random() * 30) + 65; // Random between 65-95%

      return {
        id: `${item.subjectId}-${item.groupId}`,
        subject: subject ? subject.name : "Неизвестный предмет",
        group: group ? group.name : "Неизвестная группа",
        percentage: attendancePercentage,
      };
    });
  };

  const subjectAttendance = getAttendanceBySubject();

  return (
    <div className="mb-6">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setLocation("/teacher")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {/* Recent Classes */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-medium text-gray-800 mb-4">Занятия</h3>
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
                    Группа
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Посещаемость
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      Загрузка...
                    </td>
                  </tr>
                ) : recentClasses.length > 0 ? (
                  recentClasses.map((classItem) => {
                    if (classItem.attendance !== null)
                      return (
                        <tr key={classItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(classItem.date).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {classItem.subject}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {classItem.group}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="mr-2">
                                {classItem.attendance.present}/
                                {classItem.attendance.total}
                              </div>
                              <Progress
                                value={classItem.attendance.percentage}
                                className="w-24 h-2"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      Нет проведенных занятий
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-4"></div>
        </CardContent>
      </Card>
    </div>
  );
}
