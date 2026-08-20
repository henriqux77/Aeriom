document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // =====================================================
    // PROTEÇÃO CONTRA EXECUÇÃO DUPLICADA
    // =====================================================

    if (window.__AERION_FICHA_VIEW_INITIALIZED__) {
        console.warn("ficha-view.js já foi inicializado.");
        return;
    }

    window.__AERION_FICHA_VIEW_INITIALIZED__ = true;


    // =====================================================
    // CONFIGURAÇÃO
    // =====================================================

    const AVATAR_BUCKET = "avatars";
    const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

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


    // =====================================================
    // HELPERS
    // =====================================================

    const $ = (id) => document.getElementById(id);

    const loading = $("sheetLoading");
    const errorBox = $("sheetError");
    const errorText = $("sheetErrorText");
    const content = $("sheetContent");
    const saveIndicator = $("saveIndicator");
    const updatedLabel = $("updatedLabel");

    const characterId =
        localStorage.getItem("aerion_character_id");


    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase =
        window.supabaseClient;


    if (!supabase) {
        console.error(
            "Supabase não encontrado em window.supabaseClient."
        );

        showError(
            "O sistema de banco de dados não foi carregado. Recarregue a página."
        );

        return;
    }


    // =====================================================
    // ESTADO
    // =====================================================

    let session = null;
    let character = null;

    let saveTimer = null;
    let saveInProgress = false;
    let pendingSave = false;

    let avatarUploadInProgress = false;


    // =====================================================
    // ESTADO VISUAL DA PÁGINA
    // =====================================================

    function showLoading() {
        if (loading) {
            loading.hidden = false;
            loading.style.display = "";
        }

        if (errorBox) {
            errorBox.hidden = true;
            errorBox.style.display = "none";
        }

        if (content) {
            content.hidden = true;
            content.style.display = "none";
        }
    }


    function showContent() {
        if (loading) {
            loading.hidden = true;
            loading.style.display = "none";
        }

        if (errorBox) {
            errorBox.hidden = true;
            errorBox.style.display = "none";
        }

        if (content) {
            content.hidden = false;
            content.style.display = "";
        }
    }


    function showError(message) {
        if (loading) {
            loading.hidden = true;
            loading.style.display = "none";
        }

        if (content) {
            content.hidden = true;
            content.style.display = "none";
        }

        if (errorBox) {
            errorBox.hidden = false;
            errorBox.style.display = "";
        }

        if (errorText) {
            errorText.textContent = message;
        }
    }


    // =====================================================
    // JSON
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
        } catch {
            return fallback;
        }
    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    // =====================================================
    // SALVAMENTO
    // =====================================================

    function setSaveState(state, text) {
        if (!saveIndicator) return;

        saveIndicator.className =
            `save-indicator ${state}`;

        saveIndicator.textContent =
            text;
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
    // VALUE
    // =====================================================

    function setValue(id, value) {
        const element = $(id);

        if (!element) return;

        element.value = value ?? "";
    }


    // =====================================================
    // ATRIBUTOS
    // =====================================================

    function renderAttributes(attributes) {
        const grid = $("attributesGrid");

        if (!grid) return;

        grid.innerHTML = "";

        ATTRIBUTE_NAMES.forEach((name) => {
            const value =
                attributes?.[name] ?? "";

            const field =
                document.createElement("label");

            field.className =
                "attribute-field";

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

        if (!list) return;

        list.innerHTML = "";

        if (
            !Array.isArray(techniques) ||
            techniques.length === 0
        ) {
            if (empty) {
                empty.hidden = false;
            }

            return;
        }

        if (empty) {
            empty.hidden = true;
        }

        techniques.forEach((technique, index) => {
            const card =
                document.createElement("article");

            card.className =
                "technique-card";

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
    // AVATAR
    // =====================================================

    function findAvatarElements() {
        return {
            image:
                $("characterAvatarImage") ||
                $("avatarImage"),

            fallback:
                $("characterAvatarFallback") ||
                $("avatarFallback"),

            input:
                $("avatarInput") ||
                $("characterAvatarInput"),

            button:
                $("avatarUploadButton") ||
                $("characterAvatarButton")
        };
    }


    function renderAvatar(url) {
        const {
            image,
            fallback
        } = findAvatarElements();

        if (!image) return;

        if (url) {
            image.src = url;
            image.hidden = false;

            image.onerror = () => {
                image.hidden = true;

                if (fallback) {
                    fallback.hidden = false;
                }
            };

            if (fallback) {
                fallback.hidden = true;
            }

            return;
        }

        image.removeAttribute("src");
        image.hidden = true;

        if (fallback) {
            fallback.hidden = false;
        }
    }


    function setupAvatarUpload() {
        const {
            input,
            button
        } = findAvatarElements();

        if (!input) return;

        if (button) {
            button.addEventListener(
                "click",
                () => {
                    if (avatarUploadInProgress) {
                        return;
                    }

                    input.click();
                }
            );
        }

        input.addEventListener(
            "change",
            async () => {
                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                await uploadAvatar(file);

                input.value = "";
            }
        );
    }


    async function uploadAvatar(file) {
        if (!character) {
            return;
        }

        if (avatarUploadInProgress) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert(
                "Escolha uma imagem válida."
            );

            return;
        }

        if (file.size > AVATAR_MAX_SIZE) {
            alert(
                "A imagem precisa ter no máximo 5 MB."
            );

            return;
        }

        avatarUploadInProgress = true;

        setSaveState(
            "saving",
            "Enviando avatar..."
        );

        try {
            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "");

            const safeExtension =
                extension || "jpg";

            const filePath =
                `${session.user.id}/${character.id}.${safeExtension}`;


            // =============================================
            // UPLOAD
            // =============================================

            const {
                error: uploadError
            } = await supabase.storage
                .from(AVATAR_BUCKET)
                .upload(
                    filePath,
                    file,
                    {
                        upsert: true,
                        contentType: file.type,
                        cacheControl: "3600"
                    }
                );


            if (uploadError) {
                throw uploadError;
            }


            // =============================================
            // URL PÚBLICA
            // =============================================

            const {
                data: publicData
            } = supabase.storage
                .from(AVATAR_BUCKET)
                .getPublicUrl(filePath);


            const avatarUrl =
                publicData?.publicUrl;


            if (!avatarUrl) {
                throw new Error(
                    "Não foi possível obter a URL do avatar."
                );
            }


            // =============================================
            // SALVAR URL NA FICHA
            // =============================================

            const {
                error: updateError
            } = await supabase
                .from("characters")
                .update({
                    avatar_url: avatarUrl
                })
                .eq(
                    "id",
                    character.id
                )
                .eq(
                    "user_id",
                    session.user.id
                );


            if (updateError) {
                throw updateError;
            }


            character.avatar_url =
                avatarUrl;


            renderAvatar(
                `${avatarUrl}?v=${Date.now()}`
renderAvatar(character.avatar_url, character.name);
            );


            setSaveState(
                "saved",
                "Avatar salvo"
            );


        } catch (error) {
            console.error(
                "Erro ao enviar avatar:",
                error
            );

            setSaveState(
                "error",
                "Erro ao enviar avatar"
            );

            alert(
                "Não foi possível enviar o avatar. Verifique se o armazenamento de imagens está configurado."
            );

        } finally {
            avatarUploadInProgress =
                false;
        }
    }


    // =====================================================
    // RENDERIZAR PERSONAGEM
    // =====================================================

    function renderCharacter(data) {
        character = {
            ...data,

            attributes:
                parseJson(
                    data.attributes,
                    {}
                ),

            mana:
                parseJson(
                    data.mana,
                    {}
                ),

            techniques:
                parseJson(
                    data.techniques,
                    []
                )
        };


        // =============================================
        // DADOS PRINCIPAIS
        // =============================================

        setValue(
            "characterName",
            character.name
        );

        setValue(
            "characterAge",
            character.age
        );

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


        // =============================================
        // DESCRIÇÃO
        // =============================================

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


        // =============================================
        // MANA
        // =============================================

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


        // =============================================
        // TAGS
        // =============================================

        const raceTag =
            $("raceTag");

        if (raceTag) {
            raceTag.textContent =
                character.race ||
                "Raça não definida";
        }


        const classTag =
            $("classTag");

        if (classTag) {
            classTag.textContent =
                character.class ||
                "Classe não definida";
        }


        const powerTag =
            $("powerTag");

        if (powerTag) {
            powerTag.textContent =
                character.power ||
                "Poder não definido";
        }


        if (updatedLabel) {
            updatedLabel.textContent =
                formatUpdatedAt(
                    character.updated_at
                );
        }


        // =============================================
        // AVATAR
        // =============================================

        renderAvatar(
            character.avatar_url
        );


        // =============================================
        // CONTEÚDO
        // =============================================

        renderAttributes(
            character.attributes
        );

        renderTechniques(
            character.techniques
        );


        // =============================================
        // MOSTRAR PÁGINA
        // =============================================

        showContent();

        setSaveState(
            "saved",
            "Salvo"
        );
    }


    // =====================================================
    // COLETAR DADOS
    // =====================================================

    function collectCharacter() {
        const attributes = {};

        document
            .querySelectorAll(
                "[data-attribute]"
            )
            .forEach((input) => {
                attributes[
                    input.dataset.attribute
                ] = input.value.trim();
            });


        const manaColor =
            $("manaColor");

        const manaControl =
            $("manaControl");

        const manaReserve =
            $("manaReserve");


        const mana = {
            color:
                manaColor?.value || "",

            control:
                manaControl?.value?.trim() || "",

            reserve:
                manaReserve?.value?.trim() || ""
        };


        const techniques =
            Array.isArray(
                character.techniques
            )
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

                if (!techniques[index]) {
                    techniques[index] = {};
                }

                techniques[index][key] =
                    input.value.trim();
            });


        const getInputValue =
            (id) =>
                $(id)?.value?.trim() || "";


        const ageElement =
            $("characterAge");

        const ageValue =
            ageElement?.value ?? "";


        let age = null;

        if (ageValue !== "") {
            const numericAge =
                Number(ageValue);

            age =
                Number.isFinite(
                    numericAge
                )
                    ? numericAge
                    : null;
        }


        return {
            name:
                getInputValue(
                    "characterName"
                ),

            age,

            appearance:
                getInputValue(
                    "characterAppearance"
                ),

            personality:
                getInputValue(
                    "characterPersonality"
                ),

            origin:
                getInputValue(
                    "characterOrigin"
                ),

            objective:
                getInputValue(
                    "characterObjective"
                ),

            fear:
                getInputValue(
                    "characterFear"
                ),

            bond:
                getInputValue(
                    "characterBond"
                ),

            history:
                getInputValue(
                    "characterHistory"
                ),

            race:
                getInputValue(
                    "characterRace"
                ),

            racial_ability:
                getInputValue(
                    "racialAbility"
                ),

            class:
                getInputValue(
                    "characterClass"
                ),

            class_bonus:
                getInputValue(
                    "classBonus"
                ),

            attributes,

            power:
                getInputValue(
                    "characterPower"
                ),

            mana,

            techniques
        };
    }


    // =====================================================
    // SALVAR
    // =====================================================

    async function saveCharacter() {
        if (!character) {
            return;
        }

        if (saveInProgress) {
            pendingSave = true;
            return;
        }

        saveInProgress = true;
        pendingSave = false;

        setSaveState(
            "saving",
            "Salvando..."
        );


        try {
            const payload =
                collectCharacter();


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
                    "id, updated_at, avatar_url"
                )
                .single();


            if (error) {
                throw error;
            }


            character = {
                ...character,
                ...payload,

                updated_at:
                    data?.updated_at ||
                    new Date().toISOString(),

                avatar_url:
                    data?.avatar_url ??
                    character.avatar_url
            };


            const raceTag =
                $("raceTag");

            if (raceTag) {
                raceTag.textContent =
                    character.race ||
                    "Raça não definida";
            }


            const classTag =
                $("classTag");

            if (classTag) {
                classTag.textContent =
                    character.class ||
                    "Classe não definida";
            }


            const powerTag =
                $("powerTag");

            if (powerTag) {
                powerTag.textContent =
                    character.power ||
                    "Poder não definido";
            }


            if (updatedLabel) {
                updatedLabel.textContent =
                    formatUpdatedAt(
                        character.updated_at
                    );
            }


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
            saveInProgress =
                false;


            if (pendingSave) {
                pendingSave = false;

                scheduleSave();
            }
        }
    }


    // =====================================================
    // AUTO SAVE
    // =====================================================

    function scheduleSave() {
        if (!character) {
            return;
        }

        setSaveState(
            "pending",
            "Alteração pendente"
        );

        clearTimeout(
            saveTimer
        );

        saveTimer =
            setTimeout(
                () => {
                    saveCharacter();
                },
                700
            );
    }


    function bindAutoSave() {
        if (!content) return;

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

    const quickMenu =
        $("quickMenu");

    const quickActionButton =
        $("quickActionButton");


    function closeQuickMenu() {
        if (!quickMenu) return;

        quickMenu.classList.remove(
            "open"
        );

        quickMenu.setAttribute(
            "aria-hidden",
            "true"
        );

        if (quickActionButton) {
            quickActionButton.setAttribute(
                "aria-expanded",
                "false"
            );

            quickActionButton.classList.remove(
                "open"
            );
        }
    }


    function openQuickMenu() {
        if (!quickMenu) return;

        quickMenu.classList.add(
            "open"
        );

        quickMenu.setAttribute(
            "aria-hidden",
            "false"
        );

        if (quickActionButton) {
            quickActionButton.setAttribute(
                "aria-expanded",
                "true"
            );

            quickActionButton.classList.add(
                "open"
            );
        }
    }


    if (quickActionButton) {
        quickActionButton.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                if (
                    quickMenu?.classList.contains(
                        "open"
                    )
                ) {
                    closeQuickMenu();
                } else {
                    openQuickMenu();
                }
            }
        );
    }


    document
        .querySelectorAll(
            ".quick-item"
        )
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


    function openSection(name) {
        if (!name) return;

        let section = null;

        try {
            section =
                document.querySelector(
                    `[data-section="${CSS.escape(name)}"]`
                );
        } catch {
            return;
        }

        if (!section) return;

        document
            .querySelectorAll(
                ".sheet-section"
            )
            .forEach((item) => {
                item.classList.remove(
                    "active"
                );
            });

        section.classList.add(
            "active"
        );


        requestAnimationFrame(() => {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });


        closeQuickMenu();
    }


    document.addEventListener(
        "click",
        (event) => {
            if (!quickMenu || !quickActionButton) {
                return;
            }

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


    // =====================================================
    // BOTÕES DE VOLTAR
    // =====================================================

    const backButton =
        $("backButton");

    const backErrorButton =
        $("backErrorButton");


    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
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
    // INICIALIZAÇÃO
    // =====================================================

    showLoading();

    bindAutoSave();

    setupAvatarUpload();


    // =====================================================
    // VALIDAR ID
    // =====================================================

    if (!characterId) {
        showError(
            "Nenhuma ficha foi selecionada."
        );

        return;
    }


    // =====================================================
    // SESSÃO
    // =====================================================

    try {
        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {
            console.error(
                "Erro ao obter sessão:",
                error
            );

            showError(
                "Não foi possível verificar sua sessão. Recarregue a página."
            );

            return;
        }


        session =
            data?.session || null;


    } catch (error) {
        console.error(
            "Erro inesperado ao obter sessão:",
            error
        );

        showError(
            "Não foi possível verificar sua sessão."
        );

        return;
    }


    if (!session) {
        window.location.href =
            "index.html";

        return;
    }


    // =====================================================
    // CARREGAR FICHA
    // =====================================================

    try {
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
                avatar_url,
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
            .maybeSingle();


        // =============================================
        // ERRO REAL
        // =============================================

        if (error) {
            console.error(
                "Erro do Supabase ao carregar ficha:",
                error
            );

            showError(
                "Não foi possível carregar a ficha agora. Verifique sua conexão e tente novamente."
            );

            return;
        }


        // =============================================
        // FICHA NÃO EXISTE
        // =============================================

        if (!data) {
            console.warn(
                "Ficha não encontrada:",
                characterId
            );

            showError(
                "A ficha não foi encontrada ou você não tem permissão para acessá-la."
            );

            return;
        }


        // =============================================
        // SUCESSO
        // =============================================

        renderCharacter(data);


    } catch (error) {
        console.error(
            "Erro inesperado ao carregar ficha:",
            error
        );

        showError(
            "Ocorreu um erro inesperado ao carregar a ficha. Tente novamente."
        );
    }
});
function renderAvatar(avatarUrl, characterName = "") {
    const image = $("characterAvatarImage");
    const fallback = $("characterAvatarFallback");

    if (!image || !fallback) return;

    if (avatarUrl) {
        image.src = avatarUrl;
        image.hidden = false;
        fallback.hidden = true;

        image.onerror = () => {
            image.hidden = true;
            fallback.hidden = false;
        };

        return;
    }

    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
}