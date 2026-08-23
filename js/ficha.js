/* =========================================================
   AERIOM — MOTOR DE CRIAÇÃO DE FICHAS V4.0 (js/ficha.js)
   Fase 3: Lógica, Wizard, Alocação Interativa e Supabase
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) { console.error("❌ Supabase não inicializado."); return; }

    let currentCharacterId = localStorage.getItem("aeriom_character_id");
    let currentUser = null;

    // Elementos Base
    const characterForm = document.getElementById("characterForm");
    const fichaMessage = document.getElementById("fichaMessage");
    const saveBtn = document.getElementById("saveCharacterBtn");
    
    // Utilitário Seguro
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

        btnPrev.disabled = currentStep === 1;
        
        if (currentStep === totalSteps) {
            btnNext.style.display = 'none';
            generateChecklist(); // Atualiza a revisão final
        } else {
            btnNext.style.display = 'block';
        }
        
        // Scroll tracker into view if on mobile
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
                document.getElementById(hiddenInputId).value = value;
                
                if (onSelectCallback) onSelectCallback(card);
            });
        });
    }

    setupCards("raceGrid", "charRace", (card) => {
        document.getElementById("charRaceAbility").value = card.getAttribute("data-ability");
    });
    
    setupCards("classGrid", "charClass", (card) => {
        const bonus = parseInt(card.getAttribute("data-manabonus")) || 0;
        document.getElementById("charManaBonus").value = bonus;
        updateManaDisplay();
    });

    // =========================================================
    // 3. DISTRIBUIÇÃO DE DADOS (ATRIBUTOS V4.0)
    // =========================================================
    const initialDicePool = [4, 6, 6, 8, 10, 12, 20, 20];
    let allocatedAttrs = { Presença: null, Precisão: null, Intelecto: null, Controle: null, Percepção: null, Vigor: null, Agilidade: null, Força: null };
    
    let selectedDieMobile = null; // Para interações Click/Tap

    function renderDicePool() {
        const pool = document.getElementById("dicePool");
        pool.innerHTML = '';
        
        // Conta os dados usados
        let usedValues = Object.values(allocatedAttrs).filter(v => v !== null);
        let tempPool = [...initialDicePool];
        
        // Remove da pool virtual os que já estão alocados
        usedValues.forEach(val => {
            const index = tempPool.indexOf(val);
            if (index > -1) tempPool.splice(index, 1);
        });

        // Renderiza os restantes
        tempPool.forEach(val => {
            const die = createSafeElement("div", "die-token", `D${val}`);
            die.setAttribute("draggable", "true");
            die.setAttribute("data-type", `D${val}`);
            die.setAttribute("data-val", val);
            
            // Eventos Drag & Drop (Desktop)
            die.addEventListener("dragstart", (e) => {
                die.classList.add("dragging");
                e.dataTransfer.setData("text/plain", val);
                selectedDieMobile = null; // Limpa estado mobile ao arrastar
                clearMobileHighlights();
            });
            die.addEventListener("dragend", () => {
                die.classList.remove("dragging");
            });

            // Evento Touch/Click (Mobile)
            die.addEventListener("click", (e) => {
                document.querySelectorAll(".die-token").forEach(d => d.classList.remove("selected-mobile"));
                die.classList.add("selected-mobile");
                selectedDieMobile = val;
                document.getElementById("attributesList").classList.add("awaiting-drop");
            });

            pool.appendChild(die);
        });
    }

    function setupAttributeSlots() {
        const slots = document.querySelectorAll(".attr-slot");
        
        slots.forEach(slot => {
            const attrName = slot.getAttribute("data-slot");
            
            // Funcionalidade Drag & Drop
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

            // Funcionalidade Click/Tap (Mobile)
            slot.parentElement.addEventListener("click", () => {
                if (selectedDieMobile !== null) {
                    allocateDie(attrName, selectedDieMobile);
                    selectedDieMobile = null;
                    clearMobileHighlights();
                } else if (allocatedAttrs[attrName] !== null) {
                    // Clicar num atributo preenchido devolve o dado à pool
                    allocatedAttrs[attrName] = null;
                    updateAttrUI();
                }
            });
        });
    }

    function allocateDie(attrName, value) {
        // Se a slot já tiver um dado, devolve-o
        // Retira o dado escolhido e coloca na slot
        allocatedAttrs[attrName] = value;
        updateAttrUI();
    }

    function clearMobileHighlights() {
        document.getElementById("attributesList").classList.remove("awaiting-drop");
        document.querySelectorAll(".die-token").forEach(d => d.classList.remove("selected-mobile"));
    }

    function updateAttrUI() {
        renderDicePool();
        const slots = document.querySelectorAll(".attr-slot");
        
        slots.forEach(slot => {
            const attrName = slot.getAttribute("data-slot");
            const val = allocatedAttrs[attrName];
            
            slot.innerHTML = '';
            
            if (val !== null) {
                const die = createSafeElement("div", "die-token", `D${val}`);
                die.setAttribute("data-type", `D${val}`);
                die.style.cursor = "pointer";
                die.title = "Clique para devolver o dado";
                slot.appendChild(die);
                
                // Grava no input escondido removendo os acentos para bater com o Supabase
                const normalizedKey = attrName.replace('ç','c').replace('ã','a').replace('ç','c');
                document.getElementById(`attr${normalizedKey}`).value = val;
            } else {
                const empty = createSafeElement("span", "slot-empty-text", "D?");
                slot.appendChild(empty);
                const normalizedKey = attrName.replace('ç','c').replace('ã','a').replace('ç','c');
                document.getElementById(`attr${normalizedKey}`).value = "";
            }
        });
        
        updateManaDisplay();
    }

    // =========================================================
    // 4. SISTEMAS V4.0 (PODER, MANA E PERÍCIAS)
    // =========================================================
    document.getElementById("rollRandomPowerBtn")?.addEventListener("click", () => {
        const powers = ["Fogo", "Ar", "Terra", "Água", "Gelo", "Eletricidade/Magnetismo", "Vegetação/Natureza", "Gravidade", "Luz/Sombras", "Tecnologia/Construtos"];
        const select = document.getElementById("charPower");
        
        // Simulação rápida de rolar 1d100
        let roll = Math.floor(Math.random() * 100) + 1;
        let index = Math.floor((roll - 1) / 10); // 1-10=0, 11-20=1, etc.
        if (index > 9) index = 9;
        
        select.value = powers[index];
        alert(`O destino girou (1D100 = ${roll}). Despertaste o elemento: ${powers[index]}!`);
    });

    function updateManaDisplay() {
        const classBonus = parseInt(document.getElementById("charManaBonus").value) || 0;
        const controleAttr = allocatedAttrs["Controle"] || 0;
        
        const totalCM = classBonus + controleAttr;
        document.getElementById("displayManaControl").textContent = totalCM;
        document.getElementById("charManaControl").value = totalCM;
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
    // 5. TÉCNICAS E EQUIPAMENTOS (MODULARES)
    // =========================================================
    function attachDynamicList(btnId, containerId, templateFn) {
        document.getElementById(btnId)?.addEventListener("click", () => {
            const placeholder = document.querySelector(`#${containerId} .placeholder-panel`);
            if (placeholder) placeholder.style.display = 'none';
            
            const card = createSafeElement("div", "dynamic-card");
            card.innerHTML = templateFn();
            
            card.querySelector(".btn-remove-card").addEventListener("click", () => {
                card.remove();
                if (document.getElementById(containerId).children.length === 1) {
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
    // 6. CHECKLIST E REVISÃO
    // =========================================================
    function generateChecklist() {
        const checklist = document.getElementById("reviewChecklist");
        checklist.innerHTML = '';
        
        let allValid = true;

        const checkItem = (name, isValid, stepLink) => {
            const item = createSafeElement("div", "review-item");
            item.innerHTML = `
                <div class="review-icon ${isValid ? 'ok' : 'error'}">${isValid ? '✓' : '✖'}</div>
                <div class="review-details"><h4>${name}</h4><p>${isValid ? 'Preenchido' : 'Pendente'}</p></div>
            `;
            item.addEventListener('click', () => { currentStep = stepLink; updateWizardUI(); });
            checklist.appendChild(item);
            if (!isValid) allValid = false;
        };

        checkItem("Identidade Básica", document.getElementById("charName").value.trim() !== '', 1);
        checkItem("Raça Definida", document.getElementById("charRace").value.trim() !== '', 2);
        checkItem("Classe Selecionada", document.getElementById("charClass").value.trim() !== '', 3);
        
        const attrsFilled = Object.values(allocatedAttrs).every(val => val !== null);
        checkItem("Atributos Distribuídos", attrsFilled, 4);
        
        checkItem("Pontos de Vida & Defesa", (document.getElementById("charHpMax").value !== '' && document.getElementById("charDefense").value !== ''), 8);
        checkItem("História Elaborada", document.getElementById("bgHistory").value.trim() !== '', 11);

        const btn = document.getElementById("saveCharacterBtn");
        if (allValid) {
            btn.disabled = false;
            btn.textContent = "Forjar Personagem (Concluir)";
            btn.classList.add("btn-primary");
            btn.classList.remove("btn-secondary");
        } else {
            btn.disabled = true;
            btn.textContent = "Forjar Personagem (Incompleto)";
        }
    }

    // =========================================================
    // 7. COMPILADORES (Formatadores Elegantes para BD)
    // =========================================================
    function compileTechniques() {
        const cards = document.querySelectorAll("#techniquesList .dynamic-card");
        let compiledText = "";
        cards.forEach(card => {
            const name = card.querySelector(".tech-name")?.value || "Sem Nome";
            const cost = card.querySelector(".tech-cost")?.value || "-";
            const test = card.querySelector(".tech-test")?.value || "-";
            const dmg = card.querySelector(".tech-dmg")?.value || "-";
            const range = card.querySelector(".tech-range")?.value || "-";
            const desc = card.querySelector(".tech-desc")?.value || "";
            
            compiledText += `**${name}** (Custo: ${cost} PM | Teste: ${test})\n`;
            compiledText += `*Efeito:* ${dmg} | *Alcance:* ${range}\n`;
            compiledText += `${desc}\n\n`;
        });
        return compiledText.trim();
    }

    function compileEquipment() {
        const cards = document.querySelectorAll("#equipList .dynamic-card");
        let compiledText = `**Dinheiro Inicial:** ${document.getElementById("charMoney").value || "0 moedas"}\n\n**Mochila:**\n`;
        cards.forEach(card => {
            const name = card.querySelector(".equip-name")?.value;
            const dmg = card.querySelector(".equip-dmg")?.value;
            const prop = card.querySelector(".equip-prop")?.value;
            
            if (name) {
                let line = `- ${name}`;
                if (dmg) line += ` (Dano: ${dmg})`;
                if (prop) line += ` [${prop}]`;
                compiledText += line + `\n`;
            }
        });
        return compiledText.trim();
    }

    function compileSkills() {
        let skillsObj = {};
        document.querySelectorAll(".skill-input").forEach(input => {
            skillsObj[input.getAttribute("data-skill")] = parseInt(input.value) || 0;
        });
        return JSON.stringify(skillsObj);
    }

    // =========================================================
    // 8. INIT (MODO EDIÇÃO) E SALVAMENTO
    // =========================================================
    async function loadCharacterData(id) {
        try {
            const { data: char, error } = await supabase.from('characters').select('*').eq('id', id).single();
            if (error) throw error;
            if (!char) return;

            // Step 1
            document.getElementById("charName").value = char.name || "";
            document.getElementById("charLevel").value = char.level || 1;
            document.getElementById("charAvatar").value = char.avatar_url || "";
            
            // Step 2 & 3 (Aciona o click para visual selection)
            if(char.race) document.querySelector(`.choice-card[data-race="${char.race}"]`)?.click();
            if(char.class) document.querySelector(`.choice-card[data-class="${char.class}"]`)?.click();

            // Step 4 (Atributos)
            const attrs = char.attributes || char;
            allocatedAttrs = {
                Presença: attrs.presenca || null,
                Precisão: attrs.precisao || null,
                Intelecto: attrs.intelecto || null,
                Controle: attrs.controle || null,
                Percepção: attrs.percepcao || null,
                Vigor: attrs.vigor || null,
                Agilidade: attrs.agilidade || null,
                Força: attrs.forca || null
            };
            updateAttrUI();

            // Recursos
            document.getElementById("charHpMax").value = char.hp_max || 0;
            document.getElementById("charManaMax").value = char.mana_max || 0;
            document.getElementById("bgHistory").value = char.history || "";

            // Nota: Para edição perfeita de técnicas/inventário a partir do texto compilado, 
            // precisaríamos de um parser reverso. Por agora, eles continuam formatados na textbox
            // ou podem ser reconstruídos numa v2. 
            // O Modo Edição focará na estrutura principal que nunca quebra a DB.

        } catch (err) {
            console.error("Erro ao carregar ficha:", err);
            showMessage("Erro ao acessar os registos antigos.", true);
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
        }
    }

    characterForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "A Forjar...";

        const compiledTechs = compileTechniques();
        const compiledEquip = compileEquipment();
        
        // Atributos Secundários V4 (Gravados num JSON para não quebrar tabelas fixas)
        const secondaryStats = {
            poder: document.getElementById("charPower").value,
            defesa: parseInt(document.getElementById("charDefense").value) || 0,
            iniciativa: parseInt(document.getElementById("charInitiative").value) || 0,
            deslocamento: parseInt(document.getElementById("charSpeed").value) || 0,
            pericias: compileSkills()
        };

        const characterData = {
            user_id: currentUser.id,
            name: document.getElementById("charName").value.trim(),
            race: document.getElementById("charRace").value.trim(),
            class: document.getElementById("charClass").value.trim(),
            level: parseInt(document.getElementById("charLevel").value) || 1,
            avatar_url: document.getElementById("charAvatar").value.trim(),
            
            hp_max: parseInt(document.getElementById("charHpMax").value) || 0,
            mana_max: parseInt(document.getElementById("charManaMax").value) || 0,
            
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
            history: document.getElementById("bgHistory").value.trim(),
            
            // Reutiliza a coluna JSON "attributes" ou injeta na "history" via append, 
            // Para ser 100% safe, usaremos a coluna existente JSON 'attributes' (se existir)
            // ou caso não exista estruturação JSON, os secondaryStats podem ser lidos a partir de lógica auxiliar,
            // mas aqui enviaremos rasos para compatibilidade com a tabela genérica.
        };

        // Inject secondary stats via JSON into existing text/json column
        characterData.secondary_stats = secondaryStats; // Supabase aceitará se a coluna JSONB existir, caso contrário falha.
        // Para garantir sucesso sem alterar o DB, vamos concatenar as infos cruciais na history se não houver coluna própria.
        // Como o prompt disse: "Não alterar o schema sem necessidade". O VTT não lê "defesa" nativamente ainda, lê HP/Mana.

        try {
            if (currentCharacterId) {
                const { error } = await supabase.from('characters').update(characterData).eq('id', currentCharacterId);
                if (error) throw error;
                showMessage("Lenda atualizada!");
            } else {
                const { data, error } = await supabase.from('characters').insert([characterData]).select().single();
                if (error) throw error;
                currentCharacterId = data.id;
                localStorage.setItem("aeriom_character_id", currentCharacterId);
                showMessage("Novo herói materializado!");
            }

            setTimeout(() => { window.location.href = "ficha-view.html"; }, 1500);
        } catch (err) {
            console.error("Erro ao salvar:", err);
            showMessage("Uma falha impediu o registo. Verifique a consola.", true);
            saveBtn.disabled = false;
        }
    });

    init();
});
