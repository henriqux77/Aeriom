

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // =====================================================
    // CONFIGURAÇÃO
    // =====================================================

    const TOTAL_STEPS = 8;

    const STORAGE_KEY = "aerion_character_draft";

    // IMPORTANTE:
    // Este arquivo é EXCLUSIVAMENTE para CRIAR uma ficha nova.
    // Ele não carrega nem edita fichas existentes.
    //
    // O editor de ficha existente deve ser tratado pelo arquivo
    // do novo editor.
    const CHARACTER_ID_KEY = "aerion_character_id";

    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.error("❌ Supabase não encontrado.");
        return;
    }

    // =====================================================
    // ELEMENTOS
    // =====================================================

    const steps = document.querySelectorAll(".creation-step");

    const stepTitle = document.getElementById("stepTitle");
    const stepCounter = document.getElementById("stepCounter");
    const progressBar = document.getElementById("progressBar");

    const previousStepButton =
        document.getElementById("previousStepButton");

    const nextStepButton =
        document.getElementById("nextStepButton");

    const backButton =
        document.getElementById("backButton");

    const saveStatus =
        document.getElementById("saveStatus");

    const finishCharacterButton =
        document.getElementById("finishCharacterButton");

    // =====================================================
    // GARANTIR QUE ESTAMOS CRIANDO UMA NOVA FICHA
    // =====================================================

    // O criador NÃO deve aproveitar o ID usado pelo editor.
    // Isso evita atualizar uma ficha existente ou duplicá-la
    // quando o usuário entra novamente no criador.
    localStorage.removeItem(CHARACTER_ID_KEY);

    // =====================================================
    // PERSONAGEM NOVO
    // =====================================================

    const character = {
        name: "",
        age: "",
        appearance: "",
        personality: "",
        origin: "",
        objective: "",
        fear: "",
        bond: "",
        history: "",

        race: "",
        racialAbility: "",

        class: "",
        classBonus: "",

        attributes: {
            Presença: "",
            Precisão: "",
            Intelecto: "",
            Controle: "",
            Percepção: "",
            Vigor: "",
            Agilidade: "",
            Força: ""
        },

        power: "",

        mana: {
            control: "",
            reserve: null,
            color: ""
        },

        techniques: []
    };

    // =====================================================
    // RAÇAS
    // =====================================================

    const races = {
        "Humano": {
            ability: "Adaptação",
            description:
                "Uma vez por cena, pode repetir um teste recém-falhado."
        },

        "Elfo": {
            ability: "Percepção Élfica",
            description:
                "Possui vantagem narrativa para perceber Mana, criaturas escondidas e alterações mágicas."
        },

        "Anão": {
            ability: "Forja Ancestral",
            description:
                "Pode identificar materiais, estruturas e armas com grande precisão."
        },

        "Orc": {
            ability: "Fúria de Sangue",
            description:
                "Quando fica com poucos PV, pode entrar em Fúria."
        },

        "Neraliano": {
            ability: "Adaptação Abissal",
            description:
                "Respira normalmente debaixo d'água e nada com grande facilidade."
        },

        "Aureano": {
            ability: "Corpo Celestial",
            description:
                "Possui grande mobilidade em ambientes verticais e altitude."
        }
    };

    // =====================================================
    // CLASSES
    // =====================================================

    const classes = {
        "Mágico": {
            bonus: "+5 Controle de Mana"
        },

        "Guerreiro": {
            bonus: "+1 Controle de Mana"
        },

        "Curandeiro": {
            bonus: "+2 Controle de Mana"
        },

        "Monge": {
            bonus: "Mana corporal"
        }
    };

    // =====================================================
    // ATRIBUTOS
    // =====================================================

    const attributes = [
        "Presença",
        "Precisão",
        "Intelecto",
        "Controle",
        "Percepção",
        "Vigor",
        "Agilidade",
        "Força"
    ];

    // =====================================================
    // DADOS INICIAIS
    // =====================================================

    const startingDice = [
        "D4",
        "D6",
        "D6",
        "D8",
        "D10",
        "D12",
        "D20",
        "D20"
    ];

    let availableDice = [...startingDice];

    // =====================================================
    // ETAPA
    // =====================================================

    let currentStep = 1;

    // =====================================================
    // ESCAPAR HTML
    // =====================================================

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // =====================================================
    // RASCUNHO LOCAL
    // =====================================================

    function loadDraft() {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return;
        }

        try {
            const parsed = JSON.parse(saved);

            if (!parsed || typeof parsed !== "object") {
                return;
            }

            // Nunca importar ID de uma ficha antiga.
            delete parsed.id;
            delete parsed.createdAt;
            delete parsed.updatedAt;

            Object.assign(character, parsed);

            if (
                parsed.attributes &&
                typeof parsed.attributes === "object"
            ) {
                character.attributes = {
                    ...character.attributes,
                    ...parsed.attributes
                };
            }

            if (
                parsed.mana &&
                typeof parsed.mana === "object"
            ) {
                character.mana = {
                    ...character.mana,
                    ...parsed.mana
                };
            }

            if (Array.isArray(parsed.techniques)) {
                character.techniques = parsed.techniques;
            }

            rebuildAvailableDice();

            console.log("💾 Rascunho carregado.");
        } catch (error) {
            console.error(
                "❌ Erro ao carregar rascunho:",
                error
            );

            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function saveDraft() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(character)
            );

            if (saveStatus) {
                saveStatus.textContent = "Salvo";
            }
        } catch (error) {
            console.error(
                "❌ Erro ao salvar rascunho:",
                error
            );

            if (saveStatus) {
                saveStatus.textContent = "Erro";
            }
        }
    }

    let saveTimeout = null;

    function savingStatus() {
        if (saveStatus) {
            saveStatus.textContent = "Salvando...";
        }
    }

    function scheduleSave() {
        savingStatus();

        clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
            saveDraft();
        }, 400);
    }

    // =====================================================
    // DADOS DISPONÍVEIS
    // =====================================================

    function rebuildAvailableDice() {
        availableDice = [...startingDice];

        Object.values(character.attributes).forEach((die) => {
            if (!die) {
                return;
            }

            const index = availableDice.indexOf(die);

            if (index !== -1) {
                availableDice.splice(index, 1);
            }
        });
    }

    // =====================================================
    // ETAPAS
    // =====================================================

    const stepTitles = {
        1: "Conceito",
        2: "Raça",
        3: "Classe",
        4: "Atributos",
        5: "Poder",
        6: "Mana",
        7: "Técnicas",
        8: "Finalização"
    };

    function updateProgress() {
        const percentage =
            (currentStep / TOTAL_STEPS) * 100;

        if (progressBar) {
            progressBar.style.width =
                `${percentage}%`;
        }

        if (stepTitle) {
            stepTitle.textContent =
                stepTitles[currentStep];
        }

        if (stepCounter) {
            stepCounter.textContent =
                `${currentStep} de ${TOTAL_STEPS}`;
        }
    }

    function updateNavigation() {
        if (previousStepButton) {
            previousStepButton.disabled =
                currentStep === 1;
        }

        if (nextStepButton) {
            nextStepButton.style.display =
                currentStep === TOTAL_STEPS
                    ? "none"
                    : "block";
        }

        if (finishCharacterButton) {
            finishCharacterButton.style.display =
                currentStep === TOTAL_STEPS
                    ? "block"
                    : "";
        }
    }

    function showStep(step) {
        if (
            step < 1 ||
            step > TOTAL_STEPS
        ) {
            return;
        }

        currentStep = step;

        steps.forEach((element) => {
            const elementStep =
                Number(element.dataset.step);

            element.classList.toggle(
                "active",
                elementStep === currentStep
            );
        });

        updateProgress();
        updateNavigation();
        updateStepContent();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    // =====================================================
    // VALIDAÇÃO
    // =====================================================

    function validateCurrentStep() {
        if (currentStep === 1) {
            if (!character.name.trim()) {
                alert(
                    "Digite o nome do personagem."
                );

                return false;
            }
        }

        if (currentStep === 2) {
            if (!character.race) {
                alert(
                    "Escolha uma raça."
                );

                return false;
            }
        }

        if (currentStep === 3) {
            if (!character.class) {
                alert(
                    "Escolha uma classe."
                );

                return false;
            }
        }

        if (currentStep === 4) {
            const missing =
                attributes.filter(
                    (attribute) =>
                        !character.attributes[
                            attribute
                        ]
                );

            if (missing.length > 0) {
                alert(
                    "Distribua todos os oito dados antes de continuar."
                );

                return false;
            }
        }

        if (currentStep === 5) {
            if (!character.power) {
                alert(
                    "Escolha um poder."
                );

                return false;
            }
        }

        if (currentStep === 6) {
            if (!character.mana.color) {
                alert(
                    "Escolha a cor da Mana."
                );

                return false;
            }
        }

        return true;
    }

    // =====================================================
    // NAVEGAÇÃO
    // =====================================================

    if (nextStepButton) {
        nextStepButton.addEventListener(
            "click",
            () => {
                if (!validateCurrentStep()) {
                    return;
                }

                if (currentStep < TOTAL_STEPS) {
                    showStep(currentStep + 1);
                }
            }
        );
    }

    if (previousStepButton) {
        previousStepButton.addEventListener(
            "click",
            () => {
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            }
        );
    }

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
                const confirmed = confirm(
                    "Deseja sair da criação da ficha? Seu progresso salvo será mantido."
                );

                if (confirmed) {
                    window.location.href =
                        "fichas.html";
                }
            }
        );
    }

    // =====================================================
    // CONCEITO
    // =====================================================

    const conceptFields = {
        characterName: "name",
        characterAge: "age",
        characterAppearance: "appearance",
        characterPersonality: "personality",
        characterOrigin: "origin",
        characterObjective: "objective",
        characterFear: "fear",
        characterBond: "bond",
        characterHistory: "history"
    };

    Object.entries(conceptFields).forEach(
        ([elementId, property]) => {
            const element =
                document.getElementById(elementId);

            if (!element) {
                return;
            }

            element.value =
                character[property] ?? "";

            element.addEventListener(
                "input",
                () => {
                    character[property] =
                        element.value;

                    scheduleSave();
                }
            );
        }
    );

    // =====================================================
    // RAÇA
    // =====================================================

    const raceButtons =
        document.querySelectorAll("[data-race]");

    raceButtons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const race =
                    button.dataset.race;

                if (!races[race]) {
                    return;
                }

                character.race = race;

                character.racialAbility =
                    races[race].ability || "";

                raceButtons.forEach((item) => {
                    item.classList.remove(
                        "selected"
                    );
                });

                button.classList.add("selected");

                scheduleSave();
            }
        );
    });

    // =====================================================
    // CLASSE
    // =====================================================

    const classButtons =
        document.querySelectorAll("[data-class]");

    classButtons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const selectedClass =
                    button.dataset.class;

                if (!classes[selectedClass]) {
                    return;
                }

                character.class =
                    selectedClass;

                character.classBonus =
                    classes[selectedClass].bonus || "";

                classButtons.forEach((item) => {
                    item.classList.remove(
                        "selected"
                    );
                });

                button.classList.add("selected");

                updateManaControl();

                scheduleSave();
            }
        );
    });

    // =====================================================
    // ATRIBUTOS
    // =====================================================

    function renderAttributes() {
        const container =
            document.getElementById(
                "attributeList"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        attributes.forEach((attribute) => {
            const row =
                document.createElement("div");

            row.className =
                "attribute-row";

            const name =
                document.createElement("span");

            name.className =
                "attribute-name";

            name.textContent =
                attribute;

            const select =
                document.createElement("select");

            select.className =
                "attribute-select";

            select.dataset.attribute =
                attribute;

            const emptyOption =
                document.createElement("option");

            emptyOption.value = "";
            emptyOption.textContent =
                "Escolher dado";

            select.appendChild(
                emptyOption
            );

            const currentValue =
                character.attributes[attribute];

            const possibleDice = [
                ...new Set(
                    [
                        ...availableDice,
                        currentValue
                    ].filter(Boolean)
                )
            ];

            possibleDice.sort((a, b) => {
                const valueA =
                    Number(a.substring(1));

                const valueB =
                    Number(b.substring(1));

                return valueA - valueB;
            });

            possibleDice.forEach((die) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value = die;
                option.textContent = die;

                if (die === currentValue) {
                    option.selected = true;
                }

                select.appendChild(option);
            });

            select.addEventListener(
                "change",
                () => {
                    character.attributes[
                        attribute
                    ] = select.value;

                    rebuildAvailableDice();

                    renderAttributes();

                    scheduleSave();
                }
            );

            row.appendChild(name);
            row.appendChild(select);

            container.appendChild(row);
        });

        renderDicePool();
    }

    function renderDicePool() {
        const container =
            document.getElementById(
                "availableDice"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (availableDice.length === 0) {
            const complete =
                document.createElement("span");

            complete.textContent =
                "Todos os dados distribuídos";

            container.appendChild(complete);

            return;
        }

        availableDice.forEach((die) => {
            const element =
                document.createElement("span");

            element.dataset.die = die;
            element.textContent = die;

            container.appendChild(element);
        });
    }

    // =====================================================
    // PODER
    // =====================================================

    const powerButtons =
        document.querySelectorAll("[data-power]");

    powerButtons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const power =
                    button.dataset.power;

                if (!power) {
                    return;
                }

                character.power = power;

                powerButtons.forEach((item) => {
                    item.classList.remove(
                        "selected"
                    );
                });

                button.classList.add("selected");

                scheduleSave();
            }
        );
    });

    // =====================================================
    // MANA
    // =====================================================

    const manaColor =
        document.getElementById("manaColor");

    if (manaColor) {
        manaColor.value =
            character.mana.color || "";

        manaColor.addEventListener(
            "change",
            () => {
                character.mana.color =
                    manaColor.value;

                scheduleSave();
            }
        );
    }

    function updateManaControl() {
        const element =
            document.getElementById(
                "manaControl"
            );

        if (!element) {
            return;
        }

        const bonus =
            classes[character.class]?.bonus;

        if (character.class === "Mágico") {
            element.textContent = "+5";
        } else if (
            character.class === "Guerreiro"
        ) {
            element.textContent = "+1";
        } else if (
            character.class === "Curandeiro"
        ) {
            element.textContent = "+2";
        } else if (
            character.class === "Monge"
        ) {
            element.textContent = "Corporal";
        } else {
            element.textContent = "—";
        }
    }

    // =====================================================
    // TÉCNICAS
    // =====================================================

    const addTechniqueButton =
        document.getElementById(
            "addTechniqueButton"
        );

    const techniqueList =
        document.getElementById(
            "techniqueList"
        );

    function renderTechniques() {
        if (!techniqueList) {
            return;
        }

        techniqueList.innerHTML = "";

        character.techniques.forEach(
            (technique, index) => {
                const card =
                    document.createElement("div");

                card.className =
                    "technique-card";

                card.innerHTML = `
                    <div>
                        <strong>
                            ${escapeHTML(
                                technique.name ||
                                `Técnica ${index + 1}`
                            )}
                        </strong>

                        <small>
                            Nível
                            ${escapeHTML(
                                technique.level ?? 1
                            )}
                        </small>
                    </div>

                    <button
                        type="button"
                        data-technique-remove="${index}"
                    >
                        Remover
                    </button>
                `;

                techniqueList.appendChild(card);
            }
        );

        techniqueList
            .querySelectorAll(
                "[data-technique-remove]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        const index =
                            Number(
                                button.dataset
                                    .techniqueRemove
                            );

                        if (
                            Number.isNaN(index)
                        ) {
                            return;
                        }

                        character.techniques.splice(
                            index,
                            1
                        );

                        renderTechniques();

                        scheduleSave();
                    }
                );
            });
    }

    if (addTechniqueButton) {
        addTechniqueButton.addEventListener(
            "click",
            () => {
                const name =
                    prompt(
                        "Nome da técnica:"
                    );

                if (!name || !name.trim()) {
                    return;
                }

                character.techniques.push({
                    name: name.trim(),
                    level: 1,
                    type:
                        character.power || "",
                    description: "",
                    range: "",
                    effect: "",
                    manaCost: "",
                    test: "",
                    limitation: ""
                });

                renderTechniques();

                scheduleSave();
            }
        );
    }

    // =====================================================
    // RESUMO
    // =====================================================

    function renderSummary() {
        const container =
            document.getElementById(
                "characterSummary"
            );

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="summary-item">
                <span>Nome</span>
                <strong>
                    ${escapeHTML(
                        character.name ||
                        "Não definido"
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <span>Raça</span>
                <strong>
                    ${escapeHTML(
                        character.race ||
                        "Não definida"
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <span>Classe</span>
                <strong>
                    ${escapeHTML(
                        character.class ||
                        "Não definida"
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <span>Poder</span>
                <strong>
                    ${escapeHTML(
                        character.power ||
                        "Não definido"
                    )}
                </strong>
            </div>

            <div class="summary-item">
                <span>Mana</span>
                <strong>
                    ${escapeHTML(
                        character.mana.color ||
                        "Não definida"
                    )}
                </strong>
            </div>
        `;
    }

    // =====================================================
    // ATUALIZAR INTERFACE
    // =====================================================

    function updateStepContent() {
        raceButtons.forEach((button) => {
            button.classList.toggle(
                "selected",
                button.dataset.race ===
                    character.race
            );
        });

        classButtons.forEach((button) => {
            button.classList.toggle(
                "selected",
                button.dataset.class ===
                    character.class
            );
        });

        powerButtons.forEach((button) => {
            button.classList.toggle(
                "selected",
                button.dataset.power ===
                    character.power
            );
        });

        renderAttributes();

        updateManaControl();

        if (manaColor) {
            manaColor.value =
                character.mana.color || "";
        }

        renderTechniques();

        renderSummary();
    }

    // =====================================================
    // SALVAR NOVA FICHA
    // =====================================================

    async function salvarFichaNoSupabase() {
        try {
            if (saveStatus) {
                saveStatus.textContent =
                    "Salvando...";
            }

            const {
                data: { user },
                error: userError
            } =
                await supabaseClient.auth.getUser();

            if (userError || !user) {
                console.error(
                    "❌ Erro ao obter usuário:",
                    userError
                );

                alert(
                    "Você precisa estar logado para salvar a ficha."
                );

                return false;
            }

            const fichaData = {
                user_id: user.id,

                name:
                    character.name.trim(),

                age:
                    character.age === "" ||
                    character.age === null ||
                    character.age === undefined
                        ? null
                        : Number(character.age),

                appearance:
                    character.appearance,

                personality:
                    character.personality,

                origin:
                    character.origin,

                objective:
                    character.objective,

                fear:
                    character.fear,

                bond:
                    character.bond,

                history:
                    character.history,

                race:
                    character.race,

                racial_ability:
                    character.racialAbility,

                class:
                    character.class,

                class_bonus:
                    character.classBonus,

                attributes:
                    character.attributes,

                power:
                    character.power,

                mana:
                    character.mana,

                techniques:
                    character.techniques
            };

            // =================================================
            // IMPORTANTE:
            // SEMPRE INSERT.
            //
            // Este arquivo NÃO atualiza fichas existentes.
            // =================================================

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("characters")
                    .insert(fichaData)
                    .select()
                    .single();

            if (error || !data) {
                console.error(
                    "❌ Erro ao criar ficha:",
                    error
                );

                if (saveStatus) {
                    saveStatus.textContent =
                        "Erro ao salvar";
                }

                alert(
                    "Erro ao salvar a ficha no banco de dados."
                );

                return false;
            }

            console.log(
                "✅ Nova ficha criada:",
                data
            );

            // =================================================
            // LIMPAR RASCUNHO
            // =================================================

            localStorage.removeItem(
                STORAGE_KEY
            );

            // MUITO IMPORTANTE:
            // Não colocar o ID da ficha criada no
            // aerion_character_id.
            //
            // Esse ID pertence ao fluxo de edição.
            localStorage.removeItem(
                CHARACTER_ID_KEY
            );

            if (saveStatus) {
                saveStatus.textContent =
                    "Salvo";
            }

            // =================================================
            // IR PARA LISTA DE FICHAS
            // =================================================

            window.location.href =
                "fichas.html";

            return true;

        } catch (error) {
            console.error(
                "❌ Erro inesperado ao criar ficha:",
                error
            );

            if (saveStatus) {
                saveStatus.textContent =
                    "Erro ao salvar";
            }

            alert(
                "Ocorreu um erro ao salvar a ficha."
            );

            return false;
        }
    }

    // =====================================================
    // FINALIZAR
    // =====================================================

    if (finishCharacterButton) {
        finishCharacterButton.textContent =
            "Criar ficha";

        finishCharacterButton.addEventListener(
            "click",
            async () => {
                if (!validateCurrentStep()) {
                    return;
                }

                finishCharacterButton.disabled =
                    true;

                const originalText =
                    finishCharacterButton.textContent;

                finishCharacterButton.textContent =
                    "Salvando...";

                const sucesso =
                    await salvarFichaNoSupabase();

                if (!sucesso) {
                    finishCharacterButton.disabled =
                        false;

                    finishCharacterButton.textContent =
                        originalText;
                }
            }
        );
    }

    // =====================================================
    // LOGIN
    // =====================================================

    try {
        const {
            data: { session },
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "❌ Erro ao verificar sessão:",
                error
            );

            return;
        }

        if (!session) {
            alert(
                "Você precisa estar logado para criar uma ficha."
            );

            window.location.href =
                "index.html";

            return;
        }

        console.log(
            "👤 Criando ficha para:",
            session.user.email
        );

    } catch (error) {
        console.error(
            "❌ Erro ao verificar usuário:",
            error
        );

        return;
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    loadDraft();

    rebuildAvailableDice();

    renderAttributes();

    renderTechniques();

    updateManaControl();

    updateStepContent();

    updateProgress();

    updateNavigation();

    showStep(1);

    console.log(
        "🚀 ficha.js — criador de ficha inicializado."
    );
});
