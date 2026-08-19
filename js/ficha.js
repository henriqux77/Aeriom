document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // CONFIGURAÇÃO
    // =====================================================

    const TOTAL_STEPS = 8;

    const STORAGE_KEY = "aerion_character_draft";


    // =====================================================
    // SUPABASE
    // =====================================================

    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {

        console.error(
            "❌ Supabase não encontrado."
        );

        return;

    }


    // =====================================================
    // ELEMENTOS PRINCIPAIS
    // =====================================================

    const steps =
        document.querySelectorAll(".creation-step");

    const stepTitle =
        document.getElementById("stepTitle");

    const stepCounter =
        document.getElementById("stepCounter");

    const progressBar =
        document.getElementById("progressBar");

    const previousStepButton =
        document.getElementById("previousStepButton");

    const nextStepButton =
        document.getElementById("nextStepButton");

    const backButton =
        document.getElementById("backButton");

    const saveStatus =
        document.getElementById("saveStatus");


    // =====================================================
    // DADOS DA FICHA
    // =====================================================

    const character = {

        id: null,

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

        techniques: [],

        createdAt: null,
        updatedAt: null

    };


    // =====================================================
    // DADOS DAS RAÇAS
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
    // DADOS DAS CLASSES
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
    // DADOS DISPONÍVEIS
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
    // ETAPA ATUAL
    // =====================================================

    let currentStep = 1;


    // =====================================================
    // CARREGAR RASCUNHO
    // =====================================================

    function loadDraft() {

        const saved =
            localStorage.getItem(STORAGE_KEY);


        if (!saved) {

            return;

        }


        try {

            const parsed =
                JSON.parse(saved);


            Object.assign(
                character,
                parsed
            );


            if (
                parsed.attributes
            ) {

                character.attributes =
                    parsed.attributes;

            }


            if (
                parsed.mana
            ) {

                character.mana =
                    parsed.mana;

            }


            if (
                Array.isArray(
                    parsed.techniques
                )
            ) {

                character.techniques =
                    parsed.techniques;

            }


            rebuildAvailableDice();


            console.log(
                "💾 Rascunho carregado."
            );


        } catch (error) {

            console.error(
                "❌ Erro ao carregar rascunho:",
                error
            );

        }

    }


    // =====================================================
    // SALVAR RASCUNHO
    // =====================================================

    function saveDraft() {

        character.updatedAt =
            new Date().toISOString();


        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(character)
        );


        if (saveStatus) {

            saveStatus.textContent =
                "Salvo";

        }

    }


    // =====================================================
    // INDICADOR DE SALVAMENTO
    // =====================================================

    function savingStatus() {

        if (saveStatus) {

            saveStatus.textContent =
                "Salvando...";

        }

    }


    // =====================================================
    // SALVAR COM ATRASO
    // =====================================================

    let saveTimeout;


    function scheduleSave() {

        savingStatus();


        clearTimeout(
            saveTimeout
        );


        saveTimeout =
            setTimeout(
                () => {

                    saveDraft();

                },
                400
            );

    }


    // =====================================================
    // MOSTRAR ETAPA
    // =====================================================

    function showStep(step) {

        if (
            step < 1 ||
            step > TOTAL_STEPS
        ) {

            return;

        }


        currentStep = step;


        steps.forEach(
            (element) => {

                const elementStep =
                    Number(
                        element.dataset.step
                    );


                if (
                    elementStep === currentStep
                ) {

                    element.classList.add(
                        "active"
                    );

                } else {

                    element.classList.remove(
                        "active"
                    );

                }

            }
        );


        updateProgress();


        updateNavigation();


        updateStepContent();


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }


    // =====================================================
    // TÍTULOS DAS ETAPAS
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


    // =====================================================
    // ATUALIZAR PROGRESSO
    // =====================================================

    function updateProgress() {

        const percentage =
            (
                currentStep /
                TOTAL_STEPS
            ) * 100;


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


    // =====================================================
    // ATUALIZAR NAVEGAÇÃO
    // =====================================================

    function updateNavigation() {

        if (previousStepButton) {

            previousStepButton.disabled =
                currentStep === 1;

        }


        if (nextStepButton) {

            if (
                currentStep === TOTAL_STEPS
            ) {

                nextStepButton.style.display =
                    "none";

            } else {

                nextStepButton.style.display =
                    "block";

            }

        }

    }


    // =====================================================
    // PRÓXIMA ETAPA
    // =====================================================

    if (nextStepButton) {

        nextStepButton.addEventListener(
            "click",
            () => {

                if (
                    !validateCurrentStep()
                ) {

                    return;

                }


                if (
                    currentStep <
                    TOTAL_STEPS
                ) {

                    showStep(
                        currentStep + 1
                    );

                }

            }
        );

    }


    // =====================================================
    // ETAPA ANTERIOR
    // =====================================================

    if (previousStepButton) {

        previousStepButton.addEventListener(
            "click",
            () => {

                if (
                    currentStep > 1
                ) {

                    showStep(
                        currentStep - 1
                    );

                }

            }
        );

    }


    // =====================================================
    // BOTÃO VOLTAR
    // =====================================================

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    confirm(
                        "Deseja sair da criação da ficha? Seu progresso salvo será mantido."
                    );


                if (confirmed) {

                    window.location.href =
                        "index.html";

                }

            }
        );

    }


    // =====================================================
    // CONCEITO
    // =====================================================

    const conceptFields = {

        characterName:
            "name",

        characterAge:
            "age",

        characterAppearance:
            "appearance",

        characterPersonality:
            "personality",

        characterOrigin:
            "origin",

        characterObjective:
            "objective",

        characterFear:
            "fear",

        characterBond:
            "bond",

        characterHistory:
            "history"

    };


    Object.entries(
        conceptFields
    ).forEach(
        ([elementId, property]) => {

            const element =
                document.getElementById(
                    elementId
                );


            if (!element) {

                return;

            }


            element.value =
                character[property] || "";


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
        document.querySelectorAll(
            "[data-race]"
        );


    raceButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const race =
                        button.dataset.race;


                    character.race =
                        race;


                    character.racialAbility =
                        races[race]?.ability || "";


                    raceButtons.forEach(
                        (item) => {

                            item.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );


                    scheduleSave();

                }
            );

        }
    );


    // =====================================================
    // CLASSE
    // =====================================================

    const classButtons =
        document.querySelectorAll(
            "[data-class]"
        );


    classButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const selectedClass =
                        button.dataset.class;


                    character.class =
                        selectedClass;


                    character.classBonus =
                        classes[
                            selectedClass
                        ]?.bonus || "";


                    classButtons.forEach(
                        (item) => {

                            item.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );


                    updateManaControl();


                    scheduleSave();

                }
            );

        }
    );


    // =====================================================
    // RECONSTRUIR DADOS DISPONÍVEIS
    // =====================================================

    function rebuildAvailableDice() {

        availableDice =
            [...startingDice];


        Object.values(
            character.attributes
        ).forEach(
            (die) => {

                if (!die) {

                    return;

                }


                const index =
                    availableDice.indexOf(
                        die
                    );


                if (index !== -1) {

                    availableDice.splice(
                        index,
                        1
                    );

                }

            }
        );

    }


    // =====================================================
    // RENDERIZAR ATRIBUTOS
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


        attributes.forEach(
            (attribute) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "attribute-row";


                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "attribute-name";


                name.textContent =
                    attribute;


                const select =
                    document.createElement(
                        "select"
                    );


                select.className =
                    "attribute-select";


                select.dataset.attribute =
                    attribute;


                const emptyOption =
                    document.createElement(
                        "option"
                    );


                emptyOption.value =
                    "";


                emptyOption.textContent =
                    "Escolher dado";


                select.appendChild(
                    emptyOption
                );


                const currentValue =
                    character.attributes[
                        attribute
                    ];


                const possibleDice =
                    [
                        ...new Set(
                            [
                                ...availableDice,
                                currentValue
                            ].filter(Boolean)
                        )
                    ];


                possibleDice.sort(
                    (a, b) => {

                        const valueA =
                            Number(
                                a.substring(1)
                            );

                        const valueB =
                            Number(
                                b.substring(1)
                            );

                        return valueA - valueB;

                    }
                );


                possibleDice.forEach(
                    (die) => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            die;


                        option.textContent =
                            die;


                        if (
                            die === currentValue
                        ) {

                            option.selected =
                                true;

                        }


                        select.appendChild(
                            option
                        );

                    }
                );


                select.addEventListener(
                    "change",
                    () => {

                        const newValue =
                            select.value;


                        const oldValue =
                            character.attributes[
                                attribute
                            ];


                        if (oldValue) {

                            availableDice.push(
                                oldValue
                            );

                        }


                        if (newValue) {

                            const index =
                                availableDice.indexOf(
                                    newValue
                                );


                            if (
                                index !== -1
                            ) {

                                availableDice.splice(
                                    index,
                                    1
                                );

                            }

                        }


                        character.attributes[
                            attribute
                        ] = newValue;


                        renderAttributes();


                        scheduleSave();

                    }
                );


                row.appendChild(
                    name
                );


                row.appendChild(
                    select
                );


                container.appendChild(
                    row
                );

            }
        );


        renderDicePool();

    }


    // =====================================================
    // RENDERIZAR RESERVA DE DADOS
    // =====================================================

    function renderDicePool() {

        const container =
            document.getElementById(
                "availableDice"
            );


        if (!container) {

            return;

        }


        container.innerHTML = "";


        if (
            availableDice.length === 0
        ) {

            const complete =
                document.createElement(
                    "span"
                );


            complete.textContent =
                "Todos os dados distribuídos";

            container.appendChild(
                complete
            );

            return;

        }


        availableDice.forEach(
            (die) => {

                const element =
                    document.createElement(
                        "span"
                    );


                element.dataset.die =
                    die;


                element.textContent =
                    die;


                container.appendChild(
                    element
                );

            }
        );

    }


    // =====================================================
    // PODER
    // =====================================================

    const powerButtons =
        document.querySelectorAll(
            "[data-power]"
        );


    powerButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const power =
                        button.dataset.power;


                    character.power =
                        power;


                    powerButtons.forEach(
                        (item) => {

                            item.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );


                    scheduleSave();

                }
            );

        }
    );


    // =====================================================
    // COR DA MANA
    // =====================================================

    const manaColor =
        document.getElementById(
            "manaColor"
        );


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


    // =====================================================
    // CONTROLE DE MANA
    // =====================================================

    function updateManaControl() {

        const element =
            document.getElementById(
                "manaControl"
            );


        if (!element) {

            return;

        }


        if (
            character.class ===
            "Mágico"
        ) {

            element.textContent =
                "+5";

        } else if (
            character.class ===
            "Guerreiro"
        ) {

            element.textContent =
                "+1";

        } else if (
            character.class ===
            "Curandeiro"
        ) {

            element.textContent =
                "+2";

        } else if (
            character.class ===
            "Monge"
        ) {

            element.textContent =
                "Corporal";

        } else {

            element.textContent =
                "—";

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
                    document.createElement(
                        "div"
                    );


                card.className =
                    "technique-card";


                card.innerHTML = `

                    <div>

                        <strong>
                            ${escapeHTML(
                                technique.name
                            )}
                        </strong>

                        <small>
                            Nível ${technique.level}
                        </small>

                    </div>

                    <button
                        type="button"
                        data-technique-remove="${index}"
                    >
                        Remover
                    </button>

                `;


                techniqueList.appendChild(
                    card
                );

            }
        );


        techniqueList
            .querySelectorAll(
                "[data-technique-remove]"
            )
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const index =
                                Number(
                                    button.dataset
                                        .techniqueRemove
                                );


                            character.techniques
                                .splice(
                                    index,
                                    1
                                );


                            renderTechniques();


                            scheduleSave();

                        }
                    );

                }
            );

    }


    // =====================================================
    // ADICIONAR TÉCNICA
    // =====================================================

    if (addTechniqueButton) {

        addTechniqueButton.addEventListener(
            "click",
            () => {

                const name =
                    prompt(
                        "Nome da técnica:"
                    );


                if (!name) {

                    return;

                }


                const technique = {

                    name:
                        name.trim(),

                    level:
                        1,

                    type:
                        character.power || "",

                    description:
                        "",

                    range:
                        "",

                    effect:
                        "",

                    manaCost:
                        "",

                    test:
                        "",

                    limitation:
                        ""

                };


                character.techniques.push(
                    technique
                );


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
    // VALIDAÇÃO
    // =====================================================

    function validateCurrentStep() {

        // ---------------------------------------------
        // CONCEITO
        // ---------------------------------------------

        if (
            currentStep === 1
        ) {

            if (
                !character.name.trim()
            ) {

                alert(
                    "Digite o nome do personagem."
                );

                return false;

            }

        }


        // ---------------------------------------------
        // RAÇA
        // ---------------------------------------------

        if (
            currentStep === 2
        ) {

            if (
                !character.race
            ) {

                alert(
                    "Escolha uma raça."
                );

                return false;

            }

        }


        // ---------------------------------------------
        // CLASSE
        // ---------------------------------------------

        if (
            currentStep === 3
        ) {

            if (
                !character.class
            ) {

                alert(
                    "Escolha uma classe."
                );

                return false;

            }

        }


        // ---------------------------------------------
        // ATRIBUTOS
        // ---------------------------------------------

        if (
            currentStep === 4
        ) {

            const missing =
                attributes.filter(
                    (attribute) =>
                        !character.attributes[
                            attribute
                        ]
                );


            if (
                missing.length > 0
            ) {

                alert(
                    "Distribua todos os oito dados antes de continuar."
                );

                return false;

            }

        }


        // ---------------------------------------------
        // PODER
        // ---------------------------------------------

        if (
            currentStep === 5
        ) {

            if (
                !character.power
            ) {

                alert(
                    "Escolha um poder."
                );

                return false;

            }

        }


        // ---------------------------------------------
        // MANA
        // ---------------------------------------------

        if (
            currentStep === 6
        ) {

            if (
                !character.mana.color
            ) {

                alert(
                    "Escolha a cor da Mana."
                );

                return false;

            }

        }


        return true;

    }


    // =====================================================
    // ATUALIZAR CONTEÚDO DA ETAPA
    // =====================================================

    function updateStepContent() {

        // Raça

        raceButtons.forEach(
            (button) => {

                button.classList.toggle(
                    "selected",
                    button.dataset.race ===
                    character.race
                );

            }
        );


        // Classe

        classButtons.forEach(
            (button) => {

                button.classList.toggle(
                    "selected",
                    button.dataset.class ===
                    character.class
                );

            }
        );


        // Poder

        powerButtons.forEach(
            (button) => {

                button.classList.toggle(
                    "selected",
                    button.dataset.power ===
                    character.power
                );

            }
        );


        // Atributos

        renderAttributes();


        // Mana

        updateManaControl();


        if (manaColor) {

            manaColor.value =
                character.mana.color || "";

        }


        // Técnicas

        renderTechniques();


        // Resumo

        renderSummary();

    }


    // =====================================================
    // ESCAPAR HTML
    // =====================================================

    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }
// =====================================================
// SALVAR FICHA NO SUPABASE
// =====================================================

async function salvarFichaNoSupabase() {

    try {

        saveStatus.textContent = "Salvando...";


        // ---------------------------------------------
        // PEGAR USUÁRIO LOGADO
        // ---------------------------------------------

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();


        if (userError) {

            console.error(
                "Erro ao obter usuário:",
                userError
            );

            alert(
                "Não foi possível identificar sua conta."
            );

            return false;

        }


        if (!user) {

            alert(
                "Você precisa estar logado para salvar a ficha."
            );

            window.location.href = "index.html";

            return false;

        }


        // ---------------------------------------------
        // PREPARAR DADOS
        // ---------------------------------------------

        const fichaData = {

            user_id: user.id,

            name: character.name.trim(),

            age:
                character.age
                    ? Number(character.age)
                    : null,

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
                character.techniques,

            updated_at:
                new Date().toISOString()

        };


        // ---------------------------------------------
        // CRIAR OU ATUALIZAR
        // ---------------------------------------------

        let result;


        if (character.id) {

            // =========================================
            // ATUALIZAR FICHA EXISTENTE
            // =========================================

            result =
                await supabaseClient
                    .from("characters")
                    .update(fichaData)
                    .eq("id", character.id)
                    .eq("user_id", user.id)
                    .select()
                    .single();


        } else {

            // =========================================
            // CRIAR NOVA FICHA
            // =========================================

            result =
                await supabaseClient
                    .from("characters")
                    .insert(fichaData)
                    .select()
                    .single();

        }


        // ---------------------------------------------
        // VERIFICAR ERRO
        // ---------------------------------------------

        if (result.error) {

            console.error(
                "Erro ao salvar ficha:",
                result.error
            );

            alert(
                "Erro ao salvar a ficha no banco de dados."
            );

            saveStatus.textContent =
                "Erro ao salvar";

            return false;

        }


        // ---------------------------------------------
        // GUARDAR ID DA FICHA
        // ---------------------------------------------

        character.id =
            result.data.id;


        character.createdAt =
            result.data.created_at;

        character.updatedAt =
            result.data.updated_at;


        // ---------------------------------------------
        // MANTER RASCUNHO LOCAL
        // ---------------------------------------------

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(character)
        );


        saveStatus.textContent =
            "Salvo";


        console.log(
            "✅ Ficha salva no Supabase:",
            result.data
        );


        return true;


    } catch (error) {

        console.error(
            "Erro inesperado ao salvar ficha:",
            error
        );

        saveStatus.textContent =
            "Erro ao salvar";

        alert(
            "Ocorreu um erro ao salvar a ficha."
        );

        return false;

    }

}

    // =====================================================
    // FINALIZAR FICHA
    // =====================================================
if (finishCharacterButton) {

    finishCharacterButton.addEventListener(
        "click",
        async () => {

            if (!validateCurrentStep()) {
                return;
            }


            const sucesso =
                await salvarFichaNoSupabase();


            if (!sucesso) {
                return;
            }


            alert(
                "Ficha criada e salva com sucesso!"
            );


            console.log(
                "📜 Ficha:",
                character
            );

        }
    );

}


    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    try {

        const {
            data: { session },
            error
        } =
            await supabaseClient.auth
                .getSession();


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

    }


    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    loadDraft();

    renderAttributes();

    renderTechniques();

    updateManaControl();

    updateStepContent();

    showStep(1);


    console.log(
        "🚀 ficha.js carregado corretamente."
    );

});