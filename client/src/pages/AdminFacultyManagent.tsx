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
import { Faculty, Group, User } from "@shared/schema";

export default function AdminFacultyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [facultyToCreate, setFacultyToCreate] =
    useState<Partial<Faculty> | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [facultyToEdit, setFacultyToEdit] = useState<Faculty | null>(null);
  const {
    data: faculities,
    isLoading: faculitiesLoading,
    error: faculitiesError,
  } = useQuery<Faculty[]>({
    queryKey: ["/api/admin/faculties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  // Фильтрация пользователей
  const filteredUsers = faculities?.filter((group) => {
    const matchesSearch = group.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Удаление пользователя
  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/faculties/${userId}`, {});
      toast({
        title: "Факультет удалена",
        description: "Факультет был успешно удален из системы.",
      });

      // Обновляем список пользователей
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faculties"] });
    } catch (error) {
      console.error("Ошибка при удалении факультета:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить факультет.",
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
        await apiRequest("POST", "/api/admin/faculties", facultyToCreate);
        toast({
          title: "Факультет создан",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/faculties"] });
      } catch (error) {
        console.error("Ошибка при создании факультета:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать факультет.",
          variant: "destructive",
        });
      } finally {
        setFacultyToCreate(null);
      }
    }
  };
  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (facultyToEdit) {
      try {
        await apiRequest(
          "PATCH",
          `/api/admin/faculties/${facultyToEdit.id}`,
          facultyToEdit
        );
        toast({
          title: "Факультет обновлен",
        });

        // Обновляем список пользователей
        queryClient.invalidateQueries({ queryKey: ["/api/admin/faculties"] });
      } catch (error) {
        console.error("Ошибка при обновлении факультета:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить факультет.",
          variant: "destructive",
        });
      } finally {
        setFacultyToEdit(null);
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
          <h2 className="text-2xl font-bold">Управление факультетами</h2>
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
              <p>Загрузка факультетов...</p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Users className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Факультеты не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Факультет</TableHead>
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
                            onClick={() => setFacultyToEdit(user)}
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
              Вы уверены, что хотите удалить этот факультет? Это действие нельзя
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
          Добавить Факультет
        </Button>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание нового факультета</DialogTitle>
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
                    placeholder="Введите название факультета"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
              >
                Создать факультет
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!facultyToEdit}
        onOpenChange={(open) => !open && setFacultyToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновление предмета</DialogTitle>
          </DialogHeader>
          {facultyToEdit && (
            <form onSubmit={handleUpdateFaculty} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="edit-name"
                    value={facultyToEdit.name}
                    onChange={(e) =>
                      setFacultyToEdit({
                        ...facultyToEdit,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Обновить факультет</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
