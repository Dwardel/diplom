import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { School } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Group, loginSchema, registerSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export default function AuthPage() {
  const { login, register: register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const form = useForm({
    resolver: zodResolver(isRegistering ? registerSchema : loginSchema),
    defaultValues: {
      username: "",
      password1: "",
      ...(isRegistering && {
        firstName: "",
        lastName: "",
        middleName: "",
        groupId: '',
      }),
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);

    try {
      if (isRegistering) {
        console.log(data)  
        data.role = "student";
       
        console.log(data.groupId);
        const newUser = await register(data);
        toast({
          title: "Регистрация успешна",
          description: `Добро пожаловать, ${
            newUser.firstName || newUser.username
          }!`,
        });
        window.location.href = "/student";
      } else {
        const user = await login(data.username, data.password1);
        toast({
          title: "Успешный вход",
          description: `Добро пожаловать, ${user.firstName || user.username}!`,
        });

        const role = user.role?.toLowerCase();
        switch (role) {
          case "student":
            window.location.href = "/student";
            break;
          case "teacher":
            window.location.href = "/teacher";
            break;
          case "admin":
            window.location.href = "/admin";
            break;
          default:
            window.location.href = "/";
        }
      }
    } catch (error: any) {
      toast({
        title: isRegistering ? "Ошибка регистрации" : "Ошибка входа",
        description: error.message || "Проверьте введённые данные",
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
            <School className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            AttendTrack
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {isRegistering
              ? "Создайте новый аккаунт"
              : "Система учета посещаемости"}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isRegistering && (
                <>
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="firstName">Имя</Label>
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
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="lastName">Фамилия</Label>
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
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="middleName">Отчество</Label>
                        <FormControl>
                          <Input
                            id="middleName"
                            placeholder="Введите отчество"
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
      <Label htmlFor="groupId">Группа</Label>
      <FormControl>
        <Select
          onValueChange={(val) => {
            field.onChange(val ? Number(val) : undefined);
          }}
          value={field.value !== undefined ? String(field.value) : ""}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

                </>
              )}

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="username">Имя пользователя</Label>
                    <FormControl>
                      <Input
                        id="username"
                        placeholder="Введите имя пользователя"
                        disabled={isLoading}
                        {...field}
                        autoComplete="username"
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
                    <Label htmlFor="password">Пароль</Label>
                    <FormControl>
                      <Input
                        id="password1"
                        type="password"
                        placeholder="Введите пароль"
                        disabled={isLoading}
                        {...field}
                        autoComplete={
                          isRegistering ? "new-password" : "current-password"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? isRegistering
                    ? "Регистрация..."
                    : "Вход..."
                  : isRegistering
                  ? "Зарегистрироваться"
                  : "Войти"}
              </Button>

              <div className="text-sm text-center mt-2">
                {isRegistering ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    form.reset(); // очищаем поля
                  }}
                >
                  {isRegistering ? "Войти" : "Зарегистрироваться"}
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
