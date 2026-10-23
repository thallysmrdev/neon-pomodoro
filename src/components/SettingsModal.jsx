import React, { useState } from 'react';
import { ArrowLeft, Volume2, Bell, Monitor, Sliders, RotateCcw, Check, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import { playBellSound, playClickSound, BELL_SOUNDS } from '../services/sound';
import { DEFAULT_SETTINGS } from '../services/storage';

function NumberControl({ label, value, min, max, unit, onChange }) {
  const handleIncrement = () => {
    if (value < max) {
      playClickSound();
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      playClickSound();
      onChange(value - 1);
    }
  };

  const handleInputChange = (e) => {
    const parsed = parseInt(e.target.value);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  return (
    <div>
      <label className="text-text-secondary text-[11px] block mb-1 font-medium">{label}</label>
      <div className="flex items-center justify-between bg-dark-surface/90 rounded-xl border border-dark-border hover:border-neon-purple/50 focus-within:border-neon-purple focus-within:shadow-neon-sm px-2.5 py-1.5 transition-all">
        <div className="flex items-baseline space-x-1 flex-1">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={handleInputChange}
            className="w-12 bg-transparent text-white font-mono text-sm font-bold focus:outline-none"
          />
          <span className="text-neon-light/80 text-[10px] font-mono">{unit}</span>
        </div>

        {/* Botões customizados Neon para Subir e Descer */}
        <div className="flex flex-col space-y-0.5 ml-1.5">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={value >= max}
            className="w-5 h-4 flex items-center justify-center rounded bg-neon-violet/25 hover:bg-neon-violet text-neon-glow hover:text-white border border-neon-purple/40 hover:border-neon-purple active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none shadow-neon-sm"
            title="Aumentar"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={value <= min}
            className="w-5 h-4 flex items-center justify-center rounded bg-neon-violet/25 hover:bg-neon-violet text-neon-glow hover:text-white border border-neon-purple/40 hover:border-neon-purple active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none shadow-neon-sm"
            title="Diminuir"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ settings, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...settings });
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestSound = (overrideType) => {
    const typeToPlay = overrideType || formData.soundType || 'tibetan';
    playBellSound(formData.soundVolume / 100, typeToPlay);
  };

  const handleResetDefaults = () => {
    playClickSound();
    setFormData({ ...DEFAULT_SETTINGS });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    playClickSound();
    onSave(formData);
    setSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="absolute inset-0 z-40 bg-dark-bg/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
      {/* Header com ícone de voltar no canto superior direito (no mesmo estilo e posição da barra) */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/40">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-neon-purple" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-white font-mono">
            Configurações
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface border border-transparent hover:border-dark-border transition-all"
          title="Voltar para a tela inicial"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs">
        {/* Sessão 1: Tempos */}
        <div className="p-3 rounded-xl bg-dark-card/60 border border-dark-border">
          <div className="flex items-center space-x-1.5 mb-2.5 text-neon-light font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
            <span>Duração dos Intervalos (minutos)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NumberControl
              label="Tempo de Foco"
              value={formData.focusDuration}
              min={1}
              max={90}
              unit="min"
              onChange={(val) => handleChange('focusDuration', val)}
            />

            <NumberControl
              label="Pausa Curta"
              value={formData.shortBreakDuration}
              min={1}
              max={30}
              unit="min"
              onChange={(val) => handleChange('shortBreakDuration', val)}
            />

            <NumberControl
              label="Pausa Longa"
              value={formData.longBreakDuration}
              min={5}
              max={60}
              unit="min"
              onChange={(val) => handleChange('longBreakDuration', val)}
            />

            <NumberControl
              label="Ciclos de Foco"
              value={formData.cyclesTarget}
              min={1}
              max={12}
              unit="ciclos"
              onChange={(val) => handleChange('cyclesTarget', val)}
            />
          </div>
        </div>

        {/* Sessão 2: Modo Automático */}
        <div className="p-3 rounded-xl bg-dark-card/60 border border-dark-border space-y-2">
          <div className="flex items-center space-x-1.5 text-neon-light font-semibold">
            <Zap className="w-3.5 h-3.5 text-neon-purple" />
            <span>Modo Automático</span>
          </div>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div className="pr-3">
              <div className="text-white font-medium">Iniciar próximo passo automaticamente</div>
              <div className="text-[11px] text-text-secondary leading-snug">
                Ao término do tempo, toca o sino e avança automaticamente (Foco ➔ Pausa ➔ Foco) sem precisar clicar no Play
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.autoStartCycles)}
              onChange={(e) => handleChange('autoStartCycles', e.target.checked)}
              className="accent-neon-violet w-4 h-4 rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        {/* Sessão 3: Sobreposição & Always on Top */}
        <div className="p-3 rounded-xl bg-dark-card/60 border border-dark-border space-y-3">
          <div className="flex items-center space-x-1.5 text-neon-light font-semibold">
            <Monitor className="w-3.5 h-3.5 text-neon-purple" />
            <span>Sobreposição & Tela (Always on Top)</span>
          </div>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div className="pr-2">
              <div className="text-white font-medium">Mini Widget flutuante no Start</div>
              <div className="text-[11px] text-text-secondary">Reduz para barra compacta ao iniciar</div>
            </div>
            <input
              type="checkbox"
              checked={formData.autoMiniModeOnStart}
              onChange={(e) => handleChange('autoMiniModeOnStart', e.target.checked)}
              className="accent-neon-violet w-4 h-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1 border-t border-dark-border/40">
            <div className="pr-2">
              <div className="text-white font-medium">Fixar sobre tudo ao iniciar</div>
              <div className="text-[11px] text-text-secondary">Sobrepor janelas e navegadores automaticamente</div>
            </div>
            <input
              type="checkbox"
              checked={formData.alwaysOnTop}
              onChange={(e) => handleChange('alwaysOnTop', e.target.checked)}
              className="accent-neon-violet w-4 h-4 rounded cursor-pointer"
            />
          </label>

          {/* Opacidade do Mini Widget */}
          <div className="pt-1 border-t border-dark-border/40">
            <div className="flex justify-between items-center mb-1 text-text-secondary">
              <span>Opacidade do widget flutuante</span>
              <span className="font-mono text-neon-light">{formData.widgetOpacity}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={formData.widgetOpacity}
              onChange={(e) => handleChange('widgetOpacity', parseInt(e.target.value))}
              className="w-full accent-neon-violet cursor-pointer"
            />
          </div>
        </div>

        {/* Sessão 3: Sons & Notificações */}
        <div className="p-3 rounded-xl bg-dark-card/60 border border-dark-border space-y-3">
          <div className="flex items-center space-x-1.5 text-neon-light font-semibold">
            <Bell className="w-3.5 h-3.5 text-neon-purple" />
            <span>Sons e Alertas de Término</span>
          </div>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-white">Tocar sino ao concluir ciclo</span>
            <input
              type="checkbox"
              checked={formData.soundEnabled}
              onChange={(e) => handleChange('soundEnabled', e.target.checked)}
              className="accent-neon-violet w-4 h-4 rounded cursor-pointer"
            />
          </label>

          {formData.soundEnabled && (
            <div className="space-y-2.5 pt-1 border-t border-dark-border/40">
              <span className="text-text-secondary block font-medium">Escolha o Toque do Sino (clique para ouvir):</span>
              <div className="grid grid-cols-1 gap-1.5">
                {BELL_SOUNDS.map((sound) => {
                  const isSelected = (formData.soundType || 'tibetan') === sound.id;
                  return (
                    <div
                      key={sound.id}
                      onClick={() => {
                        handleChange('soundType', sound.id);
                        handleTestSound(sound.id);
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-neon-violet/25 border-neon-purple text-white shadow-neon-sm'
                          : 'bg-dark-surface/60 border-dark-border text-text-secondary hover:text-white hover:border-dark-borderHover'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-neon-glow shadow-[0_0_6px_#c084fc]' : 'bg-dark-border'}`} />
                        <span className="text-[11px] font-medium">{sound.name}</span>
                      </div>
                      <Volume2 className={`w-3.5 h-3.5 ${isSelected ? 'text-neon-glow' : 'opacity-40'}`} />
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-text-secondary">
                  <span>Volume do sino</span>
                  <span className="font-mono text-neon-light">{formData.soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={formData.soundVolume}
                  onChange={(e) => handleChange('soundVolume', parseInt(e.target.value))}
                  className="w-full accent-neon-violet cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Footer Buttons com botão explícito de Voltar */}
      <div className="pt-3 border-t border-dark-border/50 flex items-center justify-between space-x-2">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="px-3.5 py-2.5 rounded-xl text-text-secondary hover:text-white bg-dark-surface border border-dark-border hover:border-dark-borderHover transition-all text-xs font-medium"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center space-x-1 px-3 py-2.5 rounded-xl text-text-secondary hover:text-white bg-dark-surface border border-dark-border transition-all text-xs"
          title="Restaurar padrões"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Padrões</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide uppercase glow-btn text-white flex items-center justify-center space-x-1.5 shadow-neon-btn"
        >
          {savedFeedback ? (
            <>
              <Check className="w-4 h-4" />
              <span>Salvo!</span>
            </>
          ) : (
            <span>Salvar</span>
          )}
        </button>
      </div>
    </div>
  );
}
