import type { Express, Request, Response } from "express";
import { storage } from "../storage";

import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import { Buffer } from "buffer";

export async function reportsRoutes(app: Express) { 
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
        if (req.session.userId) {
          next();
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      };
        const hasRole = (roles: string[]) => {
          return (req: Request, res: Response, next: Function) => {
            if (req.session.userId && roles.includes(req.session.role || "")) {
              next();
            } else {
              res.status(403).json({ message: "Forbidden" });
            }
          };
        };

        app.get(
            "/api/admin/reports",
            isAuthenticated,
            hasRole(["admin", 'teacher']),
            async (req: Request, res: Response) => {
              try {
                const id = req.session.userId!;
                const reports = await storage.getAllReports(id);
                res.json(reports);
              } catch (err) {
                console.error("Ошибка получения отчетов:", err);
                res
                  .status(500)
                  .json({ message: "Ошибка сервера при получении отчетов" });
              }
            }
          );

           app.post(
              "/api/admin/reports",
              isAuthenticated,
              hasRole(["admin", 'teacher']),
              async (req: Request, res: Response) => {
                try {
                  const { name, type, period, format, startDate, endDate, data } =
                    req.body;
          
                  const reportData = {
                    name,
                    type,
                    period,
                    format,
                    createdBy: req.session.userId!,
                    data: data || {},
                  };
          
                  const [newReport] = await storage.createReport(reportData);
          
                  res.status(201).json(newReport);
                } catch (err) {
                  console.error("Ошибка создания отчета:", err);
                  res.status(500).json({ message: "Ошибка сервера при создании отчета" });
                }
              }
            );
          
            app.get(
                "/api/admin/reports/:id/download",
                isAuthenticated,
                hasRole(["admin", 'teacher']),
                async (req: Request, res: Response) => {
                  try {
                    const reportId = parseInt(req.params.id);
                    const report = await storage.getReportById(reportId);
            
                    if (!report) {
                      return res.status(404).json({ message: "Отчет не найден" });
                    }
            
                    const filename = `${report.name}_${
                      new Date().toISOString().split("T")[0]
                    }`;
            
                    switch (report.format) {
                      case "pdf":
                        await generatePDFReport(report, res, filename);
                        break;
                      case "excel":
                        const excelBuffer = await generateExcelContent(report);
                        res.setHeader(
                          "Content-Type",
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        );
                        res.setHeader(
                          "Content-Disposition",
                          `attachment; filename="${filename}.xlsx"`
                        );
                        res.send(excelBuffer);
                        break;
                      case "csv":
                        const csvContent = generateCSVContent(report);
                        res.setHeader("Content-Type", "text/csv; charset=utf-8");
                        res.setHeader(
                          "Content-Disposition",
                          `attachment; filename="${filename}.csv"`
                        );
                        res.send("\uFEFF" + csvContent);
                        break;
                      default:
                        const jsonContent = JSON.stringify(report.data, null, 2);
                        res.setHeader("Content-Type", "application/json");
                        res.setHeader(
                          "Content-Disposition",
                          `attachment; filename="${filename}.json"`
                        );
                        res.send(jsonContent);
                    }
                  } catch (err) {
                    console.error("Ошибка скачивания отчета:", err);
                    res
                      .status(500)
                      .json({ message: "Ошибка сервера при скачивании отчета" });
                  }
                }
              );
              async function generatePDFReport(
                report: any,
                res: Response,
                filename: string
              ) {
                try {
                  const doc = new PDFDocument({ margin: 50 });
            
                  const safeFilename = encodeURIComponent(`${filename}.pdf`);
                  res.setHeader("Content-Type", "application/pdf");
                  res.setHeader(
                    "Content-Disposition",
                    `attachment; filename*=UTF-8''${safeFilename}`
                  );
                  res.flushHeaders();
                  const __filename = fileURLToPath(import.meta.url);
                  const __dirname = path.dirname(__filename);
                  // Стримим PDF в ответ
                  doc.pipe(res);
            
                  // 📝 Заголовок
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .fontSize(20)
                    .text("Отчет системы посещаемости", { align: "center" });
                  doc.moveDown();
            
                  // 📄 Инфо
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .fontSize(14)
                    .text("Информация об отчете:");
                  doc.fontSize(12);
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .text(`Название: ${report.name}`);
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .text(`Тип: ${getReportTypeLabel(report.type)}`);
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .text(`Период: ${getReportPeriodLabel(report.period)}`);
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .text(
                      `Дата создания: ${new Date(report.createdAt).toLocaleDateString(
                        "ru-RU"
                      )}`
                    );
                  doc.moveDown();
            
                  if (report.type === "attendance") {
                    doc
                      .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                      .text(`Всего занятий: ${report.data.totalClasses}`);
                    doc
                      .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                      .text(`Всего студентов: ${report.data.totalStudents}`);
                    doc.moveDown();
                    if (report.data?.attendanceByGroup?.length) {
                      const fontPath = path.join(__dirname, "../fonts", "TIMES.TTF");
                      doc
                        .font(fontPath)
                        .fontSize(14)
                        .text("Посещаемость по группам:", { underline: true });
                      doc.moveDown();
            
                      report.data.attendanceByGroup.forEach((group: any) => {
                        doc
                          .font(fontPath)
                          .fontSize(12)
                          .text(`Группа: ${group.groupName || "Не указано"}`);
            
                        if (group.students?.length) {
                          group.students.forEach((student: any) => {
                            const percent = (student.attendance * 100).toFixed(1); // округляем до 1 знака
                            doc
                              .font(fontPath)
                              .fontSize(10)
                              .text(`  - ${student.studentName}: ${percent}%`);
                          });
                        } else {
                          doc.font(fontPath).fontSize(10).text("  - Нет студентов");
                        }
            
                        doc.moveDown();
                      });
                    }
                  } else if (report.type === "stats") {
                    if (report.data?.teacherActivity?.length) {
                      const fontPath = path.join(__dirname, "../fonts", "TIMES.TTF");
            
                      doc
                        .font(fontPath)
                        .fontSize(14)
                        .text("Активность преподавателей:", { underline: true });
                      doc.moveDown();
            
                      doc
                        .font(fontPath)
                        .fontSize(12)
                        .text(`Всего преподавателей: ${report.data.totalTeachers}`);
                      doc
                        .font(fontPath)
                        .fontSize(12)
                        .text(
                          `Среднее количество занятий на преподавателя: ${report.data.classesPerTeacher}`
                        );
                      doc.moveDown();
            
                      report.data.teacherActivity.forEach((teacher: any) => {
                        doc
                          .font(fontPath)
                          .fontSize(10)
                          .text(
                            `  - ${teacher.teacherName}: ${teacher.classesCount} занятий`
                          );
                      });
            
                      doc.moveDown();
                    }
                  } else if (report.type === "groups") {
                    if (report.data?.studentsPerGroup?.length) {
                      const fontPath = path.join(__dirname, "../fonts", "TIMES.TTF");
            
                      doc
                        .font(fontPath)
                        .fontSize(14)
                        .text("Количество студентов по группам:", { underline: true });
                      doc.moveDown();
            
                      doc
                        .font(fontPath)
                        .fontSize(12)
                        .text(`Всего групп: ${report.data.totalGroups}`);
                      doc.moveDown();
            
                      report.data.studentsPerGroup.forEach((group: any) => {
                        doc
                          .font(fontPath)
                          .fontSize(10)
                          .text(
                            `  - ${group.groupName}: ${group.studentsCount} студент(ов)`
                          );
                      });
            
                      doc.moveDown();
                    }
                  } else if (report.type === "subjects") {
                    if (report.data?.subjectPopularity?.length) {
                      const fontPath = path.join(__dirname, "../fonts", "TIMES.TTF");
            
                      doc
                        .font(fontPath)
                        .fontSize(14)
                        .text("Статистика по предметам:", { underline: true });
                      doc.moveDown();
            
                      doc
                        .font(fontPath)
                        .fontSize(12)
                        .text(`Всего предметов: ${report.data.totalSubjects}`);
                      doc.moveDown();
            
                      report.data.subjectPopularity.forEach((subject: any) => {
                        doc
                          .font(fontPath)
                          .fontSize(10)
                          .text(
                            `  - ${subject.subjectName}: ${subject.classesCount} занят(ий)`
                          );
                      });
            
                      doc.moveDown();
                    }
                  } else {
                    console.log("Unknown report type");
                  }
            
                  // 📎 Футер
                  doc.moveDown();
                  doc
                    .font(path.join(__dirname, "../fonts", "TIMES.TTF"))
                    .fontSize(8)
                    .text(
                      `Отчет сгенерирован ${new Date().toLocaleString("ru-RU", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}`,
                      { align: "center",  }
                    );
            
                  doc.end(); // Закрываем документ
                } catch (err) {
                  console.error("Ошибка при генерации PDF:", err);
                  if (!res.headersSent) {
                    res.status(500).send("Ошибка при генерации PDF");
                  }
                }
              }
             app.delete(
    "/api/admin/reports/:id",
    isAuthenticated,
    hasRole(["admin", 'teacher']),
    async (req: Request, res: Response) => {
      try {
        const reportId = parseInt(req.params.id);

        const report = await storage.getReportById(reportId);
        if (!report) {
          return res.status(404).json({ message: "Отчет не найден" });
        }

        await storage.deleteReport(reportId);

        res.status(200).json({ message: "Отчет успешно удален" });
      } catch (err) {
        console.error("Ошибка удаления отчета:", err);
        res.status(500).json({ message: "Ошибка сервера при удалении отчета" });
      }
    }
  );

  function getReportTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      attendance: "Посещаемость",
      stats: "Статистика по преподавателям",
      groups: "Статистика по группа",
      subjects: "Статистика по предметам",
    };
    return types[type] || type;
  }

  function getReportPeriodLabel(period: string): string {
    const periods: { [key: string]: string } = {
      day: "День",
      week: "Неделя",
      month: "Месяц",
      quarter: "Квартал",
      year: "Год",
    };
    return periods[period] || period;
  }

  function generateCSVContent(report: any): string {
    let csv = `Название отчета,${report.name}\nТип,${getReportTypeLabel(
      report.type
    )}\nПериод,${getReportPeriodLabel(report.period)}\nДата создания,${new Date(
      report.createdAt
    ).toLocaleDateString("ru-RU")}\n\n`;
    if (report.type === "attendance") {
      csv += `Всего занятий,${report.data.totalClasses}\nВсего студентов,${report.data.totalStudents}\n\n`;

      if (report.data?.attendanceByGroup?.length) {
        csv += "Группа,Студент,Посещаемость (%)\n";
        for (const group of report.data.attendanceByGroup) {
          if (group.students?.length) {
            for (const student of group.students) {
              const percent = (student.attendance * 100).toFixed(1);
              csv += `"${group.groupName}","${student.studentName}",${percent}\n`;
            }
          } else {
            csv += `"${group.groupName}","Нет студентов",0\n`;
          }
        }
      }
      return csv;
    } else if (report.type === "stats") {
      if (report.data?.totalTeachers !== undefined) {
        csv = `Всего преподавателей,${report.data.totalTeachers}\n`;
      }
      if (report.data?.classesPerTeacher !== undefined) {
        csv += `Среднее количество занятий на преподавателя,${report.data.classesPerTeacher}\n\n`;
      }

      if (report.data?.teacherActivity?.length) {
        csv += "Преподаватель,Количество занятий\n";
        for (const teacher of report.data.teacherActivity) {
          csv += `"${teacher.teacherName}",${teacher.classesCount}\n`;
        }
        csv += "\n";
      }
      return csv;
    } else if (report.type === "groups") {
      if (report.data?.totalGroups !== undefined) {
        csv += `Всего групп,${report.data.totalGroups}\n\n`;
      }

      if (report.data?.studentsPerGroup?.length) {
        csv += "Группа,Количество студентов\n";
        for (const group of report.data.studentsPerGroup) {
          csv += `"${group.groupName}",${group.studentsCount}\n`;
        }
        csv += "\n";
      }
      return csv;
    } else if (report.type === "subjects") {
      if (report.data?.totalSubjects !== undefined) {
        csv += `Всего предметов,${report.data.totalSubjects}\n\n`;
      }

      if (report.data?.subjectPopularity?.length) {
        csv += "Предмет,Количество занятий\n";
        for (const subject of report.data.subjectPopularity) {
          csv += `"${subject.subjectName}",${subject.classesCount}\n`;
        }
        csv += "\n";
      }
      return csv;
    } else {
      console.log("Unknown report type");
      return "";
    }
  }

  async function generateExcelContent(report: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Отчет");

    worksheet.addRow(["Название отчета", report.name]);
    worksheet.addRow(["Тип", getReportTypeLabel(report.type)]);
    worksheet.addRow(["Период", getReportPeriodLabel(report.period)]);
    worksheet.addRow([
      "Дата создания",
      new Date(report.createdAt).toLocaleDateString("ru-RU"),
    ]);
    worksheet.addRow([]);

    if (report.type === "attendance") {
      worksheet.addRow(["Всего занятий", report.data.totalClasses]);
      worksheet.addRow(["Всего студентов", report.data.totalStudents]);
      worksheet.addRow([]);

      if (report.data?.attendanceByGroup?.length) {
        worksheet.addRow(["Группа", "Студент", "Посещаемость (%)"]);
        for (const group of report.data.attendanceByGroup) {
          if (group.students?.length) {
            for (const student of group.students) {
              const percent = (student.attendance * 100).toFixed(1);
              worksheet.addRow([group.groupName, student.studentName, percent]);
            }
          } else {
            worksheet.addRow([group.groupName, "Нет студентов", "0"]);
          }
        }
      }
    } else if (report.type === "stats") {
      worksheet.addRow(["Всего преподавателей", report.data.totalTeachers]);
      worksheet.addRow([
        "Среднее количество занятий на преподавателя",
        report.data.classesPerTeacher,
      ]);
      worksheet.addRow([]);

      if (report.data?.teacherActivity?.length) {
        worksheet.addRow(["Преподаватель", "Количество занятий"]);
        for (const teacher of report.data.teacherActivity) {
          worksheet.addRow([teacher.teacherName, teacher.classesCount]);
        }
        worksheet.addRow([]);
      }
    } else if (report.type === "groups") {
      worksheet.addRow(["Всего групп", report.data.totalGroups]);
      worksheet.addRow([]);

      if (report.data?.studentsPerGroup?.length) {
        worksheet.addRow(["Группа", "Количество студентов"]);
        for (const group of report.data.studentsPerGroup) {
          worksheet.addRow([group.groupName, group.studentsCount]);
        }
        worksheet.addRow([]);
      }
    } else if (report.type === "subjects") {
      worksheet.addRow(["Всего предметов", report.data.totalSubjects]);
      worksheet.addRow([]);

      if (report.data?.subjectPopularity?.length) {
        worksheet.addRow(["Предмет", "Количество занятий"]);
        for (const subject of report.data.subjectPopularity) {
          worksheet.addRow([subject.subjectName, subject.classesCount]);
        }
        worksheet.addRow([]);
      }
    } else {
      console.log("Unknown report type:", report.type);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

}