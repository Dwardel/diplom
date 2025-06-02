import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Faculty, Group, Subject, User } from "@shared/schema";

export default function AdminSubjectsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [facultyToCreate, setFacultyToCreate] =
    useState<Partial<Subject> | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const {
    data: subjects,
    isLoading: faculitiesLoading,
    error: faculitiesError,
  } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  // Фильтрация пользователей
  const filteredUsers = subjects?.filter((group) => {
    const matchesSearch = group.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Удаление пользователя
  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/subjects/${userId}`, {});
      toast({
        title: "Предмет удален",
        description: "Предмет был успешно удален из системы.",
      });

      // Обновляем список пользователей
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
    } catch (error) {
      console.error("Ошибка при удалении предмета:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить предмет.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("submit", facultyToCreate);
    if (facultyToCreate) {
      try {
        await apiRequest("POST", "/api/admin/subjects", facultyToCreate);
        toast({
          title: "предмет создан",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      } catch (error) {
        console.error("Ошибка при создании предмета:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать предмет.",
          variant: "destructive",
        });
      } finally {
        setFacultyToCreate(null);
      }
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subjectToEdit) {
      try {
        await apiRequest(
          "PATCH",
          `/api/admin/subjects/${subjectToEdit.id}`,
          subjectToEdit
        );
        toast({
          title: "Предмет обновлен",
        });

        // Обновляем список пользователей
        queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      } catch (error) {
        console.error("Ошибка при обновлении предмета:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить предмет.",
          variant: "destructive",
        });
      } finally {
        setSubjectToEdit(null);
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
          <h2 className="text-2xl font-bold">Управление предметами</h2>
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
          {faculitiesLoading ? (
            <div className="flex justify-center items-center p-8">
              <p>Загрузка предметов...</p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Users className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Предметы не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setSubjectToEdit(user)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => {
                              setUserToDelete(user.id);
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
              Вы уверены, что хотите удалить этот предмет? Это действие нельзя
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
        open={!!facultyToCreate}
        onOpenChange={(open) => !open && setFacultyToCreate(null)}
      >
        <Button onClick={() => setFacultyToCreate({ name: "" })}>
          Добавить предмет
        </Button>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание нового предмета</DialogTitle>
          </DialogHeader>
          {facultyToCreate && (
            <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="create-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="create-name"
                    value={facultyToCreate?.name}
                    onChange={(e) =>
                      setFacultyToCreate({
                        ...facultyToCreate,
                        name: e.target.value,
                      })
                    }
                    placeholder="Введите название предмета"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
              >
                Создать предмет
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!subjectToEdit}
        onOpenChange={(open) => !open && setSubjectToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновление предмета</DialogTitle>
          </DialogHeader>
          {subjectToEdit && (
            <form onSubmit={handleUpdateSubject} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="edit-name"
                    value={subjectToEdit.name}
                    onChange={(e) =>
                      setSubjectToEdit({
                        ...subjectToEdit,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Обновить предмет</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
