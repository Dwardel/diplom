import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Users, Plus, Edit, Trash, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Department, Faculty, Group, User } from "@shared/schema";

export default function AdminDepartmentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [groupToCreate, setGroupToCreate] = useState<Partial<Group> | null>(
    null
  );
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(
    null
  );

  const {
    data: departments,
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useQuery<(Department & { facultyName: string })[]>({
    queryKey: ["/api/departments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const {
    data: faculities,
    isLoading: faculitiesLoading,
    error: faculitiesError,
  } = useQuery<Faculty[]>({
    queryKey: ["/api/admin/faculties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const filteredDepartments = departments?.filter((department) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      department.name.toLowerCase().includes(lowerSearch) ||
      department.facultyName.toLowerCase().includes(lowerSearch)
    );
  });

  // Удаление пользователя
  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/departments/${userId}`, {});
      toast({
        title: "Кафедра удалена",
        description: "Кафедра была успешно удален из системы.",
      });

      // Обновляем список пользователей
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
    } catch (error) {
      console.error("Ошибка при удалении кафедры:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить кафедру.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupToCreate) {
      try {
        await apiRequest("POST", "/api/admin/departments", groupToCreate);
        toast({
          title: "Кафедра создана",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      } catch (error) {
        console.error("Ошибка при создании кафедры:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать кафедру.",
          variant: "destructive",
        });
      } finally {
        setGroupToCreate(null);
      }
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (departmentToEdit) {
      try {
        await apiRequest(
          "PATCH",
          `/api/admin/departments/${departmentToEdit.id}`,
          departmentToEdit
        );
        toast({
          title: "Кафедра обновлена",
        });

        // Обновляем список пользователей
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      } catch (error) {
        console.error("Ошибка при обновлении кафедры:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить кафедру.",
          variant: "destructive",
        });
      } finally {
        setDepartmentToEdit(null);
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {departmentsLoading || faculitiesLoading ? (
            <div className="flex justify-center items-center p-8">
              <p>Загрузка кафедр...</p>
            </div>
          ) : filteredDepartments?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Users className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Кафедры не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Кафедра</TableHead>
                    <TableHead>Факультет</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments?.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">
                        {department.id}
                      </TableCell>
                      <TableCell>{department.name}</TableCell>
                      <TableCell>{department.facultyName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDepartmentToEdit(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => {
                              setUserToDelete(department.id);
                              setIsConfirmDialogOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить эту кафедру? Это действие нельзя
              отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!groupToCreate}
        onOpenChange={(open) => !open && setGroupToCreate(null)}
      >
        <Button onClick={() => setGroupToCreate({ name: "", facultyId: 0 })}>
          Добавить кафедру
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание новой кафедры</DialogTitle>
          </DialogHeader>
          {groupToCreate && (
            <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="create-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="create-name"
                    value={groupToCreate?.name}
                    onChange={(e) =>
                      setGroupToCreate({
                        ...groupToCreate,
                        name: e.target.value,
                      })
                    }
                    placeholder="Введите название кафедры"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="create-role" className="text-sm font-medium">
                    Факультет
                  </label>
                  <Select
                    value={
                      faculities?.find((f) => f.id === groupToCreate?.facultyId)
                        ?.name ?? ""
                    }
                    onValueChange={(selectedName) => {
                      const selectedFaculty = faculities?.find(
                        (f) => f.name === selectedName
                      );
                      if (selectedFaculty) {
                        setGroupToCreate({
                          ...groupToCreate,
                          facultyId: selectedFaculty.id,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите факультет" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculities?.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.name}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
              >
                Создать кафедру
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!departmentToEdit}
        onOpenChange={(open) => !open && setDepartmentToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновление кафедры</DialogTitle>
          </DialogHeader>
          {departmentToEdit && (
            <form onSubmit={handleUpdateDepartment} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="edit-name"
                    value={departmentToEdit.name}
                    onChange={(e) =>
                      setDepartmentToEdit({
                        ...departmentToEdit,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-facultyId"
                    className="text-sm font-medium"
                  >
                    Факультет
                  </label>
                  <Select
                    value={
                      faculities?.find(
                        (f) => f.id === departmentToEdit?.facultyId
                      )?.name ?? ""
                    }
                    onValueChange={(selectedName) => {
                      const selectedFaculty = faculities?.find(
                        (f) => f.name === selectedName
                      );
                      if (selectedFaculty) {
                        setDepartmentToEdit({
                          ...departmentToEdit,
                          facultyId: selectedFaculty.id,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите факультет" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculities?.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.name}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Обновить кафедру</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
