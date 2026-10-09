import React, { useState } from 'react';
import { ExamQuestion } from '../types/simulator';
import { 
  CheckCircle2, 
  XCircle, 
  Award, 
  Lightbulb, 
  BookOpen, 
  Flag, 
  Filter, 
  Check, 
  Send,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  GraduationCap,
  Target,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

export function getQuestionTargetHost(q: ExamQuestion): { id: string; label: string; subnet: 'dmz' | 'internal' | 'general' } {
  const txt = (q.question + ' ' + q.hint + ' ' + q.explanation).toLowerCase();
  if (txt.includes('192.168.100.50') || txt.includes('target-web-01') || txt.includes('lfi') || txt.includes('sysadmin')) {
    return { id: '192.168.100.50', label: '192.168.100.50 (Web Apache)', subnet: 'dmz' };
  }
  if (txt.includes('192.168.100.55') || txt.includes('target-ftp-02') || txt.includes('vsftpd') || txt.includes('mike')) {
    return { id: '192.168.100.55', label: '192.168.100.55 (FTP vsftpd)', subnet: 'dmz' };
  }
  if (txt.includes('192.168.100.60') || txt.includes('target-gateway-03') || txt.includes('pivotuser') || txt.includes('dual-homed') || txt.includes('samba')) {
    return { id: '192.168.100.60', label: '192.168.100.60 (Gateway Pivot)', subnet: 'dmz' };
  }
  if (txt.includes('10.10.10.20') || txt.includes('target-db-04') || txt.includes('corp_internal') || txt.includes('itadmin') || txt.includes('sql')) {
    return { id: '10.10.10.20', label: '10.10.10.20 (DB MySQL)', subnet: 'internal' };
  }
  if (txt.includes('10.10.10.25') || txt.includes('target-win-05') || txt.includes('psexec') || txt.includes('administrator') || txt.includes('windows server') || txt.includes('rdp')) {
    return { id: '10.10.10.25', label: '10.10.10.25 (Windows 2019)', subnet: 'internal' };
  }
  if (txt.includes('10.10.10.30') || txt.includes('target-vault-06') || txt.includes('badblue')) {
    return { id: '10.10.10.30', label: '10.10.10.30 (Vault BadBlue)', subnet: 'internal' };
  }
  if (txt.includes('dmz') || txt.includes('192.168.100.0') || txt.includes('netdiscover') || txt.includes('barrido')) {
    return { id: 'dmz-general', label: 'Red DMZ (General / Sweep)', subnet: 'dmz' };
  }
  if (txt.includes('pivoting') || txt.includes('proxychains') || txt.includes('10.10.10.0') || txt.includes('autoroute')) {
    return { id: 'pivoting', label: 'Pivoting & Red Interna', subnet: 'internal' };
  }
  return { id: 'general', label: 'Metodología General', subnet: 'general' };
}

const HOST_FILTER_OPTIONS = [
  { id: 'all', label: 'Todos los Hosts' },
  { id: 'dmz-general', label: '🌐 DMZ Sweep' },
  { id: '192.168.100.50', label: '💻 .50 (Web)' },
  { id: '192.168.100.55', label: '📂 .55 (FTP)' },
  { id: '192.168.100.60', label: '🔀 .60 (Gateway)' },
  { id: 'pivoting', label: '🚇 Pivoting' },
  { id: '10.10.10.20', label: '🗄️ .20 (DB SQL)' },
  { id: '10.10.10.25', label: '🪟 .25 (Win2019)' },
  { id: '10.10.10.30', label: '🛡️ .30 (Vault)' },
];

interface ExamQuestionsProps {
  questions: ExamQuestion[];
  onAnswerChange: (questionId: number, answer: number | string) => void;
  onSubmitExam: () => void;
  isPracticeMode: boolean;
  score: number;
}

export const ExamQuestions: React.FC<ExamQuestionsProps> = ({
  questions,
  onAnswerChange,
  onSubmitExam,
  isPracticeMode,
  score
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedHost, setSelectedHost] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unanswered' | 'flag_questions'>('all');
  const [hintLevels, setHintLevels] = useState<Record<number, number>>({});
  const [openExplanations, setOpenExplanations] = useState<Record<number, boolean>>({});
  const [flagInputs, setFlagInputs] = useState<Record<number, string>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1);

  const totalCount = questions.length;
  const answeredCount = questions.filter(q => q.userAnswer !== undefined).length;
  const passingScore = Math.ceil(totalCount * 0.7); // 70% passing grade
  const percentage = Math.round((score / totalCount) * 100);

  const advanceHintLevel = (id: number) => {
    setHintLevels(prev => {
      const current = prev[id] || 0;
      const next = current >= 3 ? 0 : current + 1;
      return { ...prev, [id]: next };
    });
  };

  const getTieredHints = (q: ExamQuestion): [string, string, string] => {
    if (q.tieredHints && q.tieredHints.length === 3) {
      return q.tieredHints;
    }
    const l1 = `[Nivel 1 - Reconocimiento]: Examina los puertos abiertos y banners de la máquina en Nmap (-sV -sC). Identifica qué servicio específico está implicado.`;
    const l2 = `[Nivel 2 - Vector de Vulnerabilidad]: ${q.hint}`;
    const l3 = `[Nivel 3 - Explotación Paso a Paso]: Inspecciona los parámetros o archivos relacionados. Solución orientada a: ${typeof q.correctAnswer === 'number' ? q.options[q.correctAnswer] : q.correctAnswer}.`;
    return [l1, l2, l3];
  };

  const toggleExplanation = (id: number) => {
    setOpenExplanations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFlagSubmit = (questionId: number) => {
    const val = flagInputs[questionId]?.trim();
    if (val) {
      onAnswerChange(questionId, val);
    }
  };

  let filteredQuestions = questions;
  if (selectedCategory !== 'all') {
    filteredQuestions = filteredQuestions.filter(q => q.domain === selectedCategory);
  }
  if (selectedHost !== 'all') {
    filteredQuestions = filteredQuestions.filter(q => getQuestionTargetHost(q).id === selectedHost);
  }
  if (filterStatus === 'unanswered') {
    filteredQuestions = filteredQuestions.filter(q => q.userAnswer === undefined);
  } else if (filterStatus === 'flag_questions') {
    filteredQuestions = filteredQuestions.filter(q => q.isFlagQuestion);
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Score Banner */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Cuestionario Oficial eJPTv2 ({totalCount} Preguntas)
            </h2>
            {isPracticeMode ? (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> MODO TUTOR (Pistas 1-3)
              </span>
            ) : (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" /> SIMULACRO REAL 48H (ESTRICTO)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPracticeMode 
              ? 'Modo formativo: Desbloquea hasta 3 niveles de pistas progresivas y revisa soluciones.'
              : 'Modo estricto: Pistas y correcciones ocultas hasta entregar el examen oficial.'}
          </p>
        </div>

        {/* Score & Progress */}
        <div className="flex items-center gap-4 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Progreso Examen</div>
            <div className="text-xs font-mono font-bold text-white">
              {answeredCount} / {totalCount} respondidas
            </div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              {isPracticeMode ? 'Puntuación Tutor' : 'Evaluación Oficial'}
            </div>
            <div className="flex items-center gap-1.5">
              {isPracticeMode ? (
                <>
                  <span className={`text-base font-mono font-bold ${score >= passingScore ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {score} / {totalCount} ({percentage}%)
                  </span>
                  {score >= passingScore && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                      APROBADO
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-mono font-semibold text-cyan-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400" /> Oculta hasta entrega
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onSubmitExam}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-1.5 ml-2 cursor-pointer"
            title="Finalizar el examen para ver la evaluación y descargar el Reporte Técnico Oficial en PDF"
          >
            <FileDown className="w-3.5 h-3.5" /> Finalizar y Reporte PDF
          </button>
        </div>
      </div>

      {/* Quick Jump Question Grid (1..45) */}
      <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
          <span>Navegador Rápido de Preguntas (1 - {totalCount}):</span>
          <span>{totalCount - answeredCount} pendientes</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {questions.map((q) => {
            const isAnswered = q.userAnswer !== undefined;
            const isCorrect = q.isCorrect;
            const isActive = q.id === activeQuestionId;

            let pillClass = 'bg-slate-800/90 text-slate-400 border-slate-700/60 hover:border-slate-500';
            if (isAnswered) {
              pillClass = isCorrect
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold';
            }
            if (isActive) {
              pillClass += ' ring-2 ring-cyan-400';
            }

            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionId(q.id);
                  const el = document.getElementById(`q-${q.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`w-7 h-7 shrink-0 rounded-md text-[11px] font-mono border transition-all flex items-center justify-center ${pillClass}`}
                title={`Pregunta ${q.id} (${q.domain})`}
              >
                {q.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category & Status Filters */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" /> Categoría:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({totalCount})
          </button>
          <button
            onClick={() => setSelectedCategory('Assessment Methodologies')}
            className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
              selectedCategory === 'Assessment Methodologies'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assessment (12)
          </button>
          <button
            onClick={() => setSelectedCategory('Host & Network Pentesting')}
            className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
              selectedCategory === 'Host & Network Pentesting'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Host/Network (18)
          </button>
          <button
            onClick={() => setSelectedCategory('Web App Pentesting')}
            className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
              selectedCategory === 'Web App Pentesting'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Web App (15)
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              filterStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ver Todas
          </button>
          <button
            onClick={() => setFilterStatus('unanswered')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              filterStatus === 'unanswered' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sin Responder
          </button>
          <button
            onClick={() => setFilterStatus('flag_questions')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              filterStatus === 'flag_questions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solo Flags
          </button>
        </div>
      </div>

      {/* Metodología r1vs3c: Filtro Estratégico por Host Objetivo */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1 shrink-0">
            <Target className="w-3.5 h-3.5 text-amber-400" /> Metodología r1vs3c (Responder por Host):
          </span>
          {HOST_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedHost(opt.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                selectedHost === opt.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {filteredQuestions.map((q) => {
          const isAnswered = q.userAnswer !== undefined;
          const isCorrect = q.isCorrect;
          const hostInfo = getQuestionTargetHost(q);

            const currentHintLevel = hintLevels[q.id] || 0;
            const tieredHints = getTieredHints(q);

            let cardBorder = 'bg-slate-900/70 border-slate-800 hover:border-slate-700';
            if (isAnswered) {
              if (isPracticeMode) {
                cardBorder = isCorrect
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-rose-950/20 border-rose-500/40';
              } else {
                cardBorder = 'bg-slate-900/90 border-cyan-500/40 shadow-sm';
              }
            }

            return (
              <div
                id={`q-${q.id}`}
                key={q.id}
                className={`p-4 rounded-xl border transition-all ${cardBorder}`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 flex items-center justify-center shrink-0">
                      {q.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                          {q.domain}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          hostInfo.subnet === 'dmz'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 font-semibold'
                            : hostInfo.subnet === 'internal'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          🎯 {hostInfo.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-snug">
                        {q.question}
                      </h3>
                    </div>
                  </div>

                  {isAnswered && (
                    <div className="shrink-0">
                      {isPracticeMode ? (
                        isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correcta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Incorrecta
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                          <Check className="w-3.5 h-3.5 text-cyan-400" /> Guardada
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Options or Flag Submission */}
                {q.isFlagQuestion ? (
                  <div className="mt-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
                    <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" /> Captura de Bandera (CTF):
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={flagInputs[q.id] || (typeof q.userAnswer === 'string' ? q.userAnswer : '')}
                        onChange={(e) => setFlagInputs({ ...flagInputs, [q.id]: e.target.value })}
                        placeholder="FLAG_...{...}"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleFlagSubmit(q.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Validar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {q.options.map((option, idx) => {
                      const isSelected = q.userAnswer === idx;
                      const isOptionCorrect = q.correctAnswer === idx;

                      let btnClass = 'bg-slate-950/70 border-slate-800 hover:bg-slate-800 text-slate-300';
                      if (isAnswered) {
                        if (isPracticeMode) {
                          if (isSelected) {
                            btnClass = isOptionCorrect
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                              : 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500';
                          } else if (isOptionCorrect) {
                            btnClass = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300/80';
                          }
                        } else {
                          // Modo Examen Estricto: highlight selection cleanly without revealing correctness
                          if (isSelected) {
                            btnClass = 'bg-cyan-950/80 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400';
                          }
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => onAnswerChange(q.id, idx)}
                          className={`text-left p-2.5 rounded-lg border text-xs font-mono transition-all flex items-start space-x-2 ${btnClass}`}
                        >
                          <span className="font-bold text-slate-400 shrink-0">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span className="leading-snug">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Hints & Explanations (Tutor vs Exam Mode) */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  {isPracticeMode ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => advanceHintLevel(q.id)}
                        className={`font-medium flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md text-xs ${
                          currentHintLevel > 0 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'text-amber-400 hover:text-amber-300 bg-slate-950 hover:bg-slate-800 border border-slate-800'
                        }`}
                        title="Desbloquear pistas progresivas: Nivel 1 (Recon), Nivel 2 (Vuln), Nivel 3 (Exploit)"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {currentHintLevel === 0 ? 'Pistas Tutor (1/3)' : `Pista Desbloqueada (${currentHintLevel}/3)`}
                        </span>
                      </button>

                      <button
                        onClick={() => toggleExplanation(q.id)}
                        className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>{openExplanations[q.id] ? 'Ocultar Explicación' : 'Explicación Oficial'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Modo Examen Estricto: Pistas y soluciones bloqueadas hasta entrega</span>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-slate-500">
                    ID: #{q.id}
                  </span>
                </div>

                {/* Progressive Tiered Hints Content in Tutor Mode */}
                {isPracticeMode && currentHintLevel > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {currentHintLevel >= 1 && (
                      <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs font-mono">
                        <span className="font-bold text-amber-400 block mb-1">🔍 Pista Nivel 1 (Reconocimiento):</span>
                        {tieredHints[0]}
                      </div>
                    )}
                    {currentHintLevel >= 2 && (
                      <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs font-mono">
                        <span className="font-bold text-purple-400 block mb-1">🎯 Pista Nivel 2 (Vulnerabilidad):</span>
                        {tieredHints[1]}
                      </div>
                    )}
                    {currentHintLevel >= 3 && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs font-mono">
                        <span className="font-bold text-emerald-400 block mb-1">⚡ Pista Nivel 3 (Explotación & Comando):</span>
                        {tieredHints[2]}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Content */}
                {isPracticeMode && openExplanations[q.id] && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
                    📖 <span className="font-semibold text-blue-300">Solución Oficial eJPTv2:</span> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ExamQuestions;
