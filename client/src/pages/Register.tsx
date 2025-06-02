import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { School, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

// Схема валидации для регистрации
const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Имя пользователя должно содержать минимум 3 символа"),
    password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
    confirmPassword: z
      .string()
      .min(6, "Пароль должен содержать минимум 6 символов"),
    firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
    lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
    middleName: z.string().optional(),
    groupId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Получаем список групп для выбора
  const { data: groups = [] } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      middleName: "",
      groupId: undefined,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Удаляем поле confirmPassword перед отправкой
      const { confirmPassword, ...registerData } = data;

      // Преобразуем groupId в число, если оно есть
      const payload = {
        ...registerData,
        groupId: data.groupId ? parseInt(data.groupId) : null,
      };

      console.log("Регистрация пользователя:", payload);

      const res = await apiRequest("POST", "/api/auth/register", payload);
      const user = await res.json();

      toast({
        title: "Регистрация успешна",
        description: `Добро пожаловать, ${user.firstName}!`,
      });

      // После успешной регистрации перенаправляем на страницу входа
      setLocation("/login");
    } catch (error) {
      console.error("Ошибка регистрации:", error);
      toast({
        title: "Ошибка регистрации",
        description:
          "Не удалось зарегистрировать пользователя. Возможно, такое имя пользователя уже занято.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-2">
            <User className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Регистрация
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Создайте новую учетную запись студента
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password">Пароль*</Label>
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Введите пароль"
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
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword">
                        Подтверждение пароля*
                      </Label>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Повторите пароль"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 mt-6">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/login")}
                  disabled={isLoading}
                >
                  Уже есть аккаунт? Войти
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
