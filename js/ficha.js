/* =========================================================
   AERIOM — MOTOR DE CRIAÇÃO DE FICHAS V4.0 (js/ficha.js)
   Fase 3: Validação em Tempo Real, Diagnóstico e INSERT/UPDATE Seguro
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) { 
        console.error("[AERIOM] ❌ Supabase não inicializado."); 
        return; 
    }

    let currentCharacterId = localStorage.getItem("aeriom_character_id");
    let currentUser = null;

    // Elementos Base
    const characterForm = document.getElementById("characterForm");
    const fichaMessage = document.getElementById("fichaMessage");
    const saveBtn = document.getElementById("saveCharacterBtn");
    
    // =========================================================
    // 0. UTILITÁRIOS E DIAGNÓSTICO (Obrigatório)
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    function showMessage(msg, isError = false) {
        if (!fichaMessage) return;
        fichaMessage.textContent = msg;
        fichaMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (!isError) setTimeout(() => { fichaMessage.classList.remove('active'); }, 4000);
    }

    function logSupabaseError(arquivo, funcao, tabela, operacao, error) {
        console.error(`
[AERIOM][SUPABASE]
Arquivo: ${arquivo}
Função: ${funcao}
Tabela: ${tabela}
Operação: ${operacao}
Código: ${error.code || 'N/A'}
Mensagem: ${error.message || 'N/A'}
Detalhes: ${error.details || 'N/A'}
Hint: ${error.hint || 'N/A'}
        `);
    }

    // =========================================================
    // 1. NAVEGAÇÃO WIZARD (12 ETAPAS)
    // =========================================================
    let currentStep = 1;
    const totalSteps = 12;
    const btnNext = document.getElementById("btnNextStep");
    const btnPrev = document.getElementById("btnPrevStep");
    const progressSteps = document.querySelectorAll(".progress-step");
    const stepContents = document.querySelectorAll(".step-content");

    function updateWizardUI() {
        stepContents.forEach(content => content.classList.remove('active'));
        const activeContent = document.getElementById(`step-${currentStep}`);
        if (activeContent) activeContent.classList.add('active');

        progressSteps.forEach(step => {
            const stepNum = parseInt(step.getAttribute('data-step'));
            step.classList.remove('active');
            if (stepNum === currentStep) step.classList.add('active');
            if (stepNum < currentStep) step.classList.add('completed');
            else step.classList.remove('completed');
        });

        if (btnPrev) btnPrev.disabled = currentStep === 1;
        
        if (currentStep === totalSteps) {
            if (btnNext) btnNext.style.display = 'none';
        } else {
            if (btnNext) btnNext.style.display = 'block';
        }
        
        const activeStep = document.querySelector('.progress-step.active');
        if(activeStep) activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    btnNext?.addEventListener("click", () => {
        if (currentStep < totalSteps) { currentStep++; updateWizardUI(); }
    });
    btnPrev?.addEventListener("click", () => {
        if (currentStep > 1) { currentStep--; updateWizardUI(); }
    });

    progressSteps.forEach(step => {
        step.addEventListener("click", () => {
            currentStep = parseInt(step.getAttribute('data-step'));
            updateWizardUI();
        });
    });

    // =========================================================
    // 2. SELEÇÃO DE CARDS (RAÇA E CLASSE)
    // =========================================================
    function setupCards(gridId, hiddenInputId, onSelectCallback = null) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const cards = grid.querySelectorAll(".choice-card");
        
        cards.forEach(card => {
            card.addEventListener("click", () => {
                cards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                
                const value = card.getAttribute(`data-${hiddenInputId.replace('char', '').toLowerCase()}`);
                const hiddenInput = document.getElementById(hiddenInputId);
                if (hiddenInput) hiddenInput.value = value;
                
                if (onSelectCallback) onSelectCallback(card);
                
                generateChecklist(); // Força a validação
            });
        });
    }

    setupCards("raceGrid", "charRace", (card) => {
        const abilityInput = document.getElementById("charRaceAbility");
        if (abilityInput) abilityInput.value = card.getAttribute("data-ability") || "";
    });
    
    setupCards("classGrid", "charClass", (card) => {
        const bonus = parseInt(card.getAttribute("data-manabonus")) || 0;
        const bonusInput = document.getElementById("charManaBonus");
        if (bonusInput) bonusInput.value = bonus;
        updateManaDisplay();
    });

    // =========================================================
    // 3. DISTRIBUIÇÃO DE DADOS (ATRIBUTOS V4.0)
    // =========================================================
    const initialDicePool = [4, 6, 6, 8, 10, 12, 20, 20];
    let allocatedAttrs = { Presença: null, Precisão: null, Intelecto: null, Controle: null, Percepção: null, Vigor: null, Agilidade: null, Força: null };
    let selectedDieMobile = null; 

    function renderDicePool() {
        const pool = document.getElementById("dicePool");
        if (!pool) return;
        pool.innerHTML = '';
        
        let usedValues = Object.values(allocatedAttrs).filter(v => v !== null);
        let tempPool = [...initialDicePool];
        
        usedValues.forEach(val => {
            const index = tempPool.indexOf(val);
            if (index > -1) tempPool.splice(index, 1);
        });

        tempPool.forEach(val => {
            const die = createSafeElement("div", "die-token", `D${val}`);
            die.setAttribute("draggable", "true");
            die.setAttribute("data-type", `D${val}`);
            die.setAttribute("data-val", val);
            
            die.addEventListener("dragstart", (e) => {
                die.classList.add("dragging");
                e.dataTransfer.setData("text/plain", val);
                selectedDieMobile = null; 
                clearMobileHighlights();
            });
            die.addEventListener("dragend", () => {
                die.classList.remove("dragging");
            });

            die.addEventListener("click", () => {
                document.querySelectorAll(".die-token").forEach(d => d.classList.remove("selected-mobile"));
                die.classList.add("selected-mobile");
                selectedDieMobile = val;
                document.getElementById("attributesList")?.classList.add("awaiting-drop");
            });

            pool.appendChild(die);
        });
    }

    function setupAttributeSlots() {
        const slots = document.querySelectorAll(".attr-slot");
        
        slots.forEach(slot => {
            const attrName = slot.getAttribute("data-slot");
            
            slot.addEventListener("dragover", (e) => {
                e.preventDefault();
                slot.classList.add("drag-over");
            });
            slot.addEventListener("dragleave", () => {
                slot.classList.remove("drag-over");
            });
            slot.addEventListener("drop", (e) => {
                e.preventDefault();
                slot.classList.remove("drag-over");
                const val = parseInt(e.dataTransfer.getData("text/plain"));
                if (!val || isNaN(val)) return;
                
                allocateDie(attrName, val);
            });

            slot.parentElement.addEventListener("click", () => {
                if (selectedDieMobile !== null) {
                    allocateDie(attrName, selectedDieMobile);
                    selectedDieMobile = null;
                    clearMobileHighlights();
                } else if (allocatedAttrs[attrName] !== null) {
                    allocatedAttrs[attrName] = null;
                    updateAttrUI();
                    generateChecklist();
                }
            });
        });
    }

    function allocateDie(attrName, value) {
        allocatedAttrs[attrName] = value;
        updateAttrUI();
        generateChecklist(); // Validação imediata
    }

    function clearMobileHighlights() {
        const attrList = document.getElementById("attributesList");
        if (attrList) attrList.classList.remove("awaiting-drop");
        document.querySelectorAll(".die-token").forEach(d => d.classList.remove("selected-mobile"));
    }

    function updateAttrUI() {
        renderDicePool();
        const slots = document.querySelectorAll(".attr-slot");
        
        slots.forEach(slot => {
            const attrName = slot.getAttribute("data-slot");
            const val = allocatedAttrs[attrName];
            
            slot.innerHTML = '';
            const normalizedKey = attrName.replace(/ç/g,'c').replace(/ã/g,'a');
            const hiddenInput = document.getElementById(`attr${normalizedKey}`);
            
            if (val !== null) {
                const die = createSafeElement("div", "die-token", `D${val}`);
                die.setAttribute("data-type", `D${val}`);
                die.style.cursor = "pointer";
                die.title = "Clique para devolver o dado";
                slot.appendChild(die);
                
                if (hiddenInput) hiddenInput.value = val;
            } else {
                const empty = createSafeElement("span", "slot-empty-text", "D?");
                slot.appendChild(empty);
                if (hiddenInput) hiddenInput.value = "";
            }
        });
        updateManaDisplay();
    }

    // =========================================================
    // 4. SISTEMAS V4.0 (Poder, Mana, Perícias)
    // =========================================================
    document.getElementById("rollRandomPowerBtn")?.addEventListener("click", () => {
        const powers = ["Fogo", "Ar", "Terra", "Água", "Gelo", "Eletricidade/Magnetismo", "Vegetação/Natureza", "Gravidade", "Luz/Sombras", "Tecnologia/Construtos"];
        const select = document.getElementById("charPower");
        if (!select) return;
        
        let roll = Math.floor(Math.random() * 100) + 1;
        let index = Math.floor((roll - 1) / 10);
        if (index > 9) index = 9;
        
        select.value = powers[index];
        alert(`O destino girou (1D100 = ${roll}). Despertaste o elemento: ${powers[index]}!`);
    });

    function updateManaDisplay() {
        const bonusInput = document.getElementById("charManaBonus");
        const classBonus = parseInt(bonusInput ? bonusInput.value : 0) || 0;
        const controleAttr = allocatedAttrs["Controle"] || 0;
        
        const totalCM = classBonus + controleAttr;
        const display = document.getElementById("displayManaControl");
        const hidden = document.getElementById("charManaControl");
        
        if (display) display.textContent = totalCM;
        if (hidden) hidden.value = totalCM;
    }

    const officialSkills = ["Acrobacia", "Atletismo", "Furtividade", "Percepção", "Investigação", "Conhecimento", "Medicina", "Sobrevivência", "Persuasão", "Intuição", "Enganação", "Tática", "Ofício", "Controle de Mana"];
    
    function renderSkills() {
        const container = document.getElementById("skillsContainer");
        if (!container) return;
        container.innerHTML = '';
        
        officialSkills.forEach(skill => {
            const card = createSafeElement("div", "aeriom-card");
            card.style.padding = "var(--space-sm) var(--space-md)";
            card.style.display = "flex";
            card.style.justifyContent = "space-between";
            card.style.alignItems = "center";
            
            const label = createSafeElement("span", "form-label", skill);
            label.style.margin = "0";
            
            const input = createSafeElement("input", "form-input input-stat skill-input");
            input.type = "number";
            input.value = "0";
            input.setAttribute("data-skill", skill);
            input.style.width = "60px";
            input.style.height = "40px";
            input.style.fontSize = "1.2rem";
            
            card.appendChild(label);
            card.appendChild(input);
            container.appendChild(card);
        });
    }

    // =========================================================
    // 5. TÉCNICAS E EQUIPAMENTOS
    // =========================================================
    function attachDynamicList(btnId, containerId, templateFn) {
        document.getElementById(btnId)?.addEventListener("click", () => {
            const placeholder = document.querySelector(`#${containerId} .placeholder-panel`);
            if (placeholder) placeholder.style.display = 'none';
            
            const card = createSafeElement("div", "dynamic-card");
            card.innerHTML = templateFn(); 
            
            card.querySelector(".btn-remove-card").addEventListener("click", () => {
                card.remove();
                if (document.getElementById(containerId).children.length === 1 && placeholder) {
                    placeholder.style.display = 'flex';
                }
            });
            
            document.getElementById(containerId).appendChild(card);
        });
    }

    attachDynamicList("addTechniqueBtn", "techniquesList", () => `
        <div class="dynamic-card-header">
            <input type="text" class="form-input tech-name" placeholder="Nome da Técnica" style="font-family: var(--font-heading); font-size: 1.1rem; border: none; background: transparent; padding: 0;" required>
            <button type="button" class="btn-remove-card" title="Remover">×</button>
        </div>
        <div class="technique-grid">
            <div class="form-group m-0"><label class="form-label">Custo (PM)</label><input type="text" class="form-input tech-cost" placeholder="Ex: 5"></div>
            <div class="form-group m-0"><label class="form-label">Teste / Atributo</label><input type="text" class="form-input tech-test" placeholder="Ex: Precisão"></div>
            <div class="form-group m-0"><label class="form-label">Dano / Efeito Base</label><input type="text" class="form-input tech-dmg" placeholder="Ex: 2d6 Fogo"></div>
            <div class="form-group m-0"><label class="form-label">Alcance / Alvo</label><input type="text" class="form-input tech-range" placeholder="Ex: 9m / 1 Alvo"></div>
            <div class="form-group m-0 full-width"><textarea class="form-textarea tech-desc" placeholder="Descrição da habilidade..."></textarea></div>
        </div>
    `);

    attachDynamicList("addEquipBtn", "equipList", () => `
        <div style="display: flex; gap: var(--space-sm); align-items: flex-start;">
            <input type="text" class="form-input flex-1 equip-name" placeholder="Nome (Ex: Espada Longa)" required>
            <input type="text" class="form-input equip-dmg" placeholder="Dano (Ex: 1d8)" style="width: 100px;">
            <input type="text" class="form-input equip-prop" placeholder="Propriedades" style="width: 150px;">
            <button type="button" class="btn-remove-card mt-2">×</button>
        </div>
    `);

    // =========================================================
    // 6. VALIDAÇÃO EM TEMPO REAL E COMPILADORES
    // =========================================================
    const requiredInputs = ["charName", "charHpMax", "charDefense", "bgHistory"];
    requiredInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', generateChecklist);
    });

    function generateChecklist() {
        const checklist = document.getElementById("reviewChecklist");
        if (checklist) checklist.innerHTML = '';
        
        let allValid = true;

        const checkItem = (name, isValid, stepLink) => {
            if (checklist) {
                const item = createSafeElement("div", "review-item");
                item.innerHTML = `
                    <div class="review-icon ${isValid ? 'ok' : 'error'}">${isValid ? '✓' : '✖'}</div>
                    <div class="review-details"><h4>${name}</h4><p>${isValid ? 'Preenchido' : 'Pendente'}</p></div>
                `;
                item.addEventListener('click', () => { currentStep = stepLink; updateWizardUI(); });
                checklist.appendChild(item);
            }
            if (!isValid) allValid = false;
        };

        const charName = document.getElementById("charName")?.value.trim() || "";
        const charRace = document.getElementById("charRace")?.value.trim() || "";
        const charClass = document.getElementById("charClass")?.value.trim() || "";
        const hpMax = document.getElementById("charHpMax")?.value || "";
        const def = document.getElementById("charDefense")?.value || "";
        const bg = document.getElementById("bgHistory")?.value.trim() || "";

        checkItem("Identidade Básica", charName !== '', 1);
        checkItem("Raça Definida", charRace !== '', 2);
        checkItem("Classe Selecionada", charClass !== '', 3);
        
        const attrsFilled = Object.values(allocatedAttrs).every(val => val !== null);
        checkItem("Atributos Distribuídos", attrsFilled, 4);
        
        checkItem("Pontos de Vida & Defesa", (hpMax !== '' && def !== ''), 8);
        checkItem("História Elaborada", bg !== '', 11);

        // O botão é desbloqueado IMEDIATAMENTE quando tudo está preenchido
        if (saveBtn) {
            if (allValid) {
                saveBtn.disabled = false;
                saveBtn.textContent = currentCharacterId ? "Atualizar Herói (Pronto)" : "Forjar Personagem (Pronto)";
                saveBtn.classList.add("btn-primary");
                saveBtn.classList.remove("btn-secondary");
            } else {
                saveBtn.disabled = true;
                saveBtn.textContent = "Forjar Personagem (Incompleto)";
                saveBtn.classList.add("btn-secondary");
                saveBtn.classList.remove("btn-primary");
            }
        }

        return allValid;
    }

    function compileTechniques() {
        const cards = document.querySelectorAll("#techniquesList .dynamic-card");
        let compiledText = "";
        cards.forEach(card => {
            const name = card.querySelector(".tech-name")?.value.trim() || "Sem Nome";
            const cost = card.querySelector(".tech-cost")?.value.trim() || "-";
            const test = card.querySelector(".tech-test")?.value.trim() || "-";
            const dmg = card.querySelector(".tech-dmg")?.value.trim() || "-";
            const range = card.querySelector(".tech-range")?.value.trim() || "-";
            const desc = card.querySelector(".tech-desc")?.value.trim() || "";
            
            compiledText += `**${name}** (Custo: ${cost} PM | Teste: ${test})\n`;
            compiledText += `*Efeito:* ${dmg} | *Alcance:* ${range}\n`;
            compiledText += `${desc}\n\n`;
        });
        return compiledText.trim();
    }

    function compileEquipment() {
        const cards = document.querySelectorAll("#equipList .dynamic-card");
        const money = document.getElementById("charMoney")?.value.trim() || "0 moedas";
        let compiledText = `**Dinheiro Inicial:** ${money}\n\n**Mochila:**\n`;
        
        cards.forEach(card => {
            const name = card.querySelector(".equip-name")?.value.trim();
            const dmg = card.querySelector(".equip-dmg")?.value.trim();
            const prop = card.querySelector(".equip-prop")?.value.trim();
            
            if (name) {
                let line = `- ${name}`;
                if (dmg) line += ` (Dano: ${dmg})`;
                if (prop) line += ` [${prop}]`;
                compiledText += line + `\n`;
            }
        });
        return compiledText.trim();
    }

    function compileSkillsText() {
        let skillsText = "";
        document.querySelectorAll(".skill-input").forEach(input => {
            const val = parseInt(input.value) || 0;
            if (val > 0) {
                skillsText += `${input.getAttribute("data-skill")}: +${val} | `;
            }
        });
        return skillsText.replace(/ \|\ $/, '');
    }

    // =========================================================
    // 7. INIT (MODO EDIÇÃO) E SALVAMENTO BLINDADO
    // =========================================================
    async function loadCharacterData(id) {
        try {
            const { data: char, error } = await supabase.from('characters').select('*').eq('id', id).single();
            
            if (error) {
                logSupabaseError('js/ficha.js', 'loadCharacterData', 'characters', 'SELECT', error);
                throw error;
            }
            if (!char) return;

            if(document.getElementById("charName")) document.getElementById("charName").value = char.name || "";
            if(document.getElementById("charLevel")) document.getElementById("charLevel").value = char.level || 1;
            if(document.getElementById("charAvatar")) document.getElementById("charAvatar").value = char.avatar_url || "";
            
            if(char.race) document.querySelector(`.choice-card[data-race="${char.race}"]`)?.click();
            if(char.class) document.querySelector(`.choice-card[data-class="${char.class}"]`)?.click();

            allocatedAttrs = {
                Presença: char.presenca || null,
                Precisão: char.precisao || null,
                Intelecto: char.intelecto || null,
                Controle: char.controle || null,
                Percepção: char.percepcao || null,
                Vigor: char.vigor || null,
                Agilidade: char.agilidade || null,
                Força: char.forca || null
            };
            updateAttrUI();

            if(document.getElementById("charHpMax")) document.getElementById("charHpMax").value = char.hp_max || 0;
            if(document.getElementById("charManaMax")) document.getElementById("charManaMax").value = char.mana_max || 0;

            // Extrair status secundários embutidos no modo leitura
            let historyText = char.history || "";
            const statsMarker = "=== ESTATÍSTICAS SECUNDÁRIAS ===";
            const statsIndex = historyText.indexOf(statsMarker);
            
            if (statsIndex !== -1) {
                const statsBlock = historyText.substring(statsIndex);
                historyText = historyText.substring(0, statsIndex).trim(); 
                
                const defMatch = statsBlock.match(/Defesa:\s*(\d+)/);
                if (defMatch && document.getElementById("charDefense")) document.getElementById("charDefense").value = defMatch[1];
                
                const powerMatch = statsBlock.match(/Elemento:\s*([^\n]+)/);
                if (powerMatch && document.getElementById("charPower")) document.getElementById("charPower").value = powerMatch[1].trim();

                const initMatch = statsBlock.match(/Iniciativa:\s*(\d+)/);
                if (initMatch && document.getElementById("charInitiative")) document.getElementById("charInitiative").value = initMatch[1];
                
                const speedMatch = statsBlock.match(/Deslocamento:\s*(\d+)/);
                if (speedMatch && document.getElementById("charSpeed")) document.getElementById("charSpeed").value = speedMatch[1];
            }

            if(document.getElementById("bgHistory")) document.getElementById("bgHistory").value = historyText;

            generateChecklist(); // Executa validação logo ao preencher a ficha para edição

        } catch (err) {
            showMessage("Erro ao acessar os registos da ficha. Verifique o console.", true);
        }
    }

    async function init() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { window.location.href = "index.html"; return; }
        currentUser = session.user;

        setupAttributeSlots();
        renderDicePool();
        renderSkills();

        if (currentCharacterId) {
            await loadCharacterData(currentCharacterId);
        } else {
            generateChecklist(); 
        }
    }

    characterForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Bloqueio extra caso a função não libere
        if (!generateChecklist()) {
            showMessage("Por favor, preencha todos os requisitos antes de forjar o herói.", true);
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "A Forjar...";
        }

        const compiledTechs = compileTechniques();
        const compiledEquip = compileEquipment();
        
        const baseHistory = document.getElementById("bgHistory")?.value.trim() || "";
        const elPower = document.getElementById("charPower")?.value || "Nenhum";
        const elDef = document.getElementById("charDefense")?.value || "0";
        const elInit = document.getElementById("charInitiative")?.value || "0";
        const elSpeed = document.getElementById("charSpeed")?.value || "0";
        const skillsText = compileSkillsText();

        const historyWithStats = `${baseHistory}\n\n=== ESTATÍSTICAS SECUNDÁRIAS ===\nElemento: ${elPower}\nDefesa: ${elDef} | Iniciativa: ${elInit} | Deslocamento: ${elSpeed}m\nPerícias: ${skillsText || 'Nenhuma'}`;

        // Os campos DEVEM bater exatamente com database/schema.sql
        const characterData = {
            user_id: currentUser.id,
            name: document.getElementById("charName")?.value.trim() || "Herói",
            race: document.getElementById("charRace")?.value.trim() || "",
            class: document.getElementById("charClass")?.value.trim() || "",
            level: parseInt(document.getElementById("charLevel")?.value) || 1,
            avatar_url: document.getElementById("charAvatar")?.value.trim() || "",
            
            hp_max: parseInt(document.getElementById("charHpMax")?.value) || 0,
            mana_max: parseInt(document.getElementById("charManaMax")?.value) || 0,
            
            forca: allocatedAttrs["Força"],
            agilidade: allocatedAttrs["Agilidade"],
            vigor: allocatedAttrs["Vigor"],
            intelecto: allocatedAttrs["Intelecto"],
            percepcao: allocatedAttrs["Percepção"],
            presenca: allocatedAttrs["Presença"],
            precisao: allocatedAttrs["Precisão"],
            controle: allocatedAttrs["Controle"],
            
            skills: compiledTechs,
            inventory: compiledEquip,
            history: historyWithStats.trim()
        };

        try {
            if (currentCharacterId) {
                // UPDATE
                const { error } = await supabase.from('characters').update(characterData).eq('id', currentCharacterId);
                if (error) {
                    logSupabaseError('js/ficha.js', 'Submit', 'characters', 'UPDATE', error);
                    throw error;
                }
                showMessage("Lenda atualizada!");
            } else {
                // INSERT
                const { data, error } = await supabase.from('characters').insert([characterData]).select().single();
                if (error) {
                    logSupabaseError('js/ficha.js', 'Submit', 'characters', 'INSERT', error);
                    throw error;
                }
                currentCharacterId = data.id;
                localStorage.setItem("aeriom_character_id", currentCharacterId);
                showMessage("Novo herói materializado!");
            }

            // Redirecionamento após o sucesso garantido
            setTimeout(() => { window.location.href = "ficha-view.html"; }, 1500);
        } catch (err) {
            showMessage(`Falha ao registrar ficha: ${err.message || 'Erro do banco de dados'}.`, true);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = currentCharacterId ? "Atualizar Herói (Pronto)" : "Forjar Personagem (Pronto)";
            }
        }
    });

    init();
});
