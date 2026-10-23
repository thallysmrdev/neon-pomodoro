import React, { useState, useEffect } from 'react';
import TopographyBackground from './TopographyBackground';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando o app...');
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 650; // Transição ágil e rápida (menos de 1 segundo)

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const current = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(current);

      if (current < 40) {
        setStatusText('Carregando preferências...');
      } else if (current < 85) {
        setStatusText('Configurando ambiente...');
      } else {
        setStatusText('Pronto!');
        clearInterval(interval);
        setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            onFinish();
          }, 250);
        }, 100);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onFinish]);

  // Cálculo da circunferência para o anel de carregamento
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080511] select-none transition-all duration-500 ${
        isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Luz ambiente e linhas topográficas de fundo */}
      <div className="absolute w-80 h-80 bg-neon-purple/20 rounded-full blur-3xl pointer-events-none -top-10" />
      <div className="absolute w-72 h-72 bg-neon-violet/15 rounded-full blur-2xl pointer-events-none -bottom-10" />
      <TopographyBackground />

      <div className="relative z-10 flex flex-col items-center">
        {/* Ícone com anel circular de progresso em volta */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* SVG com anel de carregamento animado */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="splashRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="50%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
              <filter id="splashGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Trilha de fundo do anel */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="rgba(139, 92, 246, 0.15)"
              strokeWidth="4.5"
            />

            {/* Anel de progresso preenchendo */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="url(#splashRingGradient)"
              strokeWidth="4.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              filter="url(#splashGlow)"
              className="transition-all duration-100 ease-out"
            />
          </svg>

          {/* Ícone Central Neon */}
          <div className="absolute flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 rounded-full bg-dark-card border border-neon-purple/40 flex items-center justify-center shadow-neon">
              {/* Círculo com efeito pulsante */}
              <div className="absolute inset-1 rounded-full border border-neon-light/30 animate-pulse" />
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neon-violet to-neon-glow shadow-[0_0_18px_rgba(168,85,247,0.9)] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Título do App */}
        <h1 className="mt-5 text-lg font-bold tracking-[0.25em] text-white uppercase font-mono drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          Neon Pomodoro
        </h1>

        {/* Status text e porcentagem */}
        <div className="mt-3 flex flex-col items-center space-y-1.5">
          <span className="text-xs text-text-secondary font-medium tracking-wide">
            {statusText}
          </span>

          <span className="text-[11px] font-mono text-neon-light font-semibold">
            {progress}%
          </span>
        </div>

        {/* Barra de progresso sutil na base */}
        <div className="w-40 h-1 bg-dark-surface rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-neon-violet to-neon-glow transition-all duration-100 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
