import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  School,
  Calendar,
  ClipboardList,
  Download,
  Eye,
  Trash,
  FileText,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Class,
  Group,
  User,
  Report,
  Subject,
  Faculty,
  AttendanceRecord,
} from "@shared/schema";
import { group } from "console";
import { record } from "zod";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("reports");
  const [, setLocation] = useLocation();

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch all classes
  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/admin/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: attendanceRecords, isLoading: recordsLoading } = useQuery<
    AttendanceRecord[]
  >({
    queryKey: ["/api/admin/attendanceRecords"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch faculties
  const { data: faculties, isLoading: facultiesLoading } = useQuery<Faculty[]>({
    queryKey: ["/api/faculties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch reports
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const isLoading =
    usersLoading ||
    classesLoading ||
    groupsLoading ||
    subjectsLoading ||
    facultiesLoading ||
    reportsLoading;

  // Form state for report generation
  const [reportForm, setReportForm] = useState({
    name: "",
    type: "attendance",
    period: "month",
    format: "pdf",
    startDate: "",
    endDate: "",
  });

  // Mutation for generating reports
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/reports",
        reportData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Отчет создан",
        description: "Отчет успешно сформирован и сохранен в базу данных",
      });
      setReportForm({
        name: "",
        type: "attendance",
        period: "month",
        format: "pdf",
        startDate: "",
        endDate: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать отчет",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting reports
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/admin/reports/${reportId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Отчет удален",
        description: "Отчет успешно удален из базы данных",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить отчет",
        variant: "destructive",
      });
    },
  });

  const handleReportFormChange = (field: string, value: string) => {
    setReportForm({
      ...reportForm,
      [field]: value,
    });
  };

  const handleGenerateReport = async () => {
    if (!reportForm.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название отчета",
        variant: "destructive",
      });
      return;
    }

    if (
      reportForm.period === "custom" &&
      (!reportForm.startDate || !reportForm.endDate)
    ) {
      toast({
        title: "Ошибка",
        description: "Выберите даты для произвольного периода",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (reportForm.period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "week":
        const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Понедельник
        startDate = new Date(now.setDate(diff));
        break;
      case "semester":
        // Пример: семестр — 1 сентября по 31 декабря
        const isFirstSemester = now.getMonth() < 6;
        startDate = isFirstSemester
          ? new Date(now.getFullYear(), 0, 1)
          : new Date(now.getFullYear(), 6, 1); // июль
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        startDate = new Date(reportForm.startDate!);
        endDate = new Date(reportForm.endDate!);
        break;
      default:
        startDate = new Date(0); // всё
    }

    const isInPeriod = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= startDate && date <= endDate;
    };

    const filteredAttendance =
      attendanceRecords?.filter((r) =>
        isInPeriod(new Date(r.timestamp).toDateString())
      ) || [];

    const filteredClasses =
      classes?.filter((c) => isInPeriod(new Date(c.date).toDateString())) || [];

    let reportData: any = {};

    switch (reportForm.type) {
      case "attendance":
        reportData = {
          totalStudents: users?.filter((u) => u.role === "student").length || 0,
          totalClasses: filteredClasses.length,
          averageAttendance:
            (filteredAttendance.length || 0) /
            (users?.filter((u) => u.role === "student").length || 1),
          attendanceByGroup:
            groups?.map((g) => {
              const groupStudents =
                users?.filter(
                  (u) => u.role === "student" && u.groupId === g.id
                ) || [];

              const studentsAttendance = groupStudents.map((student) => {
                const attendedClasses = filteredAttendance
                  .filter((record) => record.studentId === student.id)
                  .filter((record) => record.status === "present").length;

                const attendanceRate =
                  filteredClasses.length > 0
                    ? attendedClasses / filteredClasses.length
                    : 0;

                return {
                  studentName: `${student.firstName || ""} ${
                    student.lastName || ""
                  } ${student.middleName || ""}`,
                  attendance: attendanceRate,
                };
              });

              return {
                groupName: g.name,
                students: studentsAttendance,
              };
            }) || [],
        };
        break;

      case "stats":
        const teachers = users?.filter((u) => u.role === "teacher") || [];
        reportData = {
          totalTeachers: teachers.length,
          classesPerTeacher:
            teachers.length > 0 ? filteredClasses.length / teachers.length : 0,
          teacherActivity: teachers.map((t) => ({
            teacherName: `${t.firstName} ${t.lastName}`,
            classesCount: filteredClasses.filter((c) => c.teacherId === t.id)
              .length,
          })),
        };
        break;

      case "groups":
        reportData = {
          totalGroups: groups?.length || 0,
          studentsPerGroup:
            groups?.map((g) => ({
              groupName: g.name,
              studentsCount: users?.filter(
                (u) => u.role === "student" && u.groupId === g.id
              ).length,
            })) || [],
        };
        break;

      case "subjects":
        reportData = {
          totalSubjects: subjects?.length || 0,
          subjectPopularity:
            subjects?.map((s) => ({
              subjectName: s.name,
              classesCount: filteredClasses.filter((c) => c.subjectId === s.id)
                .length,
            })) || [],
        };
        break;
    }

    const report = {
      name: reportForm.name,
      type: reportForm.type,
      period: reportForm.period,
      format: reportForm.format,
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      data: reportData,
    };
    console.log(report);
    generateReportMutation.mutate(report);
  };

  const handleDownloadReport = async (
    reportId: number,
    format: string,
    filename: string
  ) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/download`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Не удалось скачать отчет");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      format === "excel"
        ? (link.download = `${filename}.xlsx`)
        : (link.download = `${filename}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Успешно",
        description: "Отчет скачан",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось скачать отчет",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReport = (reportId: number) => {
    if (window.confirm("Вы уверены, что хотите удалить этот отчет?")) {
      deleteReportMutation.mutate(reportId);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      attendance: "Посещаемость",
      stats: "Статистика по преподавателям",
      groups: "Статистика по группам",
      subjects: "Статистика по предметам",
    };
    return types[type] || type;
  };

  const getPeriodLabel = (period: string) => {
    const periods: Record<string, string> = {
      week: "Неделя",
      month: "Месяц",
      semester: "Семестр",
      year: "Год",
      custom: "Произвольный период",
    };
    return periods[period] || period;
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-medium text-gray-800 mb-4">
        Панель администратора
      </h2>

      {/* Admin Tabs */}
      <Card className="mb-8">
        <Tabs defaultValue="reports" onValueChange={setActiveTab}>
          <div className="border-b border-gray-200">
            <TabsList className="flex h-auto rounded-none border-b border-0 bg-transparent">
              <TabsTrigger
                value="reports"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Отчеты
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Пользователи
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Группы
              </TabsTrigger>
              <TabsTrigger
                value="departments"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Кафедры
              </TabsTrigger>
              <TabsTrigger
                value="faculties"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Факультеты
              </TabsTrigger>
              <TabsTrigger
                value="subjects"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-6 py-4 font-medium text-sm"
              >
                Предметы
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="p-6">
            <TabsContent value="reports" className="m-0">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Создать отчет
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="reportName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Название отчета
                    </Label>
                    <Input
                      id="reportName"
                      value={reportForm.name}
                      onChange={(e) =>
                        handleReportFormChange("name", e.target.value)
                      }
                      placeholder="Введите название отчета"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="reportType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Тип отчета
                    </Label>
                    <Select
                      value={reportForm.type}
                      onValueChange={(value) =>
                        handleReportFormChange("type", value)
                      }
                    >
                      <SelectTrigger id="reportType" className="w-full">
                        <SelectValue placeholder="Выберите тип отчета" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attendance">Посещаемость</SelectItem>
                        <SelectItem value="stats">
                          Статистика по преподавателям
                        </SelectItem>
                        <SelectItem value="groups">
                          Статистика по группам
                        </SelectItem>
                        <SelectItem value="subjects">
                          Статистика по предметам
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="reportPeriod"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Период
                    </Label>
                    <Select
                      value={reportForm.period}
                      onValueChange={(value) =>
                        handleReportFormChange("period", value)
                      }
                    >
                      <SelectTrigger id="reportPeriod" className="w-full">
                        <SelectValue placeholder="Выберите период" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Неделя</SelectItem>
                        <SelectItem value="month">Месяц</SelectItem>
                        <SelectItem value="semester">Семестр</SelectItem>
                        <SelectItem value="year">Год</SelectItem>
                        <SelectItem value="custom">
                          Произвольный период
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {reportForm.period === "custom" && (
                    <>
                      <div>
                        <Label
                          htmlFor="startDate"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Дата начала
                        </Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={reportForm.startDate}
                          onChange={(e) =>
                            handleReportFormChange("startDate", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="endDate"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Дата окончания
                        </Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={reportForm.endDate}
                          onChange={(e) =>
                            handleReportFormChange("endDate", e.target.value)
                          }
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label
                      htmlFor="reportFormat"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Формат
                    </Label>
                    <Select
                      value={reportForm.format}
                      onValueChange={(value) =>
                        handleReportFormChange("format", value)
                      }
                    >
                      <SelectTrigger id="reportFormat" className="w-full">
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Button
                      className="w-full"
                      onClick={handleGenerateReport}
                      disabled={generateReportMutation.isPending}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      {generateReportMutation.isPending
                        ? "Формирование..."
                        : "Сформировать отчет"}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Сохраненные отчеты
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Название
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Тип
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Период
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Создан
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Формат
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports?.map((report) => (
                        <tr key={report.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {report.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {getReportTypeLabel(report.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {getPeriodLabel(report.period)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(report.createdAt).toLocaleString(
                              "ru-RU",
                              {
                                timeZone: "UTC",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                report.format === "pdf"
                                  ? "bg-blue-100 text-blue-800"
                                  : report.format === "excel"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {report.format.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() =>
                                  handleDownloadReport(
                                    report.id,
                                    report.format,
                                    report.name
                                  )
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteReport(report.id)}
                                disabled={deleteReportMutation.isPending}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!reports || reports.length === 0) && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            Отчеты не найдены
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="m-0">
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">
                  <Users className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Управление пользователями
                </h3>
                <p className="text-gray-500 mb-4">
                  Здесь вы можете добавлять, редактировать и удалять
                  пользователей системы
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setLocation("/admin/users")}
                >
                  Управление пользователями
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="m-0">
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">
                  <Users className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Управление группами
                </h3>
                <p className="text-gray-500 mb-4">
                  Здесь вы можете создавать и редактировать группы студентов
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setLocation("/admin/groups")}
                >
                  Управление группами
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="departments" className="m-0">
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">
                  <Users className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Управление кафедрами
                </h3>
                <p className="text-gray-500 mb-4">
                  Здесь вы можете создавать и редактировать кафедры
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setLocation("/admin/departments")}
                >
                  Управление кафедрами
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="faculties" className="m-0">
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">
                  <Users className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Управление факультетами
                </h3>
                <p className="text-gray-500 mb-4">
                  Здесь вы можете создавать и редактировать факультеты
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setLocation("/admin/faculties")}
                >
                  Управление факультетами
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="subjects" className="m-0">
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">
                  <FileText className="h-16 w-16 mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Управление предметами
                </h3>
                <p className="text-gray-500 mb-4">
                  Здесь вы можете добавлять и редактировать учебные предметы
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setLocation("/admin/subjects")}
                >
                  Управление предметами
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
