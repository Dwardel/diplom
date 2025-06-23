
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getQueryFn } from '@/lib/queryClient';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { Schedule, Subject, Group } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function TeacherSchedule() {
  const {user} = useAuth()
  const [, setLocation] = useLocation();
  // Fetch teacher's schedule
  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const isLoading = schedulesLoading || subjectsLoading || groupsLoading;

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

  // Group schedules by day
  const schedulesByDay = schedules?.reduce((acc, schedule) => {
    const day = schedule.dayOfWeek;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(schedule);
    return acc;
  }, {} as { [key: number]: Schedule[] }) || {};

  return (
    <div className="mb-6">
       <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { user?.role === 'student' ? setLocation("/student") : setLocation("/teacher")}}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
      <h2 className="text-2xl font-medium text-gray-800 mb-4">Мое расписание</h2>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-500">Загрузка расписания...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {getDayName(day)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedulesByDay[day] && schedulesByDay[day].length > 0 ? (
                  <div className="space-y-4">
                    {schedulesByDay[day].map(schedule => {
                      const subject = subjects?.find(s => s.id === schedule.subjectId);
                      const group = groups?.find(g => g.id === schedule.groupId);
                      
                      return (
                        <div key={schedule.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-lg">{subject?.name || 'Неизвестный предмет'}</h4>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {group?.name || 'Неизвестная группа'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="mr-1 h-4 w-4" />
                              Аудитория {schedule.classroom}
                            </div>
                            <div>
                              {getWeekTypeName(schedule.weekType || 'both')}
                            </div>
                            <div>
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Нет занятий</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
