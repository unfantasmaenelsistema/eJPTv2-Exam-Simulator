import React from 'react';
import { LabDefinition } from '../types/simulator';
import { ALL_LABS } from '../data/labs';
import { Server, ShieldCheck, ArrowRight, X, Cpu, Network, CheckCircle2 } from 'lucide-react';

interface LabSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLabId: string;
  onSelectLab: (lab: LabDefinition) => void;
}

export const LabSelectorModal: React.FC<LabSelectorModalProps> = ({
  isOpen,
  onClose,
  activeLabId,
  onSelectLab
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Seleccionar Entorno de Laboratorio eJPTv2
              </h2>
              <p className="text-xs text-slate-400">
                Elige entre diferentes escenarios prácticos con topologías y vectores de ataque únicos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Labs List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {ALL_LABS.map((lab) => {
            const isSelected = lab.id === activeLabId;
            return (
              <div
                key={lab.id}
                onClick={() => {
                  onSelectLab(lab);
                  onClose();
                }}
                className={`p-5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{lab.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {lab.codeName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                        <span className="text-emerald-400">{lab.dmzSubnet}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-purple-400">{lab.internalSubnet} (Pivot)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      lab.difficulty.includes('Avanzado')
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    }`}>
                      {lab.difficulty}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {lab.description}
                </p>

                {/* Subnet badges & Machine counts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-3 border-t border-slate-800/80">
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Subred Perimetral DMZ</span>
                    <span className="font-mono text-cyan-300 font-semibold">{lab.dmzSubnet} (3 Hosts)</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Subred Interna Privada</span>
                    <span className="font-mono text-purple-300 font-semibold">{lab.internalSubnet} (3 Hosts)</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Cuestionario</span>
                    <span className="font-mono text-amber-300 font-semibold">{lab.questions.length} Preguntas Certificación</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Cambiar de laboratorio reconfigura las máquinas, enrutamiento y preguntas de examen.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default LabSelectorModal;
