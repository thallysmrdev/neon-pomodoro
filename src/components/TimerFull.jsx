import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Minimize2, Zap } from 'lucide-react';
import { playClickSound } from '../services/sound';

export default function TimerFull({
  timeLeft,
  totalDuration,
  isRunning,
  mode,
  currentCycle,
  cyclesTarget,
  autoStartCycles,
  onTogglePlay,
  onReset,
  onSkip,
  onToggleMiniMode,
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getModeDetails = () => {
    switch (mode) {
      case 'focus':
        return {
          title: 'Foco Profundo',
          description: `Ciclo ${currentCycle} de ${cyclesTarget} • Mantenha a concentração`,
          buttonLabel: isRunning ? 'Pausar Foco' : 'Iniciar Foco',
          badgeColor: 'border-neon-purple/60 text-neon-light bg-neon-violet/20',
        };
      case 'shortBreak':
        return {
          title: 'Pausa Curta',
          description: 'Respire fundo, beba água e relaxe os olhos',
          buttonLabel: isRunning ? 'Pausar Intervalo' : 'Iniciar Pausa Curta',
          badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
        };
      case 'longBreak':
        return {
          title: 'Pausa Longa',
          description: 'Excelente trabalho! Relaxe a mente e recarregue',
          buttonLabel: isRunning ? 'Pausar Intervalo' : 'Iniciar Pausa Longa',
          badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
        };
      default:
        return {
          title: 'Foco Profundo',
          description: 'Sessão de produtividade',
          buttonLabel: 'Iniciar Foco',
          badgeColor: 'border-neon-purple/60 text-neon-light bg-neon-violet/20',
        };
    }
  };

  const details = getModeDetails();

  // Circular progress calculation
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-1 select-none relative z-10">
      {/* Top Unified Header Indicator (Clean, Minimalist, Automatic Progression) */}
      <div className="flex flex-col items-center justify-center text-center mt-3 mb-1">
        {/* Soft Glowing Mode Badge */}
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border shadow-neon-sm mb-1.5 flex items-center space-x-1.5 transition-all duration-300 ${details.badgeColor}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{details.title}</span>
        </div>

        <p className="text-xs text-text-secondary max-w-[260px] truncate">
          {details.description}
        </p>

        {autoStartCycles && (
          <div className="flex items-center space-x-1 mt-1.5 text-[10px] text-neon-light font-medium bg-neon-purple/15 border border-neon-purple/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.2)]">
            <Zap className="w-2.5 h-2.5 text-neon-glow" />
            <span>Modo Automático Ativo</span>
          </div>
        )}
      </div>

      {/* Circular Progress Timer Centerpiece */}
      <div className="relative flex items-center justify-center my-auto py-2">
        {/* Subtle background glow */}
        <div className="absolute w-48 h-48 rounded-full bg-neon-violet/15 blur-2xl pointer-events-none" />

        <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="timerRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
            <filter id="timerRingGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="rgba(139, 92, 246, 0.12)"
            strokeWidth="7"
          />

          {/* Active progress ring */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="url(#timerRingGradient)"
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#timerRingGlow)"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Central Display */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-4xl font-extrabold tracking-tight font-mono text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            {formatTime(timeLeft)}
          </span>

          {/* Cycle dots indicator */}
          <div className="flex items-center space-x-1.5 mt-3">
            {Array.from({ length: cyclesTarget }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < currentCycle
                    ? 'bg-neon-glow shadow-[0_0_8px_rgba(192,132,252,0.9)] scale-110'
                    : 'bg-dark-surface border border-dark-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Primary Action Button (Reference design: electric purple pill button) */}
      <div className="space-y-3">
        <button
          onClick={() => {
            playClickSound();
            onTogglePlay();
          }}
          className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide text-white glow-btn flex items-center justify-center space-x-2 shadow-neon-btn group cursor-pointer"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>{details.buttonLabel}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white ml-0.5" />
              <span>{details.buttonLabel}</span>
            </>
          )}
        </button>

        {/* Secondary controls row */}
        <div className="flex items-center justify-around px-2 pt-1">
          {/* Reset */}
          <button
            onClick={() => {
              playClickSound();
              onReset();
            }}
            title="Resetar tempo do ciclo atual"
            className="flex items-center space-x-1.5 text-xs text-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-surface/60"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Resetar</span>
          </button>

          {/* Mini Mode Toggle */}
          <button
            onClick={() => {
              playClickSound();
              onToggleMiniMode();
            }}
            title="Modo Widget Flutuante (Always on Top)"
            className="flex items-center space-x-1.5 text-xs text-neon-light hover:text-white transition-colors p-2 rounded-lg hover:bg-neon-violet/20 border border-neon-purple/30 shadow-neon-sm"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Modo Flutuante</span>
          </button>

          {/* Skip Cycle */}
          <button
            onClick={() => {
              playClickSound();
              onSkip();
            }}
            title="Pular para próximo intervalo"
            className="flex items-center space-x-1.5 text-xs text-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-surface/60"
          >
            <SkipForward className="w-4 h-4" />
            <span>Pular</span>
          </button>
        </div>
      </div>
    </div>
  );
}
