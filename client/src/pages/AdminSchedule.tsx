
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Calendar, Plus, Edit, Trash, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Group, Subject, User, Schedule } from '@shared/schema';
import { set } from 'date-fns';

interface ScheduleFormData {
  groupId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroom: string;
  weekType: string;
}

export default function AdminScheduleManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
   const [groupFilter, setGroupFilter] = useState("all");
   const [subjectFilter, setSubjectFilter] = useState("all");
   const [teacherFilter, setTeacherFilter] = useState("all");
   const [weekTypeFilter, setWeekTypeFilter] = useState("all");
  const [formData, setFormData] = useState<ScheduleFormData>({
    groupId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    classroom: '',
    weekType: 'both'
  });

  // Fetch data
  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ['/api/admin/schedules'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
console.log(groups)
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const teachers = users?.filter(user => user.role === 'teacher') || [];

  // Create mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const response = await apiRequest('POST', '/api/admin/schedules', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schedules'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Успешно',
        description: 'Пара создана',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать пару',
        variant: 'destructive',
      });
    },
  });

   const filteredSchedules = schedules?.filter((user: any) => {
   
    const matchesGroup = groupFilter === "all" || user.groupId === Number(groupFilter);

    const matchesSubject = subjectFilter === "all" || user.subjectId === Number(subjectFilter);

    const matchesWeekType = weekTypeFilter === "all" || user.weekType === weekTypeFilter;

    const matchesTeacher = teacherFilter === "all" || user.teacherId === Number(teacherFilter);
    return matchesGroup && matchesSubject && matchesWeekType && matchesTeacher;
  });

  // Update mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ScheduleFormData }) => {
      const response = await apiRequest('PATCH', `/api/admin/schedules/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schedules'] });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
      toast({
        title: 'Успешно',
        description: 'Пара обновлена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить пару',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schedules'] });
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
      toast({
        title: 'Успешно',
        description: 'Пара удалена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить пару',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      groupId: '',
      subjectId: '',
      teacherId: '',
      dayOfWeek: '',
      startTime: '', 
      endTime: '',
      classroom: '',
      weekType: 'both'
    });
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      groupId: schedule.groupId.toString(),
      subjectId: schedule.subjectId.toString(),
      teacherId: schedule.teacherId.toString(),
      dayOfWeek: schedule.dayOfWeek.toString(),
      startTime: schedule.startTime.toString(),
      endTime: schedule.endTime.toString(),
      classroom: schedule.classroom,
      weekType: schedule.weekType || 'both'
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setScheduleToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return days[dayOfWeek] || 'Неизвестно';
  };

  const getWeekTypeName = (weekType: string) => {
    const types: { [key: string]: string } = {
      'both': 'Каждую неделю',
      'odd': 'Нечетная неделя',
      'even': 'Четная неделя'
    };
    return types[weekType] || weekType;
  };

  const isLoading = schedulesLoading || groupsLoading || subjectsLoading || usersLoading;
  return (
    <div className="mb-6">
    

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Расписание занятий
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить пару
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Создать новое пару</DialogTitle>
                  <DialogDescription>
                    Заполните форму для создания новой пары
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="group">Группа</Label>
                    <Select value={formData.groupId} onValueChange={(value) => setFormData({...formData, groupId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Предмет</Label>
                    <Select value={formData.subjectId} onValueChange={(value) => setFormData({...formData, subjectId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите предмет" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="teacher">Преподаватель</Label>
                    <Select value={formData.teacherId} onValueChange={(value) => setFormData({...formData, teacherId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.lastName} {teacher.firstName} {teacher.middleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="day">День недели</Label>
                    <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({...formData, dayOfWeek: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите день" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Понедельник</SelectItem>
                        <SelectItem value="2">Вторник</SelectItem>
                        <SelectItem value="3">Среда</SelectItem>
                        <SelectItem value="4">Четверг</SelectItem>
                        <SelectItem value="5">Пятница</SelectItem>
                        <SelectItem value="6">Суббота</SelectItem>
                        <SelectItem value="7">Воскресенье</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                      <div>
                    <Label htmlFor="startTime">Время начала</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Время окончания</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                
                  <div>
                    <Label htmlFor="classroom">Аудитория</Label>
                    <Input
                      placeholder="Например: 305"
                      value={formData.classroom}
                      onChange={(e) => setFormData({...formData, classroom: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weekType">Тип недели</Label>
                    <Select value={formData.weekType} onValueChange={(value) => setFormData({...formData, weekType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Каждую неделю</SelectItem>
                        <SelectItem value="odd">Нечетная неделя</SelectItem>
                        <SelectItem value="even">Четная неделя</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={() => createScheduleMutation.mutate(formData)}
                    disabled={createScheduleMutation.isPending}
                  >
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Загрузка...</div>
          ) : (
            <div className="space-y-6">

        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Label htmlFor="group">Группа</Label>
                    <Select
                      onValueChange={setGroupFilter}
                      value={groupFilter}
                      disabled={isLoading || groups?.length === 0}
                    >
                      
                        <SelectTrigger id="group">
                          <SelectValue placeholder="Выберите группу" />
                        </SelectTrigger>
                      
                      <SelectContent>
                        <SelectItem
                            key={0}
                            value={"all"}
                          >
                            Все
                          </SelectItem>
                        {groups?.map((group: any) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                       <Label htmlFor="subject">Предмет</Label>
                    <Select
                      onValueChange={setSubjectFilter}
                      value={subjectFilter}
                      disabled={isLoading || groups?.length === 0}
                    >
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Выберите предмет" />
                        </SelectTrigger>
                      
                      <SelectContent>
                         <SelectItem
                            key={0}
                            value={"all"}
                          >
                            Все
                          </SelectItem>
                        {subjects?.map((group: any) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Label htmlFor="teacher">Преподаватель</Label>
                    <Select
                      onValueChange={setTeacherFilter}
                      value={teacherFilter}
                      disabled={isLoading || teachers?.length === 0}
                    >
                      
                        <SelectTrigger id="teacher">
                          <SelectValue placeholder="Выберите преподавателя" />
                        </SelectTrigger>
                      
                      <SelectContent>
                        <SelectItem
                            key={0}
                            value={"all"}
                          >
                            Все
                          </SelectItem>
                        {teachers?.map((group: any) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.firstName + ' ' + group.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label htmlFor="weekType">Тип недели</Label>
                    <Select
                      onValueChange={setWeekTypeFilter}
                      value={weekTypeFilter}
                      disabled={isLoading }
                    >
                      
                        <SelectTrigger id="weekType">
                          <SelectValue placeholder="Выберите тип недели" />
                        </SelectTrigger>
                      
                      <SelectContent>
                        <SelectItem
                            key={0}
                            value={"all"}
                          >
                            Все
                          </SelectItem>
                        <SelectItem
                            key={1}
                            value={"even"}
                          >
                            Четная неделя
                          </SelectItem>
                          <SelectItem
                            key={2}
                            value={"odd"}
                          >
                            Нечетная неделя
                          </SelectItem>
                          <SelectItem
                            key={3}
                            value={"both"}
                          >
                            Каждая неделя
                          </SelectItem>
                      </SelectContent>
                    </Select>
                      </div>
                
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Группа</TableHead>
                  <TableHead>Предмет</TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead>День недели</TableHead>
                  <TableHead>Время</TableHead>
                  <TableHead>Аудитория</TableHead>
                  <TableHead>Тип недели</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              
                {filteredSchedules?.map((schedule) => {
                  const group = groups?.find(g => g.id === schedule.groupId);
                  const subject = subjects?.find(s => s.id === schedule.subjectId);
                  const teacher = teachers.find(t => t.id === schedule.teacherId);
                  
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>{group?.name || 'Неизвестно'}</TableCell>
                      <TableCell>{subject?.name || 'Неизвестно'}</TableCell>
                      <TableCell>
                        {teacher ? `${teacher.lastName} ${teacher.firstName}` : 'Неизвестно'}
                      </TableCell>
                      <TableCell>{getDayName(schedule.dayOfWeek)}</TableCell>
                      <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
                      <TableCell>{schedule.classroom}</TableCell>
                      <TableCell>{getWeekTypeName(schedule.weekType || 'both')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!filteredSchedules || filteredSchedules.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Расписание не найдено
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать пару</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group">Группа</Label>
              <Select value={formData.groupId} onValueChange={(value) => setFormData({...formData, groupId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Предмет</Label>
              <Select value={formData.subjectId} onValueChange={(value) => setFormData({...formData, subjectId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teacher">Преподаватель</Label>
              <Select value={formData.teacherId} onValueChange={(value) => setFormData({...formData, teacherId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.lastName} {teacher.firstName} {teacher.middleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="day">День недели</Label>
              <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({...formData, dayOfWeek: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите день" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Понедельник</SelectItem>
                  <SelectItem value="2">Вторник</SelectItem>
                  <SelectItem value="3">Среда</SelectItem>
                  <SelectItem value="4">Четверг</SelectItem>
                  <SelectItem value="5">Пятница</SelectItem>
                  <SelectItem value="6">Суббота</SelectItem>
                  <SelectItem value="7">Воскресенье</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startTime">Время начала</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="endTime">Время окончания</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          
            <div>
              <Label htmlFor="classroom">Аудитория</Label>
              <Input
                placeholder="Например: 305"
                value={formData.classroom}
                onChange={(e) => setFormData({...formData, classroom: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="weekType">Тип недели</Label>
              <Select value={formData.weekType} onValueChange={(value) => setFormData({...formData, weekType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Каждую неделю</SelectItem>
                  <SelectItem value="odd">Нечетная неделя</SelectItem>
                  <SelectItem value="even">Четная неделя</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={() => editingSchedule && updateScheduleMutation.mutate({ id: editingSchedule.id, data: formData })}
              disabled={updateScheduleMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить эту пару? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive"
              onClick={() => scheduleToDelete && deleteScheduleMutation.mutate(scheduleToDelete)}
              disabled={deleteScheduleMutation.isPending}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
