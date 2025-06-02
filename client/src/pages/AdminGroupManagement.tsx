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
import { Department, Faculty, Group, User } from "@shared/schema";

export default function AdminGroupManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [groupToCreate, setGroupToCreate] = useState<Partial<Group> | null>(
    null
  );
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);

  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery<(Group & { facultyName: string })[]>({
    queryKey: ["/api/groups"],
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

  const filteredUsers = groups?.filter((group) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      group.name.toLowerCase().includes(lowerSearch) ||
      group.facultyName.toLowerCase().includes(lowerSearch)
    );
  });

  // Удаление пользователя
  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/groups/${userId}`, {});
      toast({
        title: "Группа удалена",
        description: "Группа была успешно удален из системы.",
      });

      // Обновляем список пользователей
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    } catch (error) {
      console.error("Ошибка при удалении группы:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить группа.",
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
        await apiRequest("POST", "/api/admin/groups", groupToCreate);
        toast({
          title: "Группа создана",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      } catch (error) {
        console.error("Ошибка при создании группы:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать группу.",
          variant: "destructive",
        });
      } finally {
        setGroupToCreate(null);
      }
    }
  };
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupToEdit) {
      try {
        await apiRequest(
          "PATCH",
          `/api/admin/groups/${groupToEdit.id}`,
          groupToEdit
        );
        toast({
          title: "Группа обновлена",
        });

        // Обновляем список пользователей
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      } catch (error) {
        console.error("Ошибка при обновлении группы:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить группу.",
          variant: "destructive",
        });
      } finally {
        setGroupToEdit(null);
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
          {groupsLoading || faculitiesLoading ? (
            <div className="flex justify-center items-center p-8">
              <p>Загрузка учебных групп...</p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Users className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Группы не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Группа/Кафедра</TableHead>
                    <TableHead>Факультет</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.facultyName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setGroupToEdit(user)}
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
              Вы уверены, что хотите удалить эту группу? Это действие нельзя
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
          Добавить группу
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание новой группы</DialogTitle>
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
                    placeholder="Введите название группы"
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
                Создать группу
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!groupToEdit}
        onOpenChange={(open) => !open && setGroupToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновление группы</DialogTitle>
          </DialogHeader>
          {groupToEdit && (
            <form onSubmit={handleUpdateGroup} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="edit-name"
                    value={groupToEdit.name}
                    onChange={(e) =>
                      setGroupToEdit({ ...groupToEdit, name: e.target.value })
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
                      faculities?.find((f) => f.id === groupToEdit?.facultyId)
                        ?.name ?? ""
                    }
                    onValueChange={(selectedName) => {
                      const selectedFaculty = faculities?.find(
                        (f) => f.name === selectedName
                      );
                      if (selectedFaculty) {
                        setGroupToEdit({
                          ...groupToEdit,
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
                <Button type="submit">Обновить группу</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
