import { useState, useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  useMutation,
  useQueries,
} from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  formatDateTime,
  getTimeRemaining,
  calculateAttendancePercentage,
} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Users, X, BarChart, Eye, Download } from "lucide-react";
import QRCodeModal from "@/components/QRCodeModal";
import { Progress } from "@/components/ui/progress";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "wouter";
import { AttendanceRecord, Class, Department, Group, Subject, User } from "@shared/schema";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";


export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {user } = useAuth();
  const [isQRModalOpen, setQRModalOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string>("");
  const [activeClassInfo, setActiveClassInfo] = useState<any>(null);
   const [userToEdit, setUserToEdit] = useState<Partial<User> | null>(null);
  
  const [newClass, setNewClass] = useState({
    subjectId: "",
    groupId: "",
    classroom: "",
    duration: "90",
  });

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/teacher/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const {
    data: departments,
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
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

  const { data: activeAttendanceRecords, isLoading: activeRecordsLoading } =
    useQuery<AttendanceRecord[]>({
      queryKey: [`/api/teacher/classes/${activeClassId}/attendance`],
      queryFn: getQueryFn({ on401: "returnNull" }),
      staleTime: 0,
      enabled: !!activeClassId,
    });
  const queries =
    classes
      ?.sort(
        (a: Class, b: Class) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 3)
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

  // End class mutation
  const endClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const res = await apiRequest(
        "PUT",
        `/api/teacher/classes/${classId}/end`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      setActiveClassId(null);
      setActiveClassInfo(null);
      toast({
        title: "Занятие завершено",
        description: "Занятие успешно завершено.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось завершить занятие",
        variant: "destructive",
      });
    },
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (classData: any) => {
      const res = await apiRequest("POST", "/api/teacher/classes", classData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      resetNewClassForm();
      toast({
        title: "Занятие создано",
        description: "Новое занятие успешно создано.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать занятие",
        variant: "destructive",
      });
    },
  });

  // Check for active class and set it
  useEffect(() => {
    if (classes && Array.isArray(classes)) {
      const activeClass = classes.find((cls: Class) => cls.isActive);
      if (activeClass) {
        setActiveClassId(activeClass.id);

        if (subjects && groups) {
          const subject = subjects.find(
            (s: Subject) => s.id === activeClass.subjectId
          );
          const group = groups.find((g: Group) => g.id === activeClass.groupId);

          if (subject && group) {
            setActiveClassInfo({
              groupId: activeClass.groupId,
              subject: subject.name,
              group: group.name,
              classroom: activeClass.classroom,
              endTime: activeClass.endTime,
              qrCode: activeClass.qrCode,
            });
          }
        }
      } else {
        setActiveClassId(null);
        setActiveClassInfo(null);
      }
    }
  }, [classes, subjects, groups]);

  const handleCreateClass = () => {
    const now = new Date();
    const endTime = new Date(now);
    endTime.setMinutes(now.getMinutes() + parseInt(newClass.duration, 10));

    const classData = {
      subjectId: parseInt(newClass.subjectId, 10),
      groupId: parseInt(newClass.groupId, 10),
      classroom: newClass.classroom,
      date: now.toISOString(),
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
    };

    createClassMutation.mutate(classData);
  };

  const resetNewClassForm = () => {
    setNewClass({
      subjectId: "",
      groupId: "",
      classroom: "",
      duration: "90",
    });
  };

  const missStudentsMutation = useMutation({
    mutationFn: async (classId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/teacher/classes/${classId}/miss`,
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/classes"] });
      setActiveClassId(null);
      setActiveClassInfo(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось поставить пропуски",
        variant: "destructive",
      });
    },
  });
  const handleEndClass = () => {
    if (activeClassId) {
      endClassMutation.mutate(activeClassId);

      missStudentsMutation.mutate(activeClassId);
    }
  };

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
    const presentStudents = results
      ? results[index].data.filter((record) => record.status === "present")
          .length
      : 0;

    return {
      present: presentStudents,
      total: totalStudents,
      percentage: calculateAttendancePercentage(presentStudents, totalStudents),
    };
  };
  const getActiveClassAttendance = (classId: number) => {
    if (!users || !classes) return { present: 0, total: 0, percentage: 0 };

    const classItem = classes.find((cls: Class) => cls.id === classId);
    if (!classItem) return { present: 0, total: 0, percentage: 0 };

    // Get all students in this group
    const studentsInGroup = users.filter(
      (user: User) =>
        user.role === "student" && user.groupId === classItem.groupId
    );

    const totalStudents = studentsInGroup.length;

    const presentStudents = activeAttendanceRecords
      ? activeAttendanceRecords.filter(
          (record: AttendanceRecord) => record.status === "present"
        ).length
      : 0;

    return {
      present: presentStudents,
      total: totalStudents,
      percentage: calculateAttendancePercentage(presentStudents, totalStudents),
    };
  };

  // Get attendance stats for classes
  const getClassesAttendanceStats = () => {
    if (!classes || !subjects || !groups || !users) return [];

    return classes.map((cls: Class) => {
      const subject = subjects.find((s: Subject) => s.id === cls.subjectId);
      const group = groups.find((g: Group) => g.id === cls.groupId);

      const studentsInGroup = users.filter(
        (user: User) => user.role === "student" && user.groupId === cls.groupId
      );

      const totalStudents = studentsInGroup.length;

      const presentStudents = Math.floor(totalStudents / totalStudents); // Assuming 70% attendance for demo

      return {
        id: cls.id,
        subject: subject ? subject.name : "Неизвестный предмет",
        group: group ? group.name : "Неизвестная группа",
        attendance: {
          present: presentStudents,
          total: totalStudents,
          percentage: calculateAttendancePercentage(
            presentStudents,
            totalStudents
          ),
        },
      };
    });
  };

  // Get recent classes
  const getRecentClasses = () => {
    if (!classes || !subjects || !groups) return [];

    return [...classes]
      .sort(
        (a: Class, b: Class) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 3)
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
    classesLoading ||
    subjectsLoading ||
    groupsLoading ||
    usersLoading ||
    activeRecordsLoading;

  const attendanceStats = getActiveClassAttendance(Number(activeClassId));
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
  
  const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (userToEdit) {
          try {
            await apiRequest(
              "PUT",
              '/api/user/change',
              userToEdit
            );
            toast({
              title: "Пользователь обновлен",
            });
    
            // Обновляем список пользователей
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          } catch (error) {
            console.error("Ошибка при обновлении пользователя:", error);
            toast({
              title: "Ошибка",
              description: "Не удалось обновить пользователя.",
              variant: "destructive",
            });
          } finally {
            setUserToEdit(null);
          }
        }
      };

  return (
    <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-medium text-gray-800 mb-4">
        Панель преподавателя
      </h2>
      <Button
       onClick={() => setUserToEdit(user)}>
        Изменить профиль
      </Button>
      </div>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Generate QR Code Card */}
        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <QrCode className="text-primary text-3xl mr-3 h-8 w-8" />
              <h3 className="text-xl font-medium text-gray-800">
                Создать QR-код занятия
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Предмет
                </Label>
                <Select
                  value={newClass.subjectId}
                  onValueChange={(value) =>
                    setNewClass({ ...newClass, subjectId: value })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects &&
                      subjects.map((subject: Subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="group"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Группа
                </Label>
                <Select
                  value={newClass.groupId}
                  onValueChange={(value) =>
                    setNewClass({ ...newClass, groupId: value })
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="group" className="w-full">
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups &&
                      groups.map((group: Group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label
                  htmlFor="classroom"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Аудитория
                </Label>
                <Input
                  id="classroom"
                  placeholder="Например: 305"
                  value={newClass.classroom}
                  onChange={(e) =>
                    setNewClass({ ...newClass, classroom: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label
                  htmlFor="duration"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Длительность (мин)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={newClass.duration}
                  onChange={(e) =>
                    setNewClass({ ...newClass, duration: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateClass}
              disabled={
                isLoading ||
                createClassMutation.isPending ||
                !newClass.subjectId ||
                !newClass.groupId ||
                !newClass.classroom
              }
            >
              <QrCode className="mr-2 h-4 w-4" />
              Сгенерировать QR-код
            </Button>
          </CardContent>
        </Card>

        {/* Current Session Card */}
        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Users className="text-secondary text-3xl mr-3 h-8 w-8" />
              <h3 className="text-xl font-medium text-gray-800">
                Текущее занятие
              </h3>
            </div>

            {isLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-500">Загрузка...</p>
              </div>
            ) : activeClassId && activeClassInfo ? (
              <div id="activeSession">
                <div className="flex justify-between mb-3">
                  <div className="font-medium">{activeClassInfo.subject}</div>
                  <div className="text-sm text-gray-500">
                    Группа {activeClassInfo.group}
                  </div>
                </div>
                <div className="flex justify-between mb-3">
                  <div className="text-sm text-gray-500">
                    Аудитория {activeClassInfo.classroom}
                  </div>
                  <div className="text-sm text-gray-500">
                    Осталось:{" "}
                    <span className="text-primary font-medium">
                      {getTimeRemaining(activeClassInfo.endTime)}
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm font-medium">Посещаемость:</div>
                    <div className="text-sm font-medium">
                      {attendanceStats
                        ? `${attendanceStats.present}/${attendanceStats.total} студентов`
                        : "Загрузка статистики..."}
                    </div>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleEndClass}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Завершить
                  </Button>
                </div>
                <div className="flex justify-center items-center p-4">
                  <QRCodeCanvas value={activeClassInfo.qrCode} size={200} />
                </div>
              </div>
            ) : (
              <div id="noActiveSession" className="text-center py-6">
                <div className="text-gray-400 text-5xl mb-2 mx-auto">
                  <Users className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <p className="text-gray-500">Нет активного занятия</p>
                <p className="text-sm text-gray-400 mt-1">
                  Сгенерируйте QR-код для начала занятия
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Attendance Stats */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-xl font-medium text-gray-800 mb-4">
            Статистика посещаемости
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                {/* Attendance chart would go here in a real application */}
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart className="text-gray-400 text-5xl mb-2 mx-auto h-16 w-16" />
                    <p className="text-gray-500">
                      График посещаемости по неделям
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Средняя посещаемость
              </h4>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-2">
                    <p className="text-gray-500">Загрузка...</p>
                  </div>
                ) : subjectAttendance.length > 0 ? (
                  subjectAttendance.slice(0, 3).map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <div>
                          {item.subject} (Группа {item.group})
                        </div>
                        <div>{item.percentage}%</div>
                      </div>
                      <Progress
                        value={item.percentage}
                        className={`h-2 ${
                          item.percentage >= 80
                            ? "bg-success"
                            : item.percentage >= 60
                            ? "bg-primary"
                            : "bg-warning"
                        }`}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-500">Нет данных о посещаемости</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Classes */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-medium text-gray-800 mb-4">
            Недавние занятия
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
          <div className="flex justify-center mt-4">
            <Button variant="link" className="text-primary">
              <Link href="teacher/classes">Все занятия</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
 <Dialog
        open={!!userToEdit}
        onOpenChange={(open) => !open && setUserToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновление пользователя</DialogTitle>
          </DialogHeader>
          {userToEdit && (
            <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px]">
                <div className="space-y-2">
                  <label
                    htmlFor="edit-username"
                    className="text-sm font-medium"
                  >
                    Имя пользователя
                  </label>
                  <Input
                    id="edit-username"
                    value={userToEdit.username}
                    onChange={(e) =>
                      setUserToEdit({ ...userToEdit, username: e.target.value })
                    }
                  />
                </div>
                <div></div>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-firstname"
                    className="text-sm font-medium"
                  >
                    Имя
                  </label>
                  <Input
                    id="edit-firstname"
                    value={userToEdit.firstName}
                    onChange={(e) =>
                      setUserToEdit({
                        ...userToEdit,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="edit-lastName"
                    className="text-sm font-medium"
                  >
                    Фамилия
                  </label>
                  <Input
                    id="edit-lastName"
                    value={userToEdit.lastName}
                    onChange={(e) =>
                      setUserToEdit({ ...userToEdit, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-middlename"
                    className="text-sm font-medium"
                  >
                    Отчество
                  </label>
                  <Input
                    id="edit-middlename"
                    value={userToEdit.middleName || ""}
                    onChange={(e) =>
                      setUserToEdit({
                        ...userToEdit,
                        middleName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="edit-password"
                    className="text-sm font-medium"
                  >
                    Пароль
                  </label>
                  <Input
                    type="password"
                    id="edit-password"
                    value={userToEdit.password}
                    onChange={(e) =>
                      setUserToEdit({ ...userToEdit, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="edit-groupId" className="text-sm font-medium">
                    Кафедра
                  </label>
                   
                    <Select
                      value={
                        departments?.find(
                          (f) => f.id === userToEdit?.departmentId
                        )?.name ?? ""
                      }
                      onValueChange={(selectedName) => {
                        const selectedFaculty = departments?.find(
                          (f) => f.name === selectedName
                        );
                        if (selectedFaculty) {
                          setUserToEdit({
                            ...userToEdit,
                            departmentId: selectedFaculty.id,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите кафедру" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((faculty) => (
                          <SelectItem key={faculty.id} value={faculty.name}>
                            {faculty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Обновить профиль</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setQRModalOpen(false)}
        qrValue={qrCodeValue}
        classInfo={activeClassInfo}
      />
    </div>
  );
}
