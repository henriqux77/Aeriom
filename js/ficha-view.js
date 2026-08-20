

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // =====================================================
    // CONFIGURAÇÃO
    // =====================================================

    const CHARACTER_ID_KEY = "aerion_character_id";

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase não encontrado.");
        return;
    }

    // =====================================================
    // ELEMENTOS
    // =====================================================

    const $ = (id) => document.getElementById(id);

    const loading = $("sheetLoading");
    const errorBox = $("sheetError");
    const errorText = $("sheetErrorText");
    const content = $("sheetContent");
    const saveIndicator = $("saveIndicator");
    const updatedLabel = $("updatedLabel");

    const quickMenu = $("quickMenu");
    const quickActionButton = $("quickActionButton");

    const backButton = $("backButton");
    const backErrorButton = $("backErrorButton");

    // =====================================================
    // ID DA FICHA
    // =====================================================

    const characterId = localStorage.getItem(CHARACTER_ID_KEY);

    if (!characterId) {
        window.location.replace("fichas.html");
        return;
    }

    // =====================================================
    // SESSÃO
    // =====================================================

    let session;

    try {
        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        session = data?.session;

    } catch (error) {
        console.error("Erro ao verificar sessão:", error);

        window.location.replace("index.html");
        return;
    }

    if (!session?.user?.id) {
        window.location.replace("index.html");
        return;
    }

    // =====================================================
    // ESTADO
    // =====================================================

    let character = null;

    let saveTimer = null;
    let saveInProgress = false;
    let saveQueued = false;

    // =====================================================
    // UTILITÁRIOS
    // =====================================================

    function parseJson(value, fallback) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }

        if (typeof value === "object") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn("Valor JSON inválido:", value);
            return fallback;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value ?? "";
        }
    }

    function setValue(id, value) {
        const element = $(id);

        if (!element) {
            return;
        }

        element.value = value ?? "";
    }

    function getValue(id) {
        const element = $(id);

        if (!element) {
            return "";
        }

        return element.value;
    }

    // =====================================================
    // STATUS DE SALVAMENTO
    // =====================================================

    function setSaveState(state, text) {
        if (!saveIndicator) {
            return;
        }

        saveIndicator.className = `save-indicator ${state}`;
        saveIndicator.textContent = text;
    }

    function formatUpdatedAt(value) {
        if (!value) {
            return "Nunca atualizado";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Nunca atualizado";
        }

        return `Atualizado ${date.toLocaleDateString(
            "pt-BR"
        )} às ${date.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )}`;
    }

    // =====================================================
    // TAGS DO PERSONAGEM
    // =====================================================

    function updateCharacterTags() {
        if (!character) {
            return;
        }

        setText(
            "raceTag",
            character.race || "Raça não definida"
        );

        setText(
            "classTag",
            character.class || "Classe não definida"
        );

        setText(
            "powerTag",
            character.power || "Poder não definido"
        );

        setText(
            "updatedLabel",
            formatUpdatedAt(character.updated_at)
        );
    }

    // =====================================================
    // ATRIBUTOS
    // =====================================================

    const ATTRIBUTE_NAMES = [
        "Presença",
        "Precisão",
        "Intelecto",
        "Controle",
        "Percepção",
        "Vigor",
        "Agilidade",
        "Força"
    ];

    function renderAttributes(attributes) {
        const grid = $("attributesGrid");

        if (!grid) {
            return;
        }

        grid.innerHTML = "";

        ATTRIBUTE_NAMES.forEach((name) => {
            const value = attributes?.[name] ?? "";

            const field = document.createElement("label");

            field.className = "attribute-field";

            field.innerHTML = `
                <span>${escapeHtml(name)}</span>

                <input
                    type="text"
                    maxlength="4"
                    value="${escapeHtml(value)}"
                    data-attribute="${escapeHtml(name)}"
                    aria-label="${escapeHtml(name)}"
                >
            `;

            grid.appendChild(field);
        });
    }

    // =====================================================
    // TÉCNICAS
    // =====================================================

    function renderTechniques(techniques) {
        const list = $("techniquesList");
        const empty = $("noTechniques");

        if (!list) {
            return;
        }

        list.innerHTML = "";

        const safeTechniques =
            Array.isArray(techniques)
                ? techniques
                : [];

        if (empty) {
            empty.hidden = safeTechniques.length > 0;
        }

        if (safeTechniques.length === 0) {
            return;
        }

        safeTechniques.forEach((technique, index) => {
            const card = document.createElement("article");

            card.className = "technique-card";

            card.innerHTML = `
                <div class="technique-head">

                    <div>
                        <span class="technique-level">
                            Nível ${escapeHtml(
                                technique.level ?? 1
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                technique.name ||
                                `Técnica ${index + 1}`
                            )}
                        </h3>
                    </div>

                    <span class="technique-type">
                        ${escapeHtml(
                            technique.type ||
                            character?.power ||
                            "Técnica"
                        )}
                    </span>

                </div>

                <div class="technique-grid">

                    <label class="sheet-field">
                        <span>Nome</span>

                        <input
                            type="text"
                            maxlength="100"
                            value="${escapeHtml(
                                technique.name || ""
                            )}"
                            data-tech-index="${index}"
                            data-tech-key="name"
                        >
                    </label>

                    <label class="sheet-field">
                        <span>Alcance</span>

                        <input
                            type="text"
                            maxlength="120"
                            value="${escapeHtml(
                                technique.range || ""
                            )}"
                            data-tech-index="${index}"
                            data-tech-key="range"
                        >
                    </label>

                    <label class="sheet-field">
                        <span>Custo de Mana</span>

                        <input
                            type="text"
                            maxlength="50"
                            value="${escapeHtml(
                                technique.manaCost || ""
                            )}"
                            data-tech-index="${index}"
                            data-tech-key="manaCost"
                        >
                    </label>

                    <label class="sheet-field">
                        <span>Teste</span>

                        <input
                            type="text"
                            maxlength="100"
                            value="${escapeHtml(
                                technique.test || ""
                            )}"
                            data-tech-index="${index}"
                            data-tech-key="test"
                        >
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Efeito</span>

                        <textarea
                            maxlength="1000"
                            data-tech-index="${index}"
                            data-tech-key="effect"
                        >${escapeHtml(
                            technique.effect || ""
                        )}</textarea>
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Descrição</span>

                        <textarea
                            maxlength="1500"
                            data-tech-index="${index}"
                            data-tech-key="description"
                        >${escapeHtml(
                            technique.description || ""
                        )}</textarea>
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Limitação</span>

                        <textarea
                            maxlength="500"
                            data-tech-index="${index}"
                            data-tech-key="limitation"
                        >${escapeHtml(
                            technique.limitation || ""
                        )}</textarea>
                    </label>

                </div>
            `;

            list.appendChild(card);
        });
    }

    // =====================================================
    // RENDERIZAR FICHA
    // =====================================================

    function renderCharacter(data) {
        character = {
            ...data,

            attributes: parseJson(
                data.attributes,
                {}
            ),

            mana: parseJson(
                data.mana,
                {}
            ),

            techniques: parseJson(
                data.techniques,
                []
            )
        };

        setValue("characterName", character.name);
        setValue("characterAge", character.age);

        setValue(
            "characterRace",
            character.race
        );

        setValue(
            "characterClass",
            character.class
        );

        setValue(
            "racialAbility",
            character.racial_ability
        );

        setValue(
            "classBonus",
            character.class_bonus
        );

        setValue(
            "characterPower",
            character.power
        );

        setValue(
            "characterOrigin",
            character.origin
        );

        setValue(
            "characterAppearance",
            character.appearance
        );

        setValue(
            "characterPersonality",
            character.personality
        );

        setValue(
            "characterObjective",
            character.objective
        );

        setValue(
            "characterFear",
            character.fear
        );

        setValue(
            "characterBond",
            character.bond
        );

        setValue(
            "characterHistory",
            character.history
        );

        setValue(
            "manaColor",
            character.mana?.color
        );

        setValue(
            "manaControl",
            character.mana?.control
        );

        setValue(
            "manaReserve",
            character.mana?.reserve
        );

        renderAttributes(
            character.attributes
        );

        renderTechniques(
            character.techniques
        );

        updateCharacterTags();

        if (loading) {
            loading.hidden = true;
        }

        if (errorBox) {
            errorBox.hidden = true;
        }

        if (content) {
            content.hidden = false;
        }

        setSaveState(
            "saved",
            "Salvo"
        );
    }

    // =====================================================
    // COLETAR DADOS DA INTERFACE
    // =====================================================

    function collectCharacter() {
        if (!character) {
            return null;
        }

        const attributes = {};

        document
            .querySelectorAll("[data-attribute]")
            .forEach((input) => {
                attributes[
                    input.dataset.attribute
                ] = input.value.trim();
            });

        const mana = {
            color: getValue("manaColor"),
            control: getValue("manaControl").trim(),
            reserve: getValue("manaReserve").trim()
        };

        const techniques =
            Array.isArray(character.techniques)
                ? character.techniques.map(
                    (technique) => ({
                        ...technique
                    })
                )
                : [];

        document
            .querySelectorAll(
                "[data-tech-index][data-tech-key]"
            )
            .forEach((input) => {
                const index =
                    Number(
                        input.dataset.techIndex
                    );

                const key =
                    input.dataset.techKey;

                if (
                    Number.isNaN(index) ||
                    !key
                ) {
                    return;
                }

                if (!techniques[index]) {
                    techniques[index] = {};
                }

                techniques[index][key] =
                    input.value.trim();
            });

        return {
            name:
                getValue(
                    "characterName"
                ).trim(),

            age:
                getValue(
                    "characterAge"
                ) === ""
                    ? null
                    : Number(
                        getValue(
                            "characterAge"
                        )
                    ),

            appearance:
                getValue(
                    "characterAppearance"
                ).trim(),

            personality:
                getValue(
                    "characterPersonality"
                ).trim(),

            origin:
                getValue(
                    "characterOrigin"
                ).trim(),

            objective:
                getValue(
                    "characterObjective"
                ).trim(),

            fear:
                getValue(
                    "characterFear"
                ).trim(),

            bond:
                getValue(
                    "characterBond"
                ).trim(),

            history:
                getValue(
                    "characterHistory"
                ).trim(),

            race:
                getValue(
                    "characterRace"
                ).trim(),

            racial_ability:
                getValue(
                    "racialAbility"
                ).trim(),

            class:
                getValue(
                    "characterClass"
                ).trim(),

            class_bonus:
                getValue(
                    "classBonus"
                ).trim(),

            attributes,

            power:
                getValue(
                    "characterPower"
                ).trim(),

            mana,

            techniques
        };
    }

    // =====================================================
    // SALVAMENTO AUTOMÁTICO
    // =====================================================

    async function saveCharacter() {
        if (!character) {
            return;
        }

        if (saveInProgress) {
            saveQueued = true;
            return;
        }

        clearTimeout(saveTimer);

        saveInProgress = true;
        saveQueued = false;

        setSaveState(
            "saving",
            "Salvando..."
        );

        const payload =
            collectCharacter();

        if (!payload) {
            saveInProgress = false;
            return;
        }

        try {
            const {
                data,
                error
            } = await supabase
                .from("characters")
                .update(payload)
                .eq(
                    "id",
                    character.id
                )
                .eq(
                    "user_id",
                    session.user.id
                )
                .select(
                    "id, updated_at"
                )
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "Nenhum registro foi atualizado."
                );
            }

            character = {
                ...character,
                ...payload,

                updated_at:
                    data.updated_at ||
                    new Date().toISOString()
            };

            updateCharacterTags();

            setSaveState(
                "saved",
                "Salvo automaticamente"
            );

        } catch (error) {
            console.error(
                "Erro ao salvar ficha:",
                error
            );

            setSaveState(
                "error",
                "Erro ao salvar"
            );

        } finally {
            saveInProgress = false;

            if (saveQueued) {
                saveQueued = false;
                scheduleSave();
            }
        }
    }

    function scheduleSave() {
        setSaveState(
            "pending",
            "Alteração pendente"
        );

        clearTimeout(saveTimer);

        saveTimer = setTimeout(
            () => {
                saveCharacter();
            },
            700
        );
    }

    // =====================================================
    // EVENTOS DE EDIÇÃO
    // =====================================================

    function bindAutoSave() {
        if (!content) {
            return;
        }

        content.addEventListener(
            "input",
            (event) => {
                if (
                    !event.target.matches(
                        "input, textarea, select"
                    )
                ) {
                    return;
                }

                scheduleSave();
            }
        );

        content.addEventListener(
            "change",
            (event) => {
                if (
                    !event.target.matches(
                        "input, textarea, select"
                    )
                ) {
                    return;
                }

                scheduleSave();
            }
        );
    }

    // =====================================================
    // MENU RÁPIDO
    // =====================================================

    function closeQuickMenu() {
        if (!quickMenu || !quickActionButton) {
            return;
        }

        quickMenu.classList.remove("open");

        quickMenu.setAttribute(
            "aria-hidden",
            "true"
        );

        quickActionButton.setAttribute(
            "aria-expanded",
            "false"
        );

        quickActionButton.classList.remove(
            "open"
        );
    }

    function openQuickMenu() {
        if (!quickMenu || !quickActionButton) {
            return;
        }

        quickMenu.classList.add("open");

        quickMenu.setAttribute(
            "aria-hidden",
            "false"
        );

        quickActionButton.setAttribute(
            "aria-expanded",
            "true"
        );

        quickActionButton.classList.add(
            "open"
        );
    }

    function bindQuickMenu() {
        if (
            !quickMenu ||
            !quickActionButton
        ) {
            return;
        }

        quickActionButton.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                if (
                    quickMenu.classList.contains(
                        "open"
                    )
                ) {
                    closeQuickMenu();
                } else {
                    openQuickMenu();
                }
            }
        );

        document
            .querySelectorAll(".quick-item")
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        openSection(
                            button.dataset.target
                        );
                    }
                );
            });

        document.addEventListener(
            "click",
            (event) => {
                if (
                    !quickMenu.contains(
                        event.target
                    ) &&
                    !quickActionButton.contains(
                        event.target
                    )
                ) {
                    closeQuickMenu();
                }
            }
        );
    }

    // =====================================================
    // SEÇÕES
    // =====================================================

    function openSection(name) {
        if (!name) {
            return;
        }

        const sections =
            document.querySelectorAll(
                ".sheet-section"
            );

        let targetSection = null;

        sections.forEach((section) => {
            const isTarget =
                section.dataset.section ===
                name;

            section.classList.toggle(
                "active",
                isTarget
            );

            if (isTarget) {
                targetSection = section;
            }
        });

        if (!targetSection) {
            return;
        }

        requestAnimationFrame(() => {
            targetSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        closeQuickMenu();
    }

    // =====================================================
    // NAVEGAÇÃO
    // =====================================================

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
                clearTimeout(saveTimer);
                window.location.href =
                    "fichas.html";
            }
        );
    }

    if (backErrorButton) {
        backErrorButton.addEventListener(
            "click",
            () => {
                window.location.href =
                    "fichas.html";
            }
        );
    }

    // =====================================================
    // CARREGAR FICHA
    // =====================================================

    async function loadCharacter() {
        try {
            setSaveState(
                "saving",
                "Carregando..."
            );

            const {
                data,
                error
            } = await supabase
                .from("characters")
                .select(`
                    id,
                    user_id,
                    name,
                    age,
                    appearance,
                    personality,
                    origin,
                    objective,
                    fear,
                    bond,
                    history,
                    race,
                    racial_ability,
                    class,
                    class_bonus,
                    attributes,
                    power,
                    mana,
                    techniques,
                    created_at,
                    updated_at
                `)
                .eq(
                    "id",
                    characterId
                )
                .eq(
                    "user_id",
                    session.user.id
                )
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "Ficha não encontrada."
                );
            }

            renderCharacter(data);

        } catch (error) {
            console.error(
                "Erro ao carregar ficha:",
                error
            );

            if (loading) {
                loading.hidden = true;
            }

            if (content) {
                content.hidden = true;
            }

            if (errorBox) {
                errorBox.hidden = false;
            }

            if (errorText) {
                errorText.textContent =
                    "A ficha não existe, foi removida ou você não tem permissão para acessá-la.";
            }

            setSaveState(
                "error",
                "Erro ao carregar"
            );
        }
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    bindAutoSave();
    bindQuickMenu();

    await loadCharacter();

});