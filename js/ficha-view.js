document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const loading = $("sheetLoading");
    const errorBox = $("sheetError");
    const errorText = $("sheetErrorText");
    const content = $("sheetContent");
    const saveIndicator = $("saveIndicator");
    const updatedLabel = $("updatedLabel");

    const characterId = localStorage.getItem("aerion_character_id");

    if (!characterId) {
        window.location.href = "fichas.html";
        return;
    }

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    let character = null;
    let saveTimer = null;
    let saveInProgress = false;
    let pendingSave = false;

    function parseJson(value, fallback) {
        if (value === null || value === undefined || value === "") {
            return fallback;
        }

        if (typeof value === "object") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function setSaveState(state, text) {
        saveIndicator.className = `save-indicator ${state}`;
        saveIndicator.textContent = text;
    }

    function formatUpdatedAt(value) {
        if (!value) return "Nunca atualizado";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Nunca atualizado";

        return `Atualizado ${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        })}`;
    }

    function setValue(id, value) {
        const element = $(id);
        if (!element) return;
        element.value = value ?? "";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderAttributes(attributes) {
        const grid = $("attributesGrid");
        grid.innerHTML = "";

        const names = [
            "Presença",
            "Precisão",
            "Intelecto",
            "Controle",
            "Percepção",
            "Vigor",
            "Agilidade",
            "Força"
        ];

        names.forEach((name) => {
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

    function renderTechniques(techniques) {
        const list = $("techniquesList");
        const empty = $("noTechniques");

        list.innerHTML = "";

        if (!Array.isArray(techniques) || techniques.length === 0) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;

        techniques.forEach((technique, index) => {
            const card = document.createElement("article");
            card.className = "technique-card";

            card.innerHTML = `
                <div class="technique-head">
                    <div>
                        <span class="technique-level">Nível ${escapeHtml(technique.level ?? 1)}</span>
                        <h3>${escapeHtml(technique.name || `Técnica ${index + 1}`)}</h3>
                    </div>
                    <span class="technique-type">${escapeHtml(technique.type || character?.power || "Técnica")}</span>
                </div>

                <div class="technique-grid">
                    <label class="sheet-field">
                        <span>Nome</span>
                        <input type="text" maxlength="100" value="${escapeHtml(technique.name || "")}" data-tech-index="${index}" data-tech-key="name">
                    </label>

                    <label class="sheet-field">
                        <span>Alcance</span>
                        <input type="text" maxlength="120" value="${escapeHtml(technique.range || "")}" data-tech-index="${index}" data-tech-key="range">
                    </label>

                    <label class="sheet-field">
                        <span>Custo de Mana</span>
                        <input type="text" maxlength="50" value="${escapeHtml(technique.manaCost || "")}" data-tech-index="${index}" data-tech-key="manaCost">
                    </label>

                    <label class="sheet-field">
                        <span>Teste</span>
                        <input type="text" maxlength="100" value="${escapeHtml(technique.test || "")}" data-tech-index="${index}" data-tech-key="test">
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Efeito</span>
                        <textarea maxlength="1000" data-tech-index="${index}" data-tech-key="effect">${escapeHtml(technique.effect || "")}</textarea>
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Descrição</span>
                        <textarea maxlength="1500" data-tech-index="${index}" data-tech-key="description">${escapeHtml(technique.description || "")}</textarea>
                    </label>

                    <label class="sheet-field technique-wide">
                        <span>Limitação</span>
                        <textarea maxlength="500" data-tech-index="${index}" data-tech-key="limitation">${escapeHtml(technique.limitation || "")}</textarea>
                    </label>
                </div>
            `;

            list.appendChild(card);
        });
    }

    function renderCharacter(data) {
        character = {
            ...data,
            attributes: parseJson(data.attributes, {}),
            mana: parseJson(data.mana, {}),
            techniques: parseJson(data.techniques, [])
        };

        setValue("characterName", character.name);
        setValue("characterAge", character.age);
        setValue("characterRace", character.race);
        setValue("characterClass", character.class);
        setValue("racialAbility", character.racial_ability);
        setValue("classBonus", character.class_bonus);
        setValue("characterPower", character.power);
        setValue("characterOrigin", character.origin);

        setValue("characterAppearance", character.appearance);
        setValue("characterPersonality", character.personality);
        setValue("characterObjective", character.objective);
        setValue("characterFear", character.fear);
        setValue("characterBond", character.bond);
        setValue("characterHistory", character.history);

        setValue("manaColor", character.mana?.color);
        setValue("manaControl", character.mana?.control);
        setValue("manaReserve", character.mana?.reserve);

        $("raceTag").textContent = character.race || "Raça não definida";
        $("classTag").textContent = character.class || "Classe não definida";
        $("powerTag").textContent = character.power || "Poder não definido";
        $("updatedLabel").textContent = formatUpdatedAt(character.updated_at);

        renderAttributes(character.attributes);
        renderTechniques(character.techniques);

        loading.hidden = true;
        errorBox.hidden = true;
        content.hidden = false;
    }

    function collectCharacter() {
        const attributes = {};

        document.querySelectorAll("[data-attribute]").forEach((input) => {
            attributes[input.dataset.attribute] = input.value.trim();
        });

        const mana = {
            color: $("manaColor").value,
            control: $("manaControl").value.trim(),
            reserve: $("manaReserve").value.trim()
        };

        const techniques = Array.isArray(character.techniques)
            ? character.techniques.map((technique) => ({ ...technique }))
            : [];

        document.querySelectorAll("[data-tech-index][data-tech-key]").forEach((input) => {
            const index = Number(input.dataset.techIndex);
            const key = input.dataset.techKey;

            if (!techniques[index]) techniques[index] = {};
            techniques[index][key] = input.value.trim();
        });

        return {
            name: $("characterName").value.trim(),
            age: $("characterAge").value === "" ? null : Number($("characterAge").value),
            appearance: $("characterAppearance").value.trim(),
            personality: $("characterPersonality").value.trim(),
            origin: $("characterOrigin").value.trim(),
            objective: $("characterObjective").value.trim(),
            fear: $("characterFear").value.trim(),
            bond: $("characterBond").value.trim(),
            history: $("characterHistory").value.trim(),
            race: $("characterRace").value.trim(),
            racial_ability: $("racialAbility").value.trim(),
            class: $("characterClass").value.trim(),
            class_bonus: $("classBonus").value.trim(),
            attributes,
            power: $("characterPower").value.trim(),
            mana,
            techniques
        };
    }

    async function saveCharacter() {
        if (!character || saveInProgress === true) {
            pendingSave = true;
            return;
        }

        saveInProgress = true;
        pendingSave = false;
        setSaveState("saving", "Salvando...");

        const payload = collectCharacter();

        const { data, error } = await supabaseClient
            .from("characters")
            .update(payload)
            .eq("id", character.id)
            .eq("user_id", session.user.id)
            .select("id,updated_at")
            .single();

        saveInProgress = false;

        if (error) {
            console.error("Erro ao salvar ficha:", error);
            setSaveState("error", "Erro ao salvar");

            setTimeout(() => {
                if (saveIndicator.classList.contains("error")) {
                    setSaveState("saved", "Salvo");
                }
            }, 3000);

            return;
        }

        character = {
            ...character,
            ...payload,
            updated_at: data?.updated_at || new Date().toISOString()
        };

        $("raceTag").textContent = character.race || "Raça não definida";
        $("classTag").textContent = character.class || "Classe não definida";
        $("powerTag").textContent = character.power || "Poder não definido";
        $("updatedLabel").textContent = formatUpdatedAt(character.updated_at);

        setSaveState("saved", "Salvo automaticamente");

        if (pendingSave) {
            pendingSave = false;
            scheduleSave();
        }
    }

    function scheduleSave() {
        setSaveState("pending", "Alteração pendente");

        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveCharacter();
        }, 700);
    }

    function bindAutoSave() {
        content.addEventListener("input", (event) => {
            if (!event.target.matches("input, textarea, select")) return;
            scheduleSave();
        });

        content.addEventListener("change", (event) => {
            if (!event.target.matches("input, textarea, select")) return;
            scheduleSave();
        });
    }

    function openSection(name) {
        const section = document.querySelector(`[data-section="${CSS.escape(name)}"]`);
        if (!section) return;

        document.querySelectorAll(".sheet-section").forEach((item) => {
            item.classList.remove("active");
        });

        section.classList.add("active");

        requestAnimationFrame(() => {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        closeQuickMenu();
    }

    const quickMenu = $("quickMenu");
    const quickActionButton = $("quickActionButton");

    function openQuickMenu() {
        quickMenu.classList.add("open");
        quickMenu.setAttribute("aria-hidden", "false");
        quickActionButton.setAttribute("aria-expanded", "true");
        quickActionButton.classList.add("open");
    }

    function closeQuickMenu() {
        quickMenu.classList.remove("open");
        quickMenu.setAttribute("aria-hidden", "true");
        quickActionButton.setAttribute("aria-expanded", "false");
        quickActionButton.classList.remove("open");
    }

    quickActionButton.addEventListener("click", () => {
        if (quickMenu.classList.contains("open")) {
            closeQuickMenu();
        } else {
            openQuickMenu();
        }
    });

    document.querySelectorAll(".quick-item").forEach((button) => {
        button.addEventListener("click", () => {
            openSection(button.dataset.target);
        });
    });

    $("backButton").addEventListener("click", () => {
        window.location.href = "fichas.html";
    });

    $("backErrorButton").addEventListener("click", () => {
        window.location.href = "fichas.html";
    });

    document.addEventListener("click", (event) => {
        if (!quickMenu.contains(event.target) && !quickActionButton.contains(event.target)) {
            closeQuickMenu();
        }
    });

    bindAutoSave();

    const { data, error } = await supabaseClient
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
        .eq("id", characterId)
        .eq("user_id", session.user.id)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar ficha:", error);
        loading.hidden = true;
        errorBox.hidden = false;
        content.hidden = true;
        errorText.textContent = "A ficha não existe, foi removida ou você não tem permissão para acessá-la.";
        return;
    }

    renderCharacter(data);
});