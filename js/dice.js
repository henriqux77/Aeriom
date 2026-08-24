/* =========================================================
   AERIOM — MOTOR VISUAL DE DADOS (js/dice.js)
   Fase 4: Animação Premium e Física (Dark Fantasy RPG)
========================================================= */
(function() {
    "use strict";

    const DiceEngine = {
        initialized: false,
        container: null,

        init: function() {
            if (this.initialized) return;
            
            // O contêiner oficial foi injetado na Fase 3 no campanha.html
            this.container = document.getElementById('aeriomDiceContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'aeriomDiceContainer';
                document.body.appendChild(this.container);
            }

            // Injeção limpa de CSS do Motor de Dados, consumindo o Design System Global
            const style = document.createElement('style');
            style.textContent = `
                #aeriomDiceContainer {
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    pointer-events: none; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .dice-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    opacity: 0;
                    transition: opacity 0.25s ease;
                    pointer-events: auto;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .dice-overlay.active { opacity: 1; }
                
                .dice-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                    transform: translateY(-20px);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s;
                }
                .dice-overlay.active .dice-header {
                    transform: translateY(0);
                    opacity: 1;
                }
                
                .dice-title {
                    font-family: var(--font-heading);
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--theme-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 6px;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
                }
                
                .dice-math {
                    font-family: var(--font-ui);
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: var(--theme-muted);
                    letter-spacing: 0.05em;
                }
                
                /* O Artefato (Dado) */
                .dice-body {
                    width: 110px;
                    height: 110px;
                    background: linear-gradient(145deg, var(--theme-surface-raised), var(--theme-surface));
                    border: 2px solid var(--theme-primary);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--font-heading);
                    font-weight: 600;
                    font-size: 3rem;
                    color: var(--theme-text);
                    /* Profundidade realista simulando material físico */
                    box-shadow: 
                        0 20px 40px rgba(0,0,0,0.8), 
                        inset 0 2px 4px rgba(255,255,255,0.05),
                        inset 0 -4px 10px rgba(0,0,0,0.5);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
                    
                    opacity: 0;
                    transform: scale(0.5) rotate3d(1, 1, 1, 90deg);
                }
                
                /* Animação: Lançamento com Gravidade (Spin & Impact) */
                .dice-rolling {
                    animation: diceRollAnim 0.85s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards;
                }
                
                @keyframes diceRollAnim {
                    0% {
                        opacity: 0;
                        transform: scale(0.3) translateY(100px) rotate3d(1, 1, 1, 0deg);
                        filter: blur(4px);
                    }
                    40% {
                        opacity: 1;
                        transform: scale(1.15) translateY(-40px) rotate3d(1, 2, 1, 360deg);
                        filter: blur(1px);
                    }
                    75% {
                        transform: scale(0.95) translateY(10px) rotate3d(0, 1, 0, 720deg);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0) rotate3d(0, 0, 0, 0deg);
                        filter: blur(0);
                    }
                }
                
                /* Resultado Final Destacado */
                .dice-result-final {
                    margin-top: 2.5rem;
                    font-family: var(--font-heading);
                    font-weight: 700;
                    font-size: 3.5rem;
                    color: var(--theme-text);
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                    /* Aura sutil da cor principal da mesa */
                    text-shadow: 0 0 24px var(--theme-primary-muted), 0 2px 8px rgba(0,0,0,0.8);
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                .dice-result-final.show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                
                .skip-hint {
                    position: absolute;
                    bottom: 2.5rem;
                    font-family: var(--font-ui);
                    font-size: 0.75rem;
                    color: var(--theme-muted);
                    opacity: 0.6;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    transition: opacity 0.3s;
                }
            `;
            document.head.appendChild(style);
            this.initialized = true;
        },

        /**
         * Executa a rolagem de um dado com física visual.
         * @param {Object} config - { quantity, sides, modifier, label }
         */
        roll: function(config = {}) {
            this.init();

            const quantity = config.quantity || 1;
            const sides = config.sides || 20;
            const modifier = config.modifier || 0;
            const label = config.label || "Teste do Destino";

            return new Promise((resolve) => {
                // 1. O Motor Matemático (limpo e previsível)
                let rolls = [];
                let totalDice = 0;
                for(let i = 0; i < quantity; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    totalDice += r;
                }
                const finalTotal = totalDice + modifier;

                let mathStr = `${quantity}d${sides}`;
                if (modifier > 0) mathStr += ` + ${modifier}`;
                else if (modifier < 0) mathStr += ` - ${Math.abs(modifier)}`;

                // 2. Criação do DOM do Dado (Virtual)
                const overlay = document.createElement('div');
                overlay.className = 'dice-overlay';
                
                overlay.innerHTML = `
                    <div class="dice-header">
                        <div class="dice-title">${label}</div>
                        <div class="dice-math">${mathStr}</div>
                    </div>
                    <div class="dice-body dice-rolling">
                        <!-- Números falsos injetados durante o spin -->
                    </div>
                    <div class="dice-result-final">
                        ${finalTotal}
                    </div>
                    <div class="skip-hint">Tocar para avançar</div>
                `;

                this.container.appendChild(overlay);

                // Reflow forçado para garantir as transições de entrada
                overlay.offsetHeight; 
                overlay.classList.add('active');

                const diceBody = overlay.querySelector('.dice-body');
                const resultFinal = overlay.querySelector('.dice-result-final');
                
                // Borrão rápido de números (efeito de movimento)
                let fakeRollInterval = setInterval(() => {
                    diceBody.textContent = Math.floor(Math.random() * sides) + 1;
                }, 40);

                let isFinished = false;

                const finishAnimation = () => {
                    if (isFinished) return;
                    isFinished = true;
                    
                    clearInterval(fakeRollInterval);
                    
                    // Mostra a face final natural do dado (sem mod)
                    diceBody.textContent = totalDice; 
                    
                    // Caso o usuário tenha tocado para saltar (skip), forçamos o cubo ao chão
                    diceBody.style.animation = 'none';
                    diceBody.style.opacity = '1';
                    diceBody.style.transform = 'scale(1) translateY(0) rotate3d(0,0,0,0deg)';
                    diceBody.style.filter = 'blur(0)';

                    // Mostra o resultado épico (+ mod)
                    resultFinal.classList.add('show');
                    const hint = overlay.querySelector('.skip-hint');
                    if (hint) hint.style.opacity = '0';

                    // Resolução limpa. Fica em tela por 1.2s para leitura, depois faz fadeout.
                    setTimeout(() => {
                        overlay.classList.remove('active');
                        setTimeout(() => {
                            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                            resolve({
                                total: finalTotal,
                                rolls: rolls,
                                modifier: modifier,
                                formula: mathStr,
                                label: label
                            });
                        }, 250); // Duração do fadeout
                    }, 1200);
                };

                // Ouvintes: Termina ao fim da keyframe ou ao clique do jogador
                overlay.addEventListener('click', finishAnimation);
                diceBody.addEventListener('animationend', finishAnimation);
            });
        }
    };

    // Disponibiliza o motor na Window para qualquer módulo usar.
    window.AeriomDice = DiceEngine;
})();
