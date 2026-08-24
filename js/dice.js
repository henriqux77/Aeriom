/* =========================================================
   AERIOM — MOTOR VISUAL DE DADOS (js/dice.js)
   Fase de Refatoração: Animação Premium e API Modular
========================================================= */
(function() {
    "use strict";

    const DiceEngine = {
        initialized: false,
        container: null,

        init: function() {
            if (this.initialized) return;
            
            // Cria o contêiner mestre se não existir no HTML
            this.container = document.getElementById('aeriomDiceContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'aeriomDiceContainer';
                document.body.appendChild(this.container);
            }

            // Injeta o CSS responsável pelas animações 3D e impacto do dado
            const style = document.createElement('style');
            style.textContent = `
                #aeriomDiceContainer {
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    pointer-events: none; /* Só captura clique quando ativo */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .dice-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    pointer-events: auto;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .dice-overlay.active {
                    opacity: 1;
                }
                .dice-header {
                    text-align: center;
                    margin-bottom: 2rem;
                    transform: translateY(-20px);
                    opacity: 0;
                    transition: all 0.3s ease 0.1s;
                }
                .dice-overlay.active .dice-header {
                    transform: translateY(0);
                    opacity: 1;
                }
                .dice-title {
                    font-family: var(--font-heading);
                    font-size: 1.5rem;
                    color: var(--theme-primary, #d4af37);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 4px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                }
                .dice-math {
                    font-family: var(--font-ui);
                    font-size: 1rem;
                    color: var(--theme-muted, #a1a1aa);
                }
                .dice-body {
                    width: 120px;
                    height: 120px;
                    background: var(--theme-surface-raised, #1c1c21);
                    border: 2px solid var(--theme-primary, #d4af37);
                    border-radius: 20px; /* Bordas arredondadas para parecer um dado robusto */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--font-heading);
                    font-size: 3.5rem;
                    color: var(--theme-text, #fff);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5);
                    text-shadow: 0 2px 5px rgba(0,0,0,0.5);
                    opacity: 0;
                    transform: scale(0.5) rotate3d(1, 1, 1, 90deg);
                }
                
                /* Animação de Rolagem (Spin & Impact) */
                .dice-rolling {
                    animation: diceRollAnim 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                
                @keyframes diceRollAnim {
                    0% {
                        opacity: 0;
                        transform: scale(0.5) translateY(-100px) rotate3d(1, 1, 1, 0deg);
                        filter: blur(4px);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2) translateY(0) rotate3d(1, 2, 1, 360deg);
                        filter: blur(1px);
                    }
                    75% {
                        transform: scale(0.9) translateY(10px) rotate3d(0, 1, 0, 720deg);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0) rotate3d(0, 0, 0, 0deg);
                        filter: blur(0);
                    }
                }
                
                .dice-result-final {
                    margin-top: 2rem;
                    font-family: var(--font-heading);
                    font-size: 3rem;
                    color: #fff;
                    opacity: 0;
                    transform: translateY(20px) scale(0.8);
                    text-shadow: 0 0 20px var(--theme-primary, #d4af37);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                .dice-result-final.show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                
                .skip-hint {
                    position: absolute;
                    bottom: 2rem;
                    font-size: 0.8rem;
                    color: var(--theme-muted, #a1a1aa);
                    opacity: 0.5;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
            `;
            document.head.appendChild(style);
            this.initialized = true;
        },

        /**
         * Executa a rolagem de um dado com animação visual.
         * @param {Object} config - Configurações da rolagem.
         * @param {number} config.quantity - Quantidade de dados (Padrão: 1).
         * @param {number} config.sides - Faces do dado (Padrão: 20).
         * @param {number} config.modifier - Modificador a somar (Padrão: 0).
         * @param {string} config.label - Nome do teste (Ex: "Teste de Força").
         * @returns {Promise<Object>} Promessa resolvida com os detalhes do resultado.
         */
        roll: function(config = {}) {
            this.init();

            const quantity = config.quantity || 1;
            const sides = config.sides || 20;
            const modifier = config.modifier || 0;
            const label = config.label || "Rolagem de Dados";

            return new Promise((resolve) => {
                // Cálculo Matemático Limpo
                let rolls = [];
                let totalDice = 0;
                for(let i = 0; i < quantity; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    totalDice += r;
                }
                const finalTotal = totalDice + modifier;

                // Formatação da string de matemática (ex: "1d20 + 3")
                let mathStr = `${quantity}d${sides}`;
                if (modifier > 0) mathStr += ` + ${modifier}`;
                else if (modifier < 0) mathStr += ` - ${Math.abs(modifier)}`;

                // Criação da Interface (DOM Puro e Seguro)
                const overlay = document.createElement('div');
                overlay.className = 'dice-overlay';
                
                overlay.innerHTML = `
                    <div class="dice-header">
                        <div class="dice-title">${label}</div>
                        <div class="dice-math">${mathStr}</div>
                    </div>
                    <div class="dice-body dice-rolling">
                        <!-- O número final do dado será injetado após a animação -->
                    </div>
                    <div class="dice-result-final">
                        ${finalTotal}
                    </div>
                    <div class="skip-hint">Toque para pular</div>
                `;

                this.container.appendChild(overlay);

                // Força o reflow para a transição de opacidade iniciar
                overlay.offsetHeight; 
                overlay.classList.add('active');

                const diceBody = overlay.querySelector('.dice-body');
                const resultFinal = overlay.querySelector('.dice-result-final');
                
                // Intervalo para simular os números passando rapidamente durante o spin
                let fakeRollInterval = setInterval(() => {
                    diceBody.textContent = Math.floor(Math.random() * sides) + 1;
                }, 50);

                let isFinished = false;

                const finishAnimation = () => {
                    if (isFinished) return;
                    isFinished = true;
                    
                    clearInterval(fakeRollInterval);
                    
                    // Mostra o resultado do dado cru na face do cubo
                    diceBody.textContent = totalDice; 
                    
                    // Força a remoção da animação caso o user tenha clicado para pular
                    diceBody.style.animation = 'none';
                    diceBody.style.opacity = '1';
                    diceBody.style.transform = 'scale(1) translateY(0) rotate3d(0,0,0,0deg)';
                    diceBody.style.filter = 'blur(0)';

                    // Mostra o resultado grande em baixo (Dado + Modificador)
                    resultFinal.classList.add('show');

                    // Aguarda 1.5s após exibir o resultado e fecha, resolvendo a promessa
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
                        }, 200); // Tempo do fade out
                    }, 1500);
                };

                // Ouve o clique para "Pular/Skip" a animação instantaneamente
                overlay.addEventListener('click', finishAnimation);

                // Ouve o fim natural da animação de CSS (0.8s estipulados no keyframes)
                diceBody.addEventListener('animationend', finishAnimation);
            });
        }
    };

    // Expõe globalmente
    window.AeriomDice = DiceEngine;
})();
