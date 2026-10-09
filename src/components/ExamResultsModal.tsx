import React, { useState } from 'react';
import { ExamQuestion, LabDefinition } from '../types/simulator';
import { generateExamPdfReport } from '../utils/generatePdfReport';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  X, 
  FileDown, 
  Check, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface ExamResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ExamQuestion[];
  onResetExam: () => void;
  totalTimeSpentSeconds: number;
  lab: LabDefinition;
  onOpenPentestReport?: () => void;
}

export const ExamResultsModal: React.FC<ExamResultsModalProps> = ({
  isOpen,
  onClose,
  questions,
  onResetExam,
  totalTimeSpentSeconds,
  lab,
  onOpenPentestReport
}) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  if (!isOpen) return null;

  const total = questions.length;
  const correct = questions.filter(q => q.isCorrect).length;
  const failedCount = total - correct;
  const percentage = Math.round((correct / total) * 100);
  const passingScore = Math.ceil(total * 0.7); // 70%+ passing grade
  const passed = correct >= passingScore;

  const d1Total = questions.filter(q => q.domain === 'Assessment Methodologies').length;
  const d1Correct = questions.filter(q => q.domain === 'Assessment Methodologies' && q.isCorrect).length;

  const d2Total = questions.filter(q => q.domain === 'Host & Network Pentesting').length;
  const d2Correct = questions.filter(q => q.domain === 'Host & Network Pentesting' && q.isCorrect).length;

  const d3Total = questions.filter(q => q.domain === 'Web App Pentesting').length;
  const d3Correct = questions.filter(q => q.domain === 'Web App Pentesting' && q.isCorrect).length;

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownloadPdf = () => {
    setIsPdfGenerating(true);
    try {
      generateExamPdfReport({
        lab,
        questions,
        timeSpentSeconds: totalTimeSpentSeconds
      });
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Header */}
        <div className="text-center space-y-3 pb-5 border-b border-slate-800">
          <div className="inline-flex p-3 rounded-full bg-slate-800/80 border border-slate-700 shadow-xl">
            {passed ? (
              <Award className="w-14 h-14 text-emerald-400 animate-bounce" />
            ) : (
              <XCircle className="w-14 h-14 text-rose-400" />
            )}
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              eLearnSecurity Certified Junior Penetration Tester (eJPTv2)
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1">
              {passed ? '¡ENHORABUENA! HAS SUPERADO EL EXAMEN' : 'EXAMEN NO SUPERADO'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {passed
                ? 'Has demostrado destrezas reales en reconocimiento, pivoting de red, explotación de servicios y elevación de privilegios.'
                : `Se requiere un mínimo del 70% (${passingScore}/${total} preguntas) para obtener la certificación. ¡Repasa la guía y vuelve a intentarlo!`}
            </p>
          </div>

          {/* Grade Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Calificación Oficial:</span>
            <span className={`text-2xl font-black font-mono ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {correct} / {total} ({percentage}%)
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {passed ? 'CERTIFICADO' : 'SUSPENSO'}
            </span>
          </div>
        </div>

        {/* Domain Breakdown */}
        <div className="py-4 space-y-2.5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Desglose por Áreas de Evaluación
            </h3>
            {failedCount > 0 && (
              <span className="text-xs text-rose-400 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {failedCount} preguntas con fallos para estudio
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Domain 1 */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <span className="font-semibold text-slate-200">1. Assessment Methodologies</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{d1Correct} / {d1Total}</span>
                <span className="text-slate-400">({Math.round((d1Correct / d1Total) * 100)}%)</span>
              </div>
            </div>

            {/* Domain 2 */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <span className="font-semibold text-slate-200">2. Host & Network Pentesting & Pivoting</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{d2Correct} / {d2Total}</span>
                <span className="text-slate-400">({Math.round((d2Correct / d2Total) * 100)}%)</span>
              </div>
            </div>

            {/* Domain 3 */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <span className="font-semibold text-slate-200">3. Web Application Penetration Testing</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{d3Correct} / {d3Total}</span>
                <span className="text-slate-400">({Math.round((d3Correct / d3Total) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Download Callout Box */}
        <div className="py-3 px-4 my-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Reporte Técnico Oficial en PDF</div>
              <div className="text-[11px] text-slate-400">
                Incluye la nota final, estadísticas y el análisis detallado de cada pregunta fallida con soluciones.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenPentestReport && (
              <button
                onClick={onOpenPentestReport}
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                title="Generar informe profesional de auditoría (Executive Pentest Report) para portafolio"
              >
                <span>Informe Pentest Portafolio</span>
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              {pdfDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Descargado!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>{isPdfGenerating ? 'Generando...' : 'Descargar PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Time spent & Actions */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Tiempo de sesión: <span className="text-slate-200 font-bold">{formatTime(totalTimeSpentSeconds)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onResetExam();
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Simulación
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cerrar
            </button>
          </div>
        </div>

        {/* Community Credit Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <img 
              src="/icono.png" 
              alt="Logo Un Fantasma en el Sistema" 
              className="w-5 h-5 object-contain" 
              referrerPolicy="no-referrer" 
            />
            <span className="text-slate-400">Desarrollado para la comunidad de</span>
            <span className="font-semibold text-white">Un Fantasma en el Sistema</span>
          </div>
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors text-[11px]"
            title="Visitar www.unfantasmaenelsistema.com"
          >
            <span>www.unfantasmaenelsistema.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};

export default ExamResultsModal;
