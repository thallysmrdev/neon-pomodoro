import React from 'react';
import { Pin, PinOff, Minus, X, Minimize2, Settings, ArrowLeft } from 'lucide-react';
import { playClickSound } from '../services/sound';

export default function TitleBar({
  isAlwaysOnTop,
  onToggleAlwaysOnTop,
  onOpenSettings,
  onCloseSettings,
  isSettingsOpen = false,
  onToggleMiniMode,
}) {
  const handleMinimize = () => {
    playClickSound();
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleClose = () => {
    playClickSound();
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  const handleTogglePin = async () => {
    playClickSound();
    onToggleAlwaysOnTop();
  };

  return (
    <div className="h-10 w-full flex items-center justify-between px-3 drag-region select-none border-b border-dark-border/40 bg-dark-bg/80 backdrop-blur-md z-50">
      {/* Logo & Title */}
      <div className="flex items-center space-x-2">
        <div className="w-2.5 h-2.5 rounded-full bg-neon-purple shadow-neon-sm animate-pulse-slow" />
        <span className="text-xs font-semibold tracking-wider text-text-accent uppercase font-mono">
          Neon Pomodoro
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1 no-drag">
        {/* Toggle Always on Top */}
        <button
          onClick={handleTogglePin}
          title={isAlwaysOnTop ? 'Desafixar do topo' : 'Fixar sobre todas as telas (Always on Top)'}
          className={`p-1.5 rounded-md transition-all ${
            isAlwaysOnTop
              ? 'text-neon-glow bg-neon-violet/30 border border-neon-purple/50 shadow-neon-sm'
              : 'text-text-secondary hover:text-white hover:bg-dark-surface'
          }`}
        >
          {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 fill-neon-glow" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Mini Mode Button */}
        {onToggleMiniMode && (
          <button
            onClick={() => {
              playClickSound();
              onToggleMiniMode();
            }}
            title="Alternar para Mini Widget Flutuante"
            className="p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Settings / Back Button (Alterna no mesmo lugar entre engrenagem e voltar) */}
        <button
          onClick={() => {
            playClickSound();
            if (isSettingsOpen && onCloseSettings) {
              onCloseSettings();
            } else if (onOpenSettings) {
              onOpenSettings();
            }
          }}
          title={isSettingsOpen ? 'Voltar para o Timer' : 'Configurações do Pomodoro'}
          className={`p-1.5 rounded-md transition-all ${
            isSettingsOpen
              ? 'text-neon-glow bg-neon-violet/30 border border-neon-purple/50 shadow-neon-sm'
              : 'text-text-secondary hover:text-white hover:bg-dark-surface'
          }`}
        >
          {isSettingsOpen ? <ArrowLeft className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
        </button>

        {/* Windows Minimize */}
        <button
          onClick={handleMinimize}
          title="Minimizar janela"
          className="p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Windows Close */}
        <button
          onClick={handleClose}
          title="Fechar"
          className="p-1.5 rounded-md text-text-secondary hover:text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
