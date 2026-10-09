import jsPDF from 'jspdf';
import { ExamQuestion, LabDefinition } from '../types/simulator';

interface PdfReportOptions {
  lab: LabDefinition;
  questions: ExamQuestion[];
  timeSpentSeconds: number;
}

/**
 * Sanitizes strings for standard Helvetica in jsPDF, preserving
 * Spanish accents (á, é, í, ó, ú, ñ, ¿, ¡) while replacing special
 * symbols (arrows, curly quotes, dashes, emojis) that would render improperly.
 */
function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[–—]/g, '-')
    .replace(/[“”""]/g, '"')
    .replace(/[‘’'']/g, "'")
    .replace(/[•●]/g, '*')
    .replace(/[➔➜➝→]/g, '->')
    .replace(/[✓✔]/g, '[OK]')
    .replace(/[✗✘❌]/g, '[X]')
    .replace(/[💡📖🏆🛡️⚠️]/g, '')
    .replace(/[^\x00-\xFF]/g, '');
}

export function generateExamPdfReport({ lab, questions, timeSpentSeconds }: PdfReportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const total = questions.length;
  const correct = questions.filter(q => q.isCorrect).length;
  const failedQuestions = questions.filter(q => !q.isCorrect);
  const percentage = Math.round((correct / total) * 100);
  const passingScore = Math.ceil(total * 0.7);
  const passed = correct >= passingScore;

  const hours = Math.floor(timeSpentSeconds / 3600);
  const minutes = Math.floor((timeSpentSeconds % 3600) / 60);
  const seconds = timeSpentSeconds % 60;
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 5;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(cleanPdfText(`eJPTv2 Official Exam Report - ${lab.codeName}`), margin, 8);
    doc.text(`Pag. ${doc.getNumberOfPages()}`, pageWidth - margin, 8, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, 10, pageWidth - margin, 10);
  };

  // --- 1. COVER / HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('eLearnSecurity Certified Junior Penetration Tester (eJPTv2)', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('REPORTE OFICIAL DE RESULTADOS DE EVALUACION PRACTICA', margin + 6, y + 16);

  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('Comunidad: Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com)', margin + 6, y + 23);

  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(cleanPdfText(`Escenario: ${lab.name} (${lab.codeName})`), margin + 6, y + 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}   |   Tiempo Empleado: ${timeFormatted}`, margin + 6, y + 36);

  y += 48;

  // --- 2. EXECUTIVE RESULT CARD ---
  if (passed) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(244, 63, 94); // rose-500
  }
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(passed ? 5 : 190, passed ? 150 : 24, passed ? 105 : 93);
  doc.text(passed ? 'RESULTADO: ¡APROBADO! CERTIFICACION OBTENIDA' : 'RESULTADO: EXAMEN NO SUPERADO (SUSPENSO)', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Puntaje Obtenido: ${correct} de ${total} preguntas correctas (${percentage}%)   -   Minimo de Aprobacion: ${passingScore}/${total} (70%)`,
    margin + 6,
    y + 16
  );
  doc.text(
    passed
      ? 'El candidato ha demostrado competencia practica en escaneo, explotacion perimetral y pivoting hacia la red interna.'
      : 'El candidato no ha alcanzado la puntuacion minima requerida. Se recomienda revisar el temario y las preguntas fallidas abajo.',
    margin + 6,
    y + 22
  );

  y += 32;

  // --- 3. DOMAIN BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Desglose de Competencias por Dominios de Examen', margin, y);
  y += 5;

  const domains: { name: string; key: string }[] = [
    { name: 'Assessment Methodologies (Reconocimiento & Escaneo)', key: 'Assessment Methodologies' },
    { name: 'Host & Network Pentesting & Pivoting (Sistemas & Redes)', key: 'Host & Network Pentesting' },
    { name: 'Web Application Penetration Testing (Aplicaciones Web)', key: 'Web App Pentesting' }
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Dominio Evaluado', margin + 4, y + 5);
  doc.text('Aciertos / Total', margin + contentWidth - 45, y + 5);
  doc.text('Porcentaje', margin + contentWidth - 16, y + 5);
  y += 8;

  domains.forEach(d => {
    const dQuestions = questions.filter(q => q.domain === d.key);
    const dTotal = dQuestions.length;
    const dCorrect = dQuestions.filter(q => q.isCorrect).length;
    const dPct = dTotal > 0 ? Math.round((dCorrect / dTotal) * 100) : 0;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(cleanPdfText(d.name), margin + 4, y + 5);
    doc.text(`${dCorrect} / ${dTotal}`, margin + contentWidth - 45, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dPct >= 70 ? 16 : 225, dPct >= 70 ? 140 : 29, dPct >= 70 ? 90 : 72);
    doc.text(`${dPct}%`, margin + contentWidth - 16, y + 5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);
    y += 8;
  });

  y += 6;

  // --- 4. DETAILED REVIEW OF FAILED QUESTIONS ---
  checkPageOverflow(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. Analisis de Preguntas Fallidas (${failedQuestions.length} de ${total})`, margin, y);
  y += 5;

  if (failedQuestions.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text('¡Excelente! No has tenido ninguna pregunta fallida. Has respondido el 100% correctamente.', margin + 6, y + 9);
    y += 20;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'A continuacion se detallan las preguntas donde se erro la respuesta, incluyendo la solucion tecnica oficial para estudio:',
      margin,
      y
    );
    y += 6;

    failedQuestions.forEach((q) => {
      const qText = cleanPdfText(`P${q.id}. [${q.domain}] ${q.question}`);
      const expText = cleanPdfText(`Explicacion tecnica oficial: ${q.explanation}`);

      // Calculate needed height for this question
      const questionLines = doc.splitTextToSize(qText, contentWidth - 12);
      const explanationLines = doc.splitTextToSize(expText, contentWidth - 12);
      
      const questionBoxHeight = 15 + (questionLines.length * 4.2) + (explanationLines.length * 3.8) + 6;
      checkPageOverflow(questionBoxHeight);

      // Question container box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, questionBoxHeight, 2, 2, 'F');
      
      // Left alert line
      doc.setFillColor(244, 63, 94);
      doc.rect(margin, y, 2.5, questionBoxHeight, 'F');

      let innerY = y + 5;

      // Question title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(questionLines, margin + 6, innerY);
      innerY += questionLines.length * 4.2 + 2;

      // User answer vs Correct answer
      let userAnsText = 'Sin responder';
      if (q.userAnswer !== undefined) {
        if (q.isFlagQuestion) {
          userAnsText = String(q.userAnswer);
        } else if (typeof q.userAnswer === 'number' && q.options[q.userAnswer]) {
          userAnsText = `${String.fromCharCode(65 + q.userAnswer)}. ${q.options[q.userAnswer]}`;
        }
      }

      let correctAnsText = '';
      if (q.isFlagQuestion) {
        correctAnsText = q.options[0];
      } else if (typeof q.correctAnswer === 'number' && q.options[q.correctAnswer]) {
        correctAnsText = `${String.fromCharCode(65 + q.correctAnswer)}. ${q.options[q.correctAnswer]}`;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(cleanPdfText(`Tu respuesta: ${userAnsText}`), margin + 6, innerY);
      innerY += 4.5;

      doc.setTextColor(16, 140, 90); // emerald-700
      doc.setFont('helvetica', 'bold');
      doc.text(cleanPdfText(`Respuesta Correcta: ${correctAnsText}`), margin + 6, innerY);
      innerY += 4.5;

      // Explanation
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(explanationLines, margin + 6, innerY);

      y += questionBoxHeight + 4;
    });
  }

  // --- 5. FOOTER / CERTIFICATION BADGE ---
  checkPageOverflow(25);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, margin + contentWidth, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Auditoria eJPTv2 - Desarrollado para la comunidad de Un Fantasma en el Sistema', margin, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    cleanPdfText(`Recursos y formacion en https://www.unfantasmaenelsistema.com | Laboratorio: ${lab.codeName} | Hash de sesion: ${Math.random().toString(36).substring(2, 12).toUpperCase()}`),
    margin,
    y + 13
  );

  // Save PDF
  const sanitizedLabName = lab.codeName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Reporte_Examen_eJPTv2_${sanitizedLabName}_${dateStr}.pdf`);
}

