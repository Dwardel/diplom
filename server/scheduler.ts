
import cron from 'node-cron';
import { storage } from './storage';
import { queryClient } from '@/lib/queryClient';

export function initializeScheduler() {
  // Запускаем задачу каждую минуту для проверки расписания
  cron.schedule('* * * * *', async () => {
    try {
      
      await createClassesFromSchedule();
    } catch (error) {
      console.error('Ошибка при создании занятий из расписания:', error);
    }
  });

  console.log('Планировщик задач инициализирован');
}

async function createClassesFromSchedule() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, и т.д.
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM формат
  const currentWeek = getWeekNumber(now);
  const isOddWeek = currentWeek % 2 === 1;

  // Получаем все активные расписания
  const schedules = await storage.getAllSchedules();
  
  if (!schedules) return;

  for (const schedule of schedules) {
    // Проверяем, соответствует ли текущий день недели расписанию
    if (schedule.dayOfWeek !== currentDay) continue;

    // Проверяем тип недели
    if (schedule.weekType === 'odd' && !isOddWeek) continue;
    if (schedule.weekType === 'even' && isOddWeek) continue;

    // Проверяем время начала (создаем занятие за 5 минут до начала)
    const scheduleTime = schedule.startTime;
    const scheduleDate = new Date();
    const [scheduleHours, scheduleMinutes] = scheduleTime.split(':');
    scheduleDate.setHours(parseInt(scheduleHours), parseInt(scheduleMinutes), 0, 0);
    
    const timeDiff = Math.abs(now.getTime() - scheduleDate.getTime());
    
    // Если разница меньше минуты, создаем занятие
    if (timeDiff <= 60000) { // 60 секунд
      await createClassFromSchedule(schedule, now);
    }
  }
}

async function createClassFromSchedule(schedule: any, currentDate: Date) {
  try {
      const now = new Date();
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, и т.д.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM формат
    const currentWeek = getWeekNumber(now);
    const isOddWeek = currentWeek % 2 === 1;
    // Проверяем, не создано ли уже занятие на сегодня для этого расписания
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Получаем все занятия на сегодня для данной группы и предмета
    const existingClasses = await storage.getAllClasses();
    const existingSchedules = await storage.getAllSchedules();
    console.log(existingSchedules)
    console.log('todayday', today.getDay())
   
    const todaySchedules = existingSchedules?.filter(s => s.dayOfWeek === today.getDay()).
    filter(s => (s.weekType === (isOddWeek ? 'odd' : 'even') || s.weekType === 'both'));
    const todayClasses = existingClasses?.filter(cls => {
      const classDate = new Date(cls.date);
      
      return classDate >= today && 
             classDate < tomorrow && 
             cls.groupId === schedule.groupId && 
             cls.subjectId === schedule.subjectId &&
             cls.teacherId === schedule.teacherId;
    });

    if (todayClasses && todaySchedules && todayClasses.length >= todaySchedules.length) {
      
      console.log('todaySchedules', todaySchedules)
      console.log(`Занятие уже создано для пары ${schedule.id} на сегодня`);
      return;
    }

    // Создаем дату и время начала занятия
    const startDateTime = new Date(currentDate);
    const [startHours, startMinutes] = schedule.startTime.split(':');
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

    // Создаем дату и время окончания занятия
    const endDateTime = new Date(currentDate);
    const [endHours, endMinutes] = schedule.endTime.split(':');
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

   
   
    const classData = {
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      groupId: schedule.groupId,
      classroom: schedule.classroom,
      date: currentDate,
      startTime: startDateTime,
      endTime: endDateTime,
      
      isActive: true
    };

    const newClass = await storage.createClass(classData);
    queryClient.invalidateQueries({
        queryKey: ["/api/teacher/classes"]});
    console.log(`Создано новое занятие из расписания: ${JSON.stringify({
      subject: schedule.subjectId,
      group: schedule.groupId,
      teacher: schedule.teacherId,
      time: schedule.startTime,
      classroom: schedule.classroom
    })}`);

  } catch (error) {
    console.error('Ошибка при создании занятия из расписания:', error);
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
