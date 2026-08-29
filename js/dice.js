/* =========================================================
   AERIOM — MOTOR VISUAL DE DADOS
   Arquivo: js/dice.js

   Fase 4 — Motor Premium de Rolagem
   Dark Fantasy RPG / Mesa Digital

   API pública:
       window.AeriomDice.roll({
           quantity: 1,
           sides: 20,
           modifier: 0,
           label: "Teste do Destino"
       })

   Retorno:
       {
           total,
           rolls,
           modifier,
           formula,
           label
       }
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {
        containerId: "aeriomDiceContainer",

        animationDuration: 900,
        resultDisplayDuration: 1200,
        fadeDuration: 280,

        fakeRollInterval: 45,

        maxQuantity: 100,
        maxSides: 1000,
        minSides: 2,

        zIndex: 10000
    };

    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        initialized: false,
        container: null,
        activeRoll: null,
        styleInjected: false
    };

    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function toInteger(value, fallback) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.trunc(number);
    }

    function normalizeQuantity(value) {
        return clamp(
            toInteger(value, 1),
            1,
            CONFIG.maxQuantity
        );
    }

    function normalizeSides(value) {
        return clamp(
            toInteger(value, 20),
            CONFIG.minSides,
            CONFIG.maxSides
        );
    }

    function normalizeModifier(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.trunc(number);
    }

    function normalizeLabel(value) {
        if (value === null || value === undefined) {
            return "Teste do Destino";
        }

        const label = String(value).trim();

        return label || "Teste do Destino";
    }

    /**
     * Escapa texto antes de inserir no innerHTML.
     */
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function buildFormula(quantity, sides, modifier) {
        let formula = `${quantity}d${sides}`;

        if (modifier > 0) {
            formula += ` + ${modifier}`;
        } else if (modifier < 0) {
            formula += ` - ${Math.abs(modifier)}`;
        }

        return formula;
    }

    function randomDie(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    function rollDice(quantity, sides) {
        const rolls = [];
        let total = 0;

        for (let index = 0; index < quantity; index++) {
            const value = randomDie(sides);

            rolls.push(value);
            total += value;
        }

        return {
            rolls,
            total
        };
    }

    /* =====================================================
       CSS DO MOTOR
    ===================================================== */

    function injectStyles() {
        if (state.styleInjected) {
            return;
        }

        const existingStyle = document.getElementById(
            "aeriom-dice-engine-styles"
        );

        if (existingStyle) {
            state.styleInjected = true;
            return;
        }

        const style = document.createElement("style");

        style.id = "aeriom-dice-engine-styles";

        style.textContent = `
            /* =============================================
               CONTAINER PRINCIPAL
            ============================================= */

            #aeriomDiceContainer {
                position: fixed;
                inset: 0;
                z-index: ${CONFIG.zIndex};
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            /* =============================================
               OVERLAY
            ============================================= */

            #aeriomDiceContainer .dice-overlay {
                position: absolute;
                inset: 0;

                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;

                padding:
                    max(1.5rem, env(safe-area-inset-top))
                    1.25rem
                    max(1.5rem, env(safe-area-inset-bottom));

                background:
                    radial-gradient(
                        circle at 50% 42%,
                        rgba(100, 38, 18, 0.12),
                        transparent 32rem
                    ),
                    rgba(0, 0, 0, 0.82);

                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);

                opacity: 0;

                pointer-events: auto;
                cursor: pointer;

                transition:
                    opacity ${CONFIG.fadeDuration}ms ease;
            }

            #aeriomDiceContainer .dice-overlay.active {
                opacity: 1;
            }

            /* =============================================
               HEADER
            ============================================= */

            #aeriomDiceContainer .dice-header {
                display: flex;
                flex-direction: column;
                align-items: center;

                width: min(90vw, 720px);

                margin-bottom: 2.25rem;

                text-align: center;

                opacity: 0;
                transform: translateY(-18px);

                transition:
                    opacity 360ms ease 80ms,
                    transform 500ms cubic-bezier(
                        0.175,
                        0.885,
                        0.32,
                        1.275
                    ) 80ms;
            }

            #aeriomDiceContainer .dice-overlay.active .dice-header {
                opacity: 1;
                transform: translateY(0);
            }

            #aeriomDiceContainer .dice-title {
                margin: 0 0 0.45rem;

                font-family:
                    var(--font-heading, "Cinzel", Georgia, serif);

                font-size: clamp(1rem, 4vw, 1.5rem);

                font-weight: 600;

                line-height: 1.25;

                color:
                    var(
                        --theme-primary,
                        var(--color-primary, #e8a05d)
                    );

                text-transform: uppercase;

                letter-spacing: 0.1em;

                text-shadow:
                    0 2px 8px rgba(0, 0, 0, 0.95),
                    0 0 18px
                        var(
                            --theme-primary-muted,
                            rgba(232, 160, 93, 0.22)
                        );

                overflow-wrap: anywhere;
            }

            #aeriomDiceContainer .dice-math {
                font-family:
                    var(--font-ui, Arial, sans-serif);

                font-size: 0.9rem;

                font-weight: 500;

                color:
                    var(
                        --theme-muted,
                        var(--color-text-muted, #ad9575)
                    );

                letter-spacing: 0.08em;
            }

            /* =============================================
               ÁREA DOS DADOS
            ============================================= */

            #aeriomDiceContainer .dice-stage {
                position: relative;

                display: flex;
                align-items: center;
                justify-content: center;

                min-width: 120px;
                min-height: 120px;

                perspective: 900px;
            }

            /* =============================================
               DADO PRINCIPAL
            ============================================= */

            #aeriomDiceContainer .dice-body {
                position: relative;

                display: grid;
                place-items: center;

                width: clamp(86px, 24vw, 120px);
                height: clamp(86px, 24vw, 120px);

                border:
                    2px solid
                    var(
                        --theme-primary,
                        var(--color-primary, #e8a05d)
                    );

                border-radius: 14px;

                background:
                    radial-gradient(
                        circle at 30% 20%,
                        rgba(255, 255, 255, 0.07),
                        transparent 35%
                    ),
                    linear-gradient(
                        145deg,
                        var(
                            --theme-surface-raised,
                            var(--color-surface-raised, #1b1718)
                        ),
                        var(
                            --theme-surface,
                            var(--color-surface, #100d0d)
                        )
                    );

                color:
                    var(
                        --theme-text,
                        var(--color-text, #ead7b6)
                    );

                font-family:
                    var(--font-heading, "Cinzel", Georgia, serif);

                font-size: clamp(2.25rem, 10vw, 3.4rem);

                font-weight: 700;

                line-height: 1;

                text-align: center;

                box-shadow:
                    0 20px 45px rgba(0, 0, 0, 0.85),
                    0 0 30px
                        var(
                            --theme-primary-muted,
                            rgba(232, 160, 93, 0.16)
                        ),
                    inset 0 2px 5px rgba(255, 255, 255, 0.06),
                    inset 0 -7px 15px rgba(0, 0, 0, 0.55);

                text-shadow:
                    0 2px 5px rgba(0, 0, 0, 0.75);

                opacity: 0;

                transform:
                    translateY(80px)
                    scale(0.3)
                    rotateX(-180deg)
                    rotateY(120deg);

                filter: blur(5px);

                will-change:
                    transform,
                    opacity,
                    filter;
            }

            #aeriomDiceContainer .dice-body::before {
                content: "";

                position: absolute;
                inset: 6px;

                border:
                    1px solid
                    rgba(255, 213, 150, 0.1);

                border-radius: 9px;

                pointer-events: none;
            }

            #aeriomDiceContainer .dice-body.rolling {
                animation:
                    aeriomDiceRoll
                    ${CONFIG.animationDuration}ms
                    cubic-bezier(
                        0.22,
                        0.61,
                        0.36,
                        1
                    )
                    forwards;
            }

            @keyframes aeriomDiceRoll {
                0% {
                    opacity: 0;

                    transform:
                        translateY(90px)
                        scale(0.28)
                        rotateX(-240deg)
                        rotateY(180deg)
                        rotateZ(-80deg);

                    filter: blur(6px);
                }

                18% {
                    opacity: 1;
                }

                38% {
                    transform:
                        translateY(-42px)
                        scale(1.12)
                        rotateX(180deg)
                        rotateY(420deg)
                        rotateZ(160deg);

                    filter: blur(1.5px);
                }

                62% {
                    transform:
                        translateY(15px)
                        scale(0.94)
                        rotateX(420deg)
                        rotateY(720deg)
                        rotateZ(300deg);

                    filter: blur(0.5px);
                }

                80% {
                    transform:
                        translateY(-6px)
                        scale(1.03)
                        rotateX(540deg)
                        rotateY(880deg)
                        rotateZ(360deg);
                }

                92% {
                    transform:
                        translateY(2px)
                        scale(0.99)
                        rotateX(560deg)
                        rotateY(900deg)
                        rotateZ(360deg);
                }

                100% {
                    opacity: 1;

                    transform:
                        translateY(0)
                        scale(1)
                        rotateX(0deg)
                        rotateY(0deg)
                        rotateZ(0deg);

                    filter: blur(0);
                }
            }

            /* =============================================
               RESULTADO FINAL
            ============================================= */

            #aeriomDiceContainer .dice-result-final {
                margin-top: 2rem;

                font-family:
                    var(--font-heading, "Cinzel", Georgia, serif);

                font-size: clamp(2.8rem, 13vw, 4rem);

                font-weight: 700;

                line-height: 1;

                color:
                    var(
                        --theme-text,
                        var(--color-text, #ead7b6)
                    );

                text-shadow:
                    0 0 25px
                        var(
                            --theme-primary-muted,
                            rgba(232, 160, 93, 0.3)
                        ),
                    0 3px 10px rgba(0, 0, 0, 0.9);

                opacity: 0;

                transform:
                    translateY(18px)
                    scale(0.82);

                transition:
                    opacity 420ms ease,
                    transform 520ms
                        cubic-bezier(
                            0.175,
                            0.885,
                            0.32,
                            1.275
                        );
            }

            #aeriomDiceContainer .dice-result-final.show {
                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }

            /* =============================================
               DETALHES DO RESULTADO
            ============================================= */

            #aeriomDiceContainer .dice-roll-summary {
                margin-top: 0.75rem;

                max-width: min(90vw, 500px);

                font-family:
                    var(--font-ui, Arial, sans-serif);

                font-size: 0.8rem;

                color:
                    var(
                        --theme-muted,
                        var(--color-text-muted, #ad9575)
                    );

                text-align: center;

                opacity: 0;

                transform: translateY(8px);

                transition:
                    opacity 350ms ease 100ms,
                    transform 350ms ease 100ms;
            }

            #aeriomDiceContainer
                .dice-roll-summary.show {
                opacity: 0.9;
                transform: translateY(0);
            }

            /* =============================================
               HINT
            ============================================= */

            #aeriomDiceContainer .skip-hint {
                position: absolute;

                left: 50%;

                bottom:
                    max(
                        1.5rem,
                        calc(
                            1.5rem +
                            env(safe-area-inset-bottom)
                        )
                    );

                transform: translateX(-50%);

                width: max-content;

                font-family:
                    var(--font-ui, Arial, sans-serif);

                font-size: 0.7rem;

                color:
                    var(
                        --theme-muted,
                        var(--color-text-muted, #ad9575)
                    );

                opacity: 0.6;

                text-transform: uppercase;

                letter-spacing: 0.1em;

                white-space: nowrap;

                transition:
                    opacity 250ms ease;
            }

            #aeriomDiceContainer .dice-overlay.finished
                .skip-hint {
                opacity: 0;
            }

            /* =============================================
               ESTADO DE CRÍTICO
            ============================================= */

            #aeriomDiceContainer .dice-result-final.critical {
                color:
                    var(
                        --theme-primary,
                        var(--color-primary, #e8a05d)
                    );

                text-shadow:
                    0 0 12px
                        var(
                            --theme-primary,
                            rgba(232, 160, 93, 0.7)
                        ),
                    0 0 35px
                        var(
                            --theme-primary-muted,
                            rgba(232, 160, 93, 0.35)
                        ),
                    0 3px 10px rgba(0, 0, 0, 0.9);
            }

            /* =============================================
               REDUÇÃO DE MOVIMENTO
            ============================================= */

            @media (prefers-reduced-motion: reduce) {
                #aeriomDiceContainer .dice-overlay,
                #aeriomDiceContainer .dice-header,
                #aeriomDiceContainer .dice-result-final,
                #aeriomDiceContainer .dice-roll-summary {
                    transition-duration: 80ms;
                }

                #aeriomDiceContainer
                    .dice-body.rolling {
                    animation:
                        aeriomDiceReduced
                        120ms
                        ease-out
                        forwards;
                }

                @keyframes aeriomDiceReduced {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                        filter: blur(2px);
                    }

                    to {
                        opacity: 1;
                        transform: scale(1);
                        filter: blur(0);
                    }
                }
            }

            /* =============================================
               MOBILE
            ============================================= */

            @media (max-width: 480px) {
                #aeriomDiceContainer
                    .dice-header {
                    margin-bottom: 1.5rem;
                }

                #aeriomDiceContainer
                    .dice-result-final {
                    margin-top: 1.5rem;
                }

                #aeriomDiceContainer
                    .dice-math {
                    font-size: 0.8rem;
                }

                #aeriomDiceContainer
                    .skip-hint {
                    font-size: 0.65rem;
                }
            }
        `;

        document.head.appendChild(style);

        state.styleInjected = true;
    }

    /* =====================================================
       CONTAINER
    ===================================================== */

    function ensureContainer() {
        let container = document.getElementById(
            CONFIG.containerId
        );

        if (!container) {
            container = document.createElement("div");
            container.id = CONFIG.containerId;

            document.body.appendChild(container);
        }

        state.container = container;

        return container;
    }

    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    function init() {
        if (state.initialized) {
            return state.container;
        }

        if (!document.body) {
            return null;
        }

        injectStyles();
        ensureContainer();

        state.initialized = true;

        return state.container;
    }

    /* =====================================================
       CRIAÇÃO DO OVERLAY
    ===================================================== */

    function createOverlay(data) {
        const overlay = document.createElement("div");

        overlay.className = "dice-overlay";

        overlay.setAttribute(
            "role",
            "dialog"
        );

        overlay.setAttribute(
            "aria-modal",
            "true"
        );

        overlay.setAttribute(
            "aria-label",
            `Rolagem de ${data.label}`
        );

        overlay.innerHTML = `
            <div class="dice-header">
                <div class="dice-title">
                    ${escapeHtml(data.label)}
                </div>

                <div class="dice-math">
                    ${escapeHtml(data.formula)}
                </div>
            </div>

            <div class="dice-stage">
                <div
                    class="dice-body rolling"
                    aria-live="polite"
                    aria-label="Dado sendo rolado"
                ></div>
            </div>

            <div
                class="dice-result-final"
                aria-live="assertive"
                aria-atomic="true"
            ></div>

            <div class="dice-roll-summary"></div>

            <div class="skip-hint">
                Toque para avançar
            </div>
        `;

        return overlay;
    }

    /* =====================================================
       PREENCHE NÚMERO FALSO
    ===================================================== */

    function startFakeRoll(diceBody, sides) {
        let intervalId = null;

        const update = function () {
            diceBody.textContent = String(
                randomDie(sides)
            );
        };

        update();

        intervalId = window.setInterval(
            update,
            CONFIG.fakeRollInterval
        );

        return function stopFakeRoll() {
            if (intervalId !== null) {
                window.clearInterval(intervalId);
                intervalId = null;
            }
        };
    }

    /* =====================================================
       MOSTRA RESULTADO
    ===================================================== */

    function showResult(
        overlay,
        diceBody,
        resultFinal,
        summary,
        data
    ) {
        /*
         * Para múltiplos dados, não fingimos que
         * "totalDice" é a face de um único d20.
         *
         * Mostramos:
         * - 1 dado: face final
         * - múltiplos: soma das faces
         */

        if (data.quantity === 1) {
            diceBody.textContent = String(
                data.rolls[0]
            );
        } else {
            diceBody.textContent = String(
                data.diceTotal
            );
        }

        resultFinal.textContent = String(
            data.finalTotal
        );

        if (
            data.quantity === 1 &&
            data.sides === 20 &&
            data.rolls[0] === 20
        ) {
            resultFinal.classList.add("critical");
        }

        const rollsText =
            data.rolls.length > 1
                ? `Dados: ${data.rolls.join(" + ")}`
                : `Dado: ${data.rolls[0]}`;

        summary.textContent =
            data.modifier !== 0
                ? `${rollsText} • Modificador: ${
                    data.modifier > 0
                        ? "+" + data.modifier
                        : data.modifier
                }`
                : rollsText;

        resultFinal.classList.add("show");
        summary.classList.add("show");

        overlay.classList.add("finished");

        diceBody.classList.remove("rolling");

        diceBody.style.opacity = "1";
        diceBody.style.transform =
            "translateY(0) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
        diceBody.style.filter = "blur(0)";

        diceBody.setAttribute(
            "aria-label",
            `Resultado dos dados: ${data.diceTotal}`
        );
    }

    /* =====================================================
       FECHA OVERLAY
    ===================================================== */

    function closeOverlay(overlay) {
        return new Promise((resolve) => {
            if (!overlay) {
                resolve();
                return;
            }

            overlay.classList.remove("active");

            window.setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(
                        overlay
                    );
                }

                resolve();
            }, CONFIG.fadeDuration);
        });
    }

    /* =====================================================
       ROLAGEM
    ===================================================== */

    function roll(config = {}) {
        const container = init();

        if (!container) {
            return Promise.reject(
                new Error(
                    "AeriomDice: document.body ainda não está disponível."
                )
            );
        }

        const quantity = normalizeQuantity(
            config.quantity
        );

        const sides = normalizeSides(
            config.sides
        );

        const modifier = normalizeModifier(
            config.modifier
        );

        const label = normalizeLabel(
            config.label
        );

        const formula = buildFormula(
            quantity,
            sides,
            modifier
        );

        /*
         * Matemática da rolagem acontece imediatamente.
         * Isso evita que a animação altere o resultado real.
         */

        const diceResult = rollDice(
            quantity,
            sides
        );

        const rolls = diceResult.rolls;

        const diceTotal = diceResult.total;

        const finalTotal =
            diceTotal + modifier;

        const data = {
            quantity,
            sides,
            modifier,
            label,
            formula,
            rolls,
            diceTotal,
            finalTotal
        };

        /*
         * Se já existe uma rolagem aberta,
         * finaliza visualmente a anterior antes
         * de iniciar a nova.
         */

        if (state.activeRoll) {
            state.activeRoll.forceFinish();
        }

        return new Promise((resolve) => {
            const overlay = createOverlay(data);

            container.appendChild(
                overlay
            );

            const diceBody =
                overlay.querySelector(
                    ".dice-body"
                );

            const resultFinal =
                overlay.querySelector(
                    ".dice-result-final"
                );

            const summary =
                overlay.querySelector(
                    ".dice-roll-summary"
                );

            let stopFakeRoll = null;
            let finishTimer = null;
            let closeTimer = null;

            let finished = false;
            let resolved = false;

            /* ---------------------------------------------
               RESOLVE UMA ÚNICA VEZ
            --------------------------------------------- */

            const resolveOnce = function () {
                if (resolved) {
                    return;
                }

                resolved = true;

                resolve({
                    total: finalTotal,
                    rolls: [...rolls],
                    modifier,
                    formula,
                    label
                });
            };

            /* ---------------------------------------------
               LIMPEZA
            --------------------------------------------- */

            const cleanup = function () {
                if (stopFakeRoll) {
                    stopFakeRoll();
                    stopFakeRoll = null;
                }

                if (finishTimer !== null) {
                    window.clearTimeout(
                        finishTimer
                    );

                    finishTimer = null;
                }

                if (closeTimer !== null) {
                    window.clearTimeout(
                        closeTimer
                    );

                    closeTimer = null;
                }

                overlay.removeEventListener(
                    "click",
                    handleOverlayClick
                );

                document.removeEventListener(
                    "keydown",
                    handleKeyDown
                );

                diceBody.removeEventListener(
                    "animationend",
                    handleAnimationEnd
                );

                if (
                    state.activeRoll &&
                    state.activeRoll.overlay ===
                        overlay
                ) {
                    state.activeRoll = null;
                }
            };

            /* ---------------------------------------------
               FECHA DEFINITIVAMENTE
            --------------------------------------------- */

            const finishAndClose = function () {
                closeOverlay(
                    overlay
                ).then(() => {
                    cleanup();
                    resolveOnce();
                });
            };

            /* ---------------------------------------------
               FINALIZA ANIMAÇÃO
            --------------------------------------------- */

            const finishAnimation = function () {
                if (finished) {
                    return;
                }

                finished = true;

                if (stopFakeRoll) {
                    stopFakeRoll();
                    stopFakeRoll = null;
                }

                showResult(
                    overlay,
                    diceBody,
                    resultFinal,
                    summary,
                    data
                );

                /*
                 * Dá tempo para o jogador enxergar
                 * o resultado final.
                 */

                closeTimer =
                    window.setTimeout(
                        finishAndClose,
                        CONFIG.resultDisplayDuration
                    );
            };

            /* ---------------------------------------------
               CLIQUE
            --------------------------------------------- */

            function handleOverlayClick(event) {
                /*
                 * Qualquer toque no overlay pula a
                 * animação, mas depois mantém o resultado
                 * visível pelo tempo normal.
                 */

                event.preventDefault();

                if (!finished) {
                    finishAnimation();
                }
            }

            /* ---------------------------------------------
               ESC
            --------------------------------------------- */

            function handleKeyDown(event) {
                if (
                    event.key === "Escape" &&
                    !finished
                ) {
                    finishAnimation();
                }
            }

            /* ---------------------------------------------
               ANIMATION END
            --------------------------------------------- */

            function handleAnimationEnd(event) {
                if (
                    event.animationName !==
                    "aeriomDiceRoll" &&
                    event.animationName !==
                    "aeriomDiceReduced"
                ) {
                    return;
                }

                finishAnimation();
            }

            /* ---------------------------------------------
               EVENTOS
            --------------------------------------------- */

            overlay.addEventListener(
                "click",
                handleOverlayClick
            );

            document.addEventListener(
                "keydown",
                handleKeyDown
            );

            diceBody.addEventListener(
                "animationend",
                handleAnimationEnd
            );

            /* ---------------------------------------------
               REGISTRA ROLAGEM ATIVA
            --------------------------------------------- */

            state.activeRoll = {
                overlay,

                forceFinish: function () {
                    finishAnimation();
                }
            };

            /* ---------------------------------------------
               ATIVA TRANSIÇÃO
            --------------------------------------------- */

            void overlay.offsetHeight;

            overlay.classList.add(
                "active"
            );

            /* ---------------------------------------------
               NÚMEROS FALSOS
            --------------------------------------------- */

            stopFakeRoll =
                startFakeRoll(
                    diceBody,
                    sides
                );

            /*
             * Fallback caso animationend não seja disparado
             * por alguma limitação do navegador.
             */

            finishTimer =
                window.setTimeout(
                    finishAnimation,
                    CONFIG.animationDuration + 80
                );
        });
    }

    /* =====================================================
       ROLAGEM RÁPIDA
    ===================================================== */

    function quickRoll(
        quantity = 1,
        sides = 20,
        modifier = 0,
        label = "Teste do Destino"
    ) {
        return roll({
            quantity,
            sides,
            modifier,
            label
        });
    }

    /* =====================================================
       API PÚBLICA
    ===================================================== */

    const DiceEngine = {
        initialized: false,

        init: function () {
            init();

            this.initialized =
                state.initialized;

            return this;
        },

        roll,

        quickRoll,

        /**
         * Retorna o container atual.
         * Útil para outros módulos que precisem
         * apenas verificar se o motor foi carregado.
         */
        getContainer: function () {
            return state.container;
        },

        /**
         * Retorna se existe uma rolagem visual ativa.
         */
        isRolling: function () {
            return !!state.activeRoll;
        }
    };

    /* =====================================================
       DISPONIBILIZA GLOBALMENTE
    ===================================================== */

    window.AeriomDice = DiceEngine;

    /* =====================================================
       AUTO-INIT SE O DOM JÁ EXISTIR
    ===================================================== */

    if (
        document.readyState === "interactive" ||
        document.readyState === "complete"
    ) {
        init();
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    }

})();