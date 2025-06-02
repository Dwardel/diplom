
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { School, ArrowLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: string;
  groupId?: number;
}
// Схема валидации для регистрации нового пользователя администратором
const registerUserSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно содержать минимум 3 символа'),
  password1: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  lastName: z.string().min(2, 'Фамилия должна содержать минимум 2 символа'),
  middleName: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin'], {
    required_error: 'Пожалуйста, выберите роль пользователя',
  }),
  groupId: z.string().optional(),
  departmentId: z.string().optional(),
});

type RegisterUserFormData = z.infer<typeof registerUserSchema>;

export default function AdminRegisterUser({ isEditing = false }: { isEditing?: boolean }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [, params] = useRoute('/admin/edit-user/:id');
  const userId = params?.id ? parseInt(params.id) : null;
  
  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });
  
  // Получаем список кафедр для выбора
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
  });
  
  // Получаем данные пользователя для редактирования
  const { data: userData, isLoading: isUserLoading } = useQuery<User>({
    queryKey: [`/api/admin/users/${userId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isEditing && !!userId,
    retry: false,
  });
  
  const form = useForm<RegisterUserFormData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: '',
      password1: '',
      firstName: '',
      lastName: '',
      middleName: '',
      role: 'student',
      groupId: undefined,
      departmentId: undefined
    },
  });
  
  // // Заполняем форму данными пользователя при редактировании
  // useEffect(() => {
  //   if (isEditing && userData) {
  //     form.reset({
  //       username: userData.username,
  //       password1: '', // Пароль не отображаем
  //       firstName: userData.firstName,
  //       lastName: userData.lastName,
  //       middleName: userData.middleName || '',
  //       role: userData.role,
  //       groupId: userData.groupId ? userData.groupId.toString() : undefined,
  //       departmentId: userData.departmentId ? userData.departmentId.toString() : undefined
  //     });
  //   }
  // }, [userData, isEditing, form]);
  
  // Получаем текущую выбранную роль для условного рендеринга полей
  const selectedRole = form.watch('role');
  
  const onSubmit = async (data: RegisterUserFormData) => {
    setIsLoading(true);
    try {
      // Преобразуем groupId и departmentId в числа, если они есть
      const payload = {
        ...data,
        groupId: data.groupId ? parseInt(data.groupId) : null,
        departmentId: data.departmentId ? parseInt(data.departmentId) : null
      };
      console.log(payload);
      if (isEditing && userId) {
        console.log('Обновление пользователя:', payload);
        
        const res = await apiRequest('POST', '/api/auth/register', payload);
        const user = await res.json();
        
        toast({
          title: 'Пользователь обновлен',
          description: `${user.firstName} ${user.lastName} успешно обновлен.`,
        });
        
        // Обновляем данные в кэше запросов
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        setLocation('/admin/users');
      } else {
        console.log('Регистрация пользователя:', payload);
        
        const res = await apiRequest('POST', '/api/auth/register', payload);
        const user = await res.json();
        
        toast({
          title: 'Пользователь зарегистрирован',
          description: `${user.firstName} ${user.lastName} успешно добавлен в систему.`,
        });
        
        // Очищаем форму после успешной регистрации
        form.reset();
        
        // Обновляем данные в кэше запросов
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      }
    } catch (error) {
      console.error('Ошибка операции:', error);
      toast({
        title: isEditing ? 'Ошибка обновления' : 'Ошибка регистрации',
        description: isEditing 
          ? 'Не удалось обновить пользователя.'
          : 'Не удалось зарегистрировать пользователя. Возможно, такое имя пользователя уже занято.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation('/admin/users')} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Редактирование пользователя' : 'Регистрация пользователя'}
        </h2>
      </div>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <CardTitle className="text-2xl font-bold">
              {isEditing ? 'Редактирование пользователя' : 'Регистрация пользователя'}
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Изменение данных существующей учетной записи' 
              : 'Создание новой учетной записи в системе'}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="username">Имя пользователя*</Label>
                      <FormControl>
                        <Input
                          id="username"
                          placeholder="Введите имя пользователя"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password1"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password1">
                        Пароль{isEditing ? '' : '*'} 
                        {isEditing && <span className="text-xs text-gray-500 ml-1">(оставьте пустым, чтобы не менять)</span>}
                      </Label>
                      <FormControl>
                        <Input
                          id="password1"
                          type="password"
                          placeholder={isEditing ? "Новый пароль или оставьте пустым" : "Введите пароль"}
                          disabled={isLoading}
                          {...field}
                          {...(isEditing ? { required: false } : {})}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="role">Роль пользователя*</Label>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Выберите роль пользователя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">Студент</SelectItem>
                        <SelectItem value="teacher">Преподаватель</SelectItem>
                        <SelectItem value="admin">Администратор</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="lastName">Фамилия*</Label>
                      <FormControl>
                        <Input
                          id="lastName"
                          placeholder="Введите фамилию"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="firstName">Имя*</Label>
                      <FormControl>
                        <Input
                          id="firstName"
                          placeholder="Введите имя"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="middleName">Отчество</Label>
                      <FormControl>
                        <Input
                          id="middleName"
                          placeholder="Введите отчество (если есть)"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {selectedRole === 'student' && (
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="group">Группа</Label>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoading || groups.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger id="group">
                            <SelectValue placeholder="Выберите группу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((group: any) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {selectedRole === 'teacher' && (
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="department">Кафедра</Label>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoading || departments.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Выберите кафедру" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department: any) => (
                            <SelectItem key={department.id} value={department.id.toString()}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => isEditing ? setLocation('/admin/users') : form.reset()}
                  disabled={isLoading}
                >
                  {isEditing ? 'Назад' : 'Отменить'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading 
                    ? (isEditing ? 'Сохранение...' : 'Регистрация...') 
                    : (isEditing ? 'Сохранить изменения' : 'Зарегистрировать пользователя')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
