# 🟣 Neon Pomodoro Desktop (Windows)

Um aplicativo desktop Pomodoro moderno, minimalista e altamente produtivo desenvolvido com **Electron**, **React**, **Vite** e **Tailwind CSS**, com estética dark cyberpunk e tons elétricos de violeta neon inspirados em arte topográfica.

---

## 🚀 Funcionalidades Principais

- **⏱️ Temporizador Pomodoro Completo**:
  - Ciclos de **Foco**, **Pausa Curta** e **Pausa Longa**.
  - Indicador circular animado com brilho neon e display digital nítido.
  - Navegação tipo carrossel para alternar entre os modos manualmente.
  - Indicadores de progresso por ciclo (ex: 4 sessões até o descanso longo).

- **✨ Splash Screen / Tela de Carregamento**:
  - Animação de entrada imediata no milissegundo 0 (sem telas pretas ou vazias).
  - Ícone neon centralizado com anel circular de carregamento preenchendo de 0% a 100%.
  - Transição fluida com fade out para a tela principal de foco.


- **📌 Sobreposição Total de Tela (Always on Top)**:
  - Fica sobreposto a navegadores (Chrome, Edge), IDEs (VS Code), planilhas e qualquer janela maximizada no Windows.
  - Ative ou desative a qualquer momento pelo botão de alfinete (**Pin**) na barra superior.
  - Opção para ativar a sobreposição automaticamente ao dar "Iniciar".

- **📊 Integração com Barra de Tarefas & Bandeja (System Tray)**:
  - **Tempo ao Minimizar**: O tempo atual (`MM:SS`) e status (`Foco` / `Pausa`) são atualizados em tempo real no título da janela e visíveis na barra de tarefas e no `Alt+Tab`.
  - **Barra de Progresso Nativa**: O próprio ícone do aplicativo na barra de tarefas do Windows exibe uma barra de progresso verde preenchendo conforme o tempo passa.
  - **Bandeja do Sistema (Tray)**: Ícone neon violeta próximo ao relógio do Windows com tooltip de tempo em tempo real e menu de clique direito (Play/Pause, Pular, Resetar, Restaurar, Sair).


- **🪟 Mini-Widget Flutuante Arrastável**:
  - Modo pílula/card super compacto (ocupa o mínimo de espaço na sua tela de trabalho).
  - **Arrastável**: clique e arraste para qualquer canto da tela com suavidade.
  - Controles rápidos integrados: Play/Pause, Pular intervalo e Expandir para janela completa.
  - Controle de opacidade/transparência ajustável de 50% a 100%.

- **⚙️ Painel de Configurações Completo**:
  - Personalize a duração do Foco (1 a 90 min), Pausa Curta (1 a 30 min) e Pausa Longa (5 a 60 min).
  - Defina a meta de ciclos antes da pausa longa.
  - Ajuste de volume e teste em tempo real do alarme.
  - Opções para auto-iniciar pausas ou auto-iniciar foco.
  - Persistência automática das preferências no seu computador.

- **🔔 Sons de Sino Acústicos & Relaxantes**:
  - **Sino Tibetano Zen (528Hz)**: Ressonância profunda de 4 segundos com batimento suave (estilo taça tibetana).
  - **Sino de Cristal Ting**: Toque agudo, cristalino e cintilante.
  - **Sino Clássico Ding**: Toque claro, direto e acolhedor de recepção.
  - Seletor com teste imediato de áudio e controle de volume no painel de configurações.


---

## 💻 Como Executar

### Opção 1: Atalho Oficial com Ícone (Recomendado)
- Dê um duplo clique no atalho **`Neon Pomodoro`** diretamente na sua **Área de Trabalho (Desktop)** ou na pasta do projeto [`Neon Pomodoro.lnk`](file:///c:/Projetos/pomodoro/Neon%20Pomodoro.lnk).
- Ele possui o ícone oficial em alta definição neon violeta e inicia instantaneamente sem abrir janelas pretas de terminal.

### Opção 2: Pelo arquivo .bat
- Dê um duplo clique em [`iniciar-pomodoro.bat`](file:///c:/Projetos/pomodoro/iniciar-pomodoro.bat).


### Opção 2: Pelo Terminal
```bash
# Para iniciar o aplicativo pronto para uso:
npm start

# Para desenvolvimento com Hot-Reload (Vite):
npm run dev

# Para gerar uma nova build:
npm run build
```

---

## 🎨 Identidade Visual
Baseada em tons escuros de espaço profundo (`#080511`) com destaques em violeta elétrico (`#7C3AED` e `#A855F7`), efeito de vidro fosco (*glassmorphism*) e linhas de elevação topográfica neon.
