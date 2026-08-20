/* =========================================================
   AERIOM — FICHA VIEW
   Controle completo da ficha de personagem

   FLUXO:
   fichas.html
        ↓
   localStorage: aerion_character_id
        ↓
   ficha-view.html
        ↓
   carrega characters pelo ID + user_id
        ↓
   edição + auto-save

   Requisitos:
   - window.supabaseClient
   - Supabase Storage bucket: "avatars"
   - Tabela: "characters"
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.__AERION_FICHA_VIEW_INITIALIZED__) {
        console.warn(
            "[Aeriom] ficha-view.js já foi inicializado."
        );

        return;
    }

    window.__AERION_FICHA_VIEW_INITIALIZED__ = true;


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = Object.freeze({
        avatarBucket: "avatars",

        avatarMaxSize:
            5 * 1024 * 1024,

        saveDelay: 700,

        avatarCacheVersion: true,

        attributeNames: [
            "Presença",
            "Precisão",
            "Intelecto",
            "Controle",
            "Percepção",
            "Vigor",
            "Agilidade",
            "Força"
        ]
    });


    /* =====================================================
       HELPERS DOM
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const $$ = (
        selector,
        root = document
    ) =>
        Array.from(
            root.querySelectorAll(selector)
        );


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const elements = {
        loading:
            $("sheetLoading"),

        error:
            $("sheetError"),

        errorText:
            $("sheetErrorText"),

        content:
            $("sheetContent"),

        saveIndicator:
            $("saveIndicator"),

        updatedLabel:
            $("updatedLabel"),

        attributesGrid:
            $("attributesGrid"),

        techniquesList:
            $("techniquesList"),

        noTechniques:
            $("noTechniques"),

        quickMenu:
            $("quickMenu"),

        quickActionButton:
            $("quickActionButton"),

        backButton:
            $("backButton"),

        backErrorButton:
            $("backErrorButton")
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        session: null,

        character: null,

        saveTimer: null,

        saveInProgress: false,

        savePending: false,

        avatarUploading: false,

        initialized: false
    };


    /* =====================================================
       SUPABASE
    ===================================================== */

    const supabase =
        window.supabaseClient;


    if (!supabase) {
        console.error(
            "[Aeriom] window.supabaseClient não encontrado."
        );

        showError(
            "O sistema de banco de dados não foi carregado. Recarregue a página."
        );

        return;
    }


    /* =====================================================
       ID DA FICHA
    ===================================================== */

    const characterId =
        localStorage.getItem(
            "aerion_character_id"
        );


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function parseJson(
        value,
        fallback
    ) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }

        if (
            typeof value === "object"
        ) {
            return value;
        }

        try {
            return JSON.parse(value);

        } catch (error) {
            console.warn(
                "[Aeriom] JSON inválido:",
                value,
                error
            );

            return fallback;
        }
    }


    function normalizeArray(value) {
        return Array.isArray(value)
            ? value
            : [];
    }


    function normalizeObject(value) {
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            return value;
        }

        return {};
    }


    function getValue(id) {
        const element =
            $(id);

        if (!element) {
            return "";
        }

        return String(
            element.value ?? ""
        ).trim();
    }


    function setValue(
        id,
        value
    ) {
        const element =
            $(id);

        if (!element) {
            return;
        }

        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }


    function safeNumber(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : null;
    }


    /* =====================================================
       ESTADOS DA INTERFACE
    ===================================================== */

    function showLoading() {
        if (elements.loading) {
            elements.loading.hidden = false;
            elements.loading.style.display = "";
        }

        if (elements.error) {
            elements.error.hidden = true;
            elements.error.style.display =
                "none";
        }

        if (elements.content) {
            elements.content.hidden = true;
            elements.content.style.display =
                "none";
        }
    }


    function showContent() {
        if (elements.loading) {
            elements.loading.hidden = true;
            elements.loading.style.display =
                "none";
        }

        if (elements.error) {
            elements.error.hidden = true;
            elements.error.style.display =
                "none";
        }

        if (elements.content) {
            elements.content.hidden = false;
            elements.content.style.display =
                "";
        }
    }


    function showError(message) {
        if (elements.loading) {
            elements.loading.hidden = true;
            elements.loading.style.display =
                "none";
        }

        if (elements.content) {
            elements.content.hidden = true;
            elements.content.style.display =
                "none";
        }

        if (elements.error) {
            elements.error.hidden = false;
            elements.error.style.display =
                "";
        }

        if (elements.errorText) {
            elements.errorText.textContent =
                message ||
                "Ocorreu um erro inesperado.";
        }
    }


    /* =====================================================
       STATUS DO AUTO-SAVE
    ===================================================== */

    function setSaveState(
        stateName,
        text
    ) {
        if (!elements.saveIndicator) {
            return;
        }

        elements.saveIndicator.className =
            `save-indicator ${stateName}`;

        elements.saveIndicator.textContent =
            text;
    }


    function formatUpdatedAt(
        value
    ) {
        if (!value) {
            return "Nunca atualizado";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Nunca atualizado";
        }

        return (
            "Atualizado " +
            date.toLocaleDateString(
                "pt-BR"
            ) +
            " às " +
            date.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        );
    }


    function updateUpdatedLabel() {
        if (!elements.updatedLabel) {
            return;
        }

        elements.updatedLabel.textContent =
            formatUpdatedAt(
                state.character?.updated_at
            );
    }


    /* =====================================================
       TAGS
    ===================================================== */

    function updateTags() {
        const character =
            state.character;

        const raceTag =
            $("raceTag");

        const classTag =
            $("classTag");

        const powerTag =
            $("powerTag");


        if (raceTag) {
            raceTag.hidden = false;

            raceTag.textContent =
                character?.race ||
                "Raça não definida";
        }


        if (classTag) {
            classTag.hidden = false;

            classTag.textContent =
                character?.class ||
                "Classe não definida";
        }


        if (powerTag) {
            powerTag.hidden = false;

            powerTag.textContent =
                character?.power ||
                "Poder não definido";
        }
    }


    /* =====================================================
       AVATAR
    ===================================================== */

    function getAvatarElements() {
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


    function createAvatarUrl(
        url
    ) {
        if (!url) {
            return "";
        }

        if (
            !CONFIG.avatarCacheVersion
        ) {
            return url;
        }

        const separator =
            url.includes("?")
                ? "&"
                : "?";

        return (
            `${url}${separator}v=${Date.now()}`
        );
    }


    function renderAvatar(
        avatarUrl,
        characterName = ""
    ) {
        const {
            image,
            fallback
        } =
            getAvatarElements();


        if (!image || !fallback) {
            return;
        }


        image.onerror = null;


        if (!avatarUrl) {
            image.removeAttribute(
                "src"
            );

            image.alt =
                characterName
                    ? `Avatar de ${characterName}`
                    : "Avatar do personagem";

            image.hidden = true;

            fallback.hidden = false;

            return;
        }


        image.alt =
            characterName
                ? `Avatar de ${characterName}`
                : "Avatar do personagem";

        image.hidden = false;

        fallback.hidden = true;


        image.onerror = () => {
            console.warn(
                "[Aeriom] Não foi possível carregar o avatar."
            );

            image.hidden = true;

            fallback.hidden = false;
        };


        image.src =
            createAvatarUrl(
                avatarUrl
            );
    }


    function validateAvatar(
        file
    ) {
        if (!file) {
            return {
                valid: false,

                message:
                    "Nenhuma imagem foi selecionada."
            };
        }


        if (
            !file.type ||
            !file.type.startsWith(
                "image/"
            )
        ) {
            return {
                valid: false,

                message:
                    "Escolha uma imagem válida."
            };
        }


        if (
            file.size >
            CONFIG.avatarMaxSize
        ) {
            return {
                valid: false,

                message:
                    "A imagem precisa ter no máximo 5 MB."
            };
        }


        return {
            valid: true
        };
    }


    function getAvatarExtension(
        file
    ) {
        const mimeMap = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/avif": "avif"
        };


        if (
            mimeMap[file.type]
        ) {
            return mimeMap[
                file.type
            ];
        }


        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    ""
                );


        return extension ||
            "jpg";
    }


    async function uploadAvatar(
        file
    ) {
        if (!state.character) {
            return;
        }

        if (
            state.avatarUploading
        ) {
            return;
        }


        const validation =
            validateAvatar(file);


        if (!validation.valid) {
            window.alert(
                validation.message
            );

            return;
        }


        if (
            !state.session?.user?.id
        ) {
            window.alert(
                "Sua sessão expirou. Entre novamente."
            );

            return;
        }


        state.avatarUploading =
            true;


        setSaveState(
            "saving",
            "Enviando avatar..."
        );


        try {
            const userId =
                state.session.user.id;

            const id =
                state.character.id;

            const extension =
                getAvatarExtension(
                    file
                );


            /*
             * Cada personagem possui
             * seu próprio arquivo.
             */
            const filePath =
                `${userId}/${id}.${extension}`;


            const {
                error:
                    uploadError
            } =
                await supabase.storage
                    .from(
                        CONFIG.avatarBucket
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            upsert: true,

                            contentType:
                                file.type,

                            cacheControl:
                                "3600"
                        }
                    );


            if (uploadError) {
                throw uploadError;
            }


            /* =============================================
               URL PÚBLICA
            ============================================= */

            const {
                data:
                    publicData
            } =
                supabase.storage
                    .from(
                        CONFIG.avatarBucket
                    )
                    .getPublicUrl(
                        filePath
                    );


            const avatarUrl =
                publicData?.publicUrl;


            if (!avatarUrl) {
                throw new Error(
                    "A URL pública do avatar não foi criada."
                );
            }


            /* =============================================
               ATUALIZAR BANCO
            ============================================= */

            const {
                data:
                    updatedCharacter,

                error:
                    updateError
            } =
                await supabase
                    .from(
                        "characters"
                    )
                    .update({
                        avatar_url:
                            avatarUrl
                    })
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .select(
                        "id, avatar_url, updated_at"
                    )
                    .single();


            if (updateError) {
                throw updateError;
            }


            /* =============================================
               ATUALIZAR ESTADO
            ============================================= */

            state.character = {
                ...state.character,

                avatar_url:
                    updatedCharacter
                        ?.avatar_url ||
                    avatarUrl,

                updated_at:
                    updatedCharacter
                        ?.updated_at ||
                    state.character.updated_at
            };


            renderAvatar(
                state.character.avatar_url,

                state.character.name
            );


            updateUpdatedLabel();


            setSaveState(
                "saved",
                "Avatar salvo"
            );


        } catch (error) {
            console.error(
                "[Aeriom] Erro ao enviar avatar:",
                error
            );


            setSaveState(
                "error",
                "Erro ao enviar avatar"
            );


            window.alert(
                "Não foi possível enviar o avatar. Verifique o armazenamento de imagens e tente novamente."
            );


        } finally {
            state.avatarUploading =
                false;
        }
    }


    function setupAvatarUpload() {
        const {
            input,
            button
        } =
            getAvatarElements();


        if (!input) {
            return;
        }


        if (
            input.dataset
                .aerionAvatarBound ===
            "true"
        ) {
            return;
        }


        input.dataset
            .aerionAvatarBound =
            "true";


        if (button) {
            button.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();


                    if (
                        state.avatarUploading
                    ) {
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


                try {
                    await uploadAvatar(
                        file
                    );

                } finally {
                    input.value = "";
                }
            }
        );
    }


    /* =====================================================
       ATRIBUTOS
    ===================================================== */

    function renderAttributes(
        attributes
    ) {
        const grid =
            elements.attributesGrid;


        if (!grid) {
            return;
        }


        grid.innerHTML = "";


        CONFIG.attributeNames.forEach(
            (name) => {
                const value =
                    attributes?.[name] ??
                    "";


                const field =
                    document.createElement(
                        "label"
                    );

                field.className =
                    "attribute-field";


                const label =
                    document.createElement(
                        "span"
                    );

                label.textContent =
                    name;


                const input =
                    document.createElement(
                        "input"
                    );

                input.type = "text";

                input.maxLength = 4;

                input.value =
                    value;

                input.dataset.attribute =
                    name;

                input.setAttribute(
                    "aria-label",
                    name
                );


                field.appendChild(
                    label
                );

                field.appendChild(
                    input
                );


                grid.appendChild(
                    field
                );
            }
        );
    }


    /* =====================================================
       TÉCNICAS
    ===================================================== */

    function renderTechniques(
        techniques
    ) {
        const list =
            elements.techniquesList;

        const empty =
            elements.noTechniques;


        if (!list) {
            return;
        }


        list.innerHTML = "";


        const normalized =
            normalizeArray(
                techniques
            );


        if (
            normalized.length === 0
        ) {
            if (empty) {
                empty.hidden = false;
            }

            return;
        }


        if (empty) {
            empty.hidden = true;
        }


        normalized.forEach(
            (
                technique,
                index
            ) => {
                const data =
                    normalizeObject(
                        technique
                    );


                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "technique-card";


                const head =
                    document.createElement(
                        "div"
                    );

                head.className =
                    "technique-head";


                const titleBox =
                    document.createElement(
                        "div"
                    );


                const level =
                    document.createElement(
                        "span"
                    );

                level.className =
                    "technique-level";

                level.textContent =
                    `Nível ${
                        data.level ??
                        1
                    }`;


                const title =
                    document.createElement(
                        "h3"
                    );

                title.textContent =
                    data.name ||
                    `Técnica ${
                        index + 1
                    }`;


                titleBox.appendChild(
                    level
                );

                titleBox.appendChild(
                    title
                );


                const type =
                    document.createElement(
                        "span"
                    );

                type.className =
                    "technique-type";

                type.textContent =
                    data.type ||
                    state.character?.power ||
                    "Técnica";


                head.appendChild(
                    titleBox
                );

                head.appendChild(
                    type
                );


                const grid =
                    document.createElement(
                        "div"
                    );

                grid.className =
                    "technique-grid";


                grid.appendChild(
                    createTechniqueInput(
                        "Nome",
                        "name",
                        data.name,
                        index
                    )
                );


                grid.appendChild(
                    createTechniqueInput(
                        "Alcance",
                        "range",
                        data.range,
                        index
                    )
                );


                grid.appendChild(
                    createTechniqueInput(
                        "Custo de Mana",
                        "manaCost",
                        data.manaCost,
                        index
                    )
                );


                grid.appendChild(
                    createTechniqueInput(
                        "Teste",
                        "test",
                        data.test,
                        index
                    )
                );


                grid.appendChild(
                    createTechniqueTextarea(
                        "Efeito",
                        "effect",
                        data.effect,
                        index,
                        1000
                    )
                );


                grid.appendChild(
                    createTechniqueTextarea(
                        "Descrição",
                        "description",
                        data.description,
                        index,
                        1500
                    )
                );


                grid.appendChild(
                    createTechniqueTextarea(
                        "Limitação",
                        "limitation",
                        data.limitation,
                        index,
                        500
                    )
                );


                card.appendChild(
                    head
                );

                card.appendChild(
                    grid
                );


                list.appendChild(
                    card
                );
            }
        );
    }


    function createTechniqueInput(
        labelText,
        key,
        value,
        index
    ) {
        const label =
            document.createElement(
                "label"
            );

        label.className =
            "sheet-field";


        const span =
            document.createElement(
                "span"
            );

        span.textContent =
            labelText;


        const input =
            document.createElement(
                "input"
            );

        input.type = "text";


        input.maxLength =
            key === "name"
                ? 100
                : key === "range"
                    ? 120
                    : key === "manaCost"
                        ? 50
                        : 100;


        input.value =
            value ?? "";


        input.dataset.techIndex =
            index;

        input.dataset.techKey =
            key;


        label.appendChild(
            span
        );

        label.appendChild(
            input
        );


        return label;
    }


    function createTechniqueTextarea(
        labelText,
        key,
        value,
        index,
        maxLength
    ) {
        const label =
            document.createElement(
                "label"
            );

        label.className =
            "sheet-field technique-wide";


        const span =
            document.createElement(
                "span"
            );

        span.textContent =
            labelText;


        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.maxLength =
            maxLength;

        textarea.value =
            value ?? "";


        textarea.dataset.techIndex =
            index;

        textarea.dataset.techKey =
            key;


        label.appendChild(
            span
        );

        label.appendChild(
            textarea
        );


        return label;
    }


    /* =====================================================
       MANA
    ===================================================== */

    function renderMana(
        mana
    ) {
        const data =
            normalizeObject(
                mana
            );


        setValue(
            "manaColor",
            data.color
        );


        setValue(
            "manaControl",
            data.control
        );


        setValue(
            "manaReserve",
            data.reserve
        );
    }


    /* =====================================================
       RENDERIZAR PERSONAGEM
    ===================================================== */

    function renderCharacter(
        data
    ) {
        if (!data) {
            return;
        }


        state.character = {
            ...data,

            attributes:
                normalizeObject(
                    parseJson(
                        data.attributes,
                        {}
                    )
                ),

            mana:
                normalizeObject(
                    parseJson(
                        data.mana,
                        {}
                    )
                ),

            techniques:
                normalizeArray(
                    parseJson(
                        data.techniques,
                        []
                    )
                )
        };


        const character =
            state.character;


        /* =================================================
           IDENTIDADE
        ================================================= */

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
            "characterPower",
            character.power
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
            "characterOrigin",
            character.origin
        );


        /* =================================================
           DESCRIÇÃO / HISTÓRIA
        ================================================= */

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


        /* =================================================
           MANA
        ================================================= */

        renderMana(
            character.mana
        );


        /* =================================================
           AVATAR
        ================================================= */

        renderAvatar(
            character.avatar_url,
            character.name
        );


        /* =================================================
           IDENTIDADE VISUAL
        ================================================= */

        const hero =
            document.querySelector(
                ".sheet-hero"
            );


        const identity =
            document.querySelector(
                ".sheet-identity"
            );


        if (hero) {
            hero.hidden = false;
            hero.style.display = "";
        }


        if (identity) {
            identity.hidden = false;
            identity.style.display =
                "block";
            identity.style.visibility =
                "visible";
            identity.style.opacity =
                "1";
        }


        /* =================================================
           TAGS
        ================================================= */

        updateTags();


        /* =================================================
           ATRIBUTOS
        ================================================= */

        renderAttributes(
            character.attributes
        );


        /* =================================================
           TÉCNICAS
        ================================================= */

        renderTechniques(
            character.techniques
        );


        /* =================================================
           DATA
        ================================================= */

        updateUpdatedLabel();


        /* =================================================
           CONTEÚDO
        ================================================= */

        showContent();


        setSaveState(
            "saved",
            "Salvo"
        );
    }


    /* =====================================================
       COLETAR ATRIBUTOS
    ===================================================== */

    function collectAttributes() {
        const attributes = {};


        $$(
            "[data-attribute]"
        ).forEach(
            (input) => {
                const name =
                    input.dataset.attribute;


                if (!name) {
                    return;
                }


                attributes[name] =
                    input.value.trim();
            }
        );


        return attributes;
    }


    /* =====================================================
       COLETAR MANA
    ===================================================== */

    function collectMana() {
        return {
            color:
                $("manaColor")
                    ?.value
                    ?.trim() ||
                "",

            control:
                $("manaControl")
                    ?.value
                    ?.trim() ||
                "",

            reserve:
                $("manaReserve")
                    ?.value
                    ?.trim() ||
                ""
        };
    }


    /* =====================================================
       COLETAR TÉCNICAS
    ===================================================== */

    function collectTechniques() {
        const original =
            normalizeArray(
                state.character?.techniques
            );


        const techniques =
            original.map(
                (technique) => ({
                    ...normalizeObject(
                        technique
                    )
                })
            );


        $$(
            "[data-tech-index][data-tech-key]"
        ).forEach(
            (input) => {
                const index =
                    Number(
                        input.dataset.techIndex
                    );


                const key =
                    input.dataset.techKey;


                if (
                    !Number.isInteger(
                        index
                    ) ||
                    !key
                ) {
                    return;
                }


                if (
                    !techniques[index]
                ) {
                    techniques[index] = {};
                }


                techniques[index][key] =
                    input.value.trim();
            }
        );


        return techniques;
    }


    /* =====================================================
       COLETAR IDADE
    ===================================================== */

    function collectAge() {
        return safeNumber(
            $("characterAge")
                ?.value
        );
    }


    /* =====================================================
       COLETAR FICHA
    ===================================================== */

    function collectCharacter() {
        return {
            name:
                getValue(
                    "characterName"
                ),

            age:
                collectAge(),

            appearance:
                getValue(
                    "characterAppearance"
                ),

            personality:
                getValue(
                    "characterPersonality"
                ),

            origin:
                getValue(
                    "characterOrigin"
                ),

            objective:
                getValue(
                    "characterObjective"
                ),

            fear:
                getValue(
                    "characterFear"
                ),

            bond:
                getValue(
                    "characterBond"
                ),

            history:
                getValue(
                    "characterHistory"
                ),

            race:
                getValue(
                    "characterRace"
                ),

            racial_ability:
                getValue(
                    "racialAbility"
                ),

            class:
                getValue(
                    "characterClass"
                ),

            class_bonus:
                getValue(
                    "classBonus"
                ),

            power:
                getValue(
                    "characterPower"
                ),

            attributes:
                collectAttributes(),

            mana:
                collectMana(),

            techniques:
                collectTechniques()
        };
    }


    /* =====================================================
       SALVAR FICHA
    ===================================================== */

    async function saveCharacter() {
        if (!state.character) {
            return;
        }


        if (
            !state.session?.user?.id
        ) {
            setSaveState(
                "error",
                "Sessão expirada"
            );

            return;
        }


        /*
         * Se existe outro salvamento em andamento,
         * não inicia outro ao mesmo tempo.
         */
        if (
            state.saveInProgress
        ) {
            state.savePending =
                true;

            return;
        }


        state.saveInProgress =
            true;

        state.savePending =
            false;


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
            } =
                await supabase
                    .from(
                        "characters"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        state.character.id
                    )
                    .eq(
                        "user_id",
                        state.session.user.id
                    )
                    .select(
                        "id, updated_at, avatar_url"
                    )
                    .single();


            if (error) {
                throw error;
            }


            state.character = {
                ...state.character,

                ...payload,

                updated_at:
                    data?.updated_at ||
                    new Date()
                        .toISOString(),

                avatar_url:
                    data?.avatar_url ??
                    state.character
                        .avatar_url
            };


            updateTags();

            updateUpdatedLabel();


            setSaveState(
                "saved",
                "Salvo automaticamente"
            );


        } catch (error) {
            console.error(
                "[Aeriom] Erro ao salvar ficha:",
                error
            );


            setSaveState(
                "error",
                "Erro ao salvar"
            );


        } finally {
            state.saveInProgress =
                false;


            /*
             * Se houve alteração durante o
             * salvamento, agenda outro.
             */
            if (
                state.savePending
            ) {
                state.savePending =
                    false;

                scheduleSave();
            }
        }
    }


    /* =====================================================
       AGENDAR AUTO-SAVE
    ===================================================== */

    function scheduleSave() {
        if (!state.character) {
            return;
        }


        clearTimeout(
            state.saveTimer
        );


        setSaveState(
            "pending",
            "Alteração pendente"
        );


        state.saveTimer =
            setTimeout(
                () => {
                    saveCharacter();
                },
                CONFIG.saveDelay
            );
    }


    /* =====================================================
       AUTO-SAVE
    ===================================================== */

    function bindAutoSave() {
        if (!elements.content) {
            return;
        }


        if (
            elements.content.dataset
                .aerionAutosaveBound ===
            "true"
        ) {
            return;
        }


        elements.content.dataset
            .aerionAutosaveBound =
            "true";


        elements.content.addEventListener(
            "input",
            (event) => {
                const target =
                    event.target;


                if (
                    !target.matches(
                        "input, textarea, select"
                    )
                ) {
                    return;
                }


                scheduleSave();
            }
        );


        elements.content.addEventListener(
            "change",
            (event) => {
                const target =
                    event.target;


                if (
                    !target.matches(
                        "input, textarea, select"
                    )
                ) {
                    return;
                }


                scheduleSave();
            }
        );
    }


    /* =====================================================
       MENU RÁPIDO
    ===================================================== */

    function closeQuickMenu() {
        const menu =
            elements.quickMenu;

        const button =
            elements.quickActionButton;


        if (!menu) {
            return;
        }


        menu.classList.remove(
            "open"
        );


        menu.setAttribute(
            "aria-hidden",
            "true"
        );


        if (button) {
            button.classList.remove(
                "open"
            );


            button.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }


    function openQuickMenu() {
        const menu =
            elements.quickMenu;

        const button =
            elements.quickActionButton;


        if (!menu) {
            return;
        }


        menu.classList.add(
            "open"
        );


        menu.setAttribute(
            "aria-hidden",
            "false"
        );


        if (button) {
            button.classList.add(
                "open"
            );


            button.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }


    function toggleQuickMenu() {
        if (
            elements.quickMenu
                ?.classList
                .contains("open")
        ) {
            closeQuickMenu();

        } else {
            openQuickMenu();
        }
    }


    function openSection(
        sectionName
    ) {
        if (!sectionName) {
            return;
        }


        const sections =
            $$(".sheet-section");


        let target =
            null;


        sections.some(
            (section) => {
                if (
                    section.dataset
                        .section ===
                    sectionName
                ) {
                    target =
                        section;

                    return true;
                }


                return false;
            }
        );


        if (!target) {
            console.warn(
                "[Aeriom] Seção não encontrada:",
                sectionName
            );

            return;
        }


        sections.forEach(
            (section) => {
                section.classList.remove(
                    "active"
                );
            }
        );


        target.classList.add(
            "active"
        );


        requestAnimationFrame(
            () => {
                target.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });
            }
        );


        closeQuickMenu();
    }


    function setupQuickMenu() {
        const button =
            elements.quickActionButton;

        const menu =
            elements.quickMenu;


        if (button) {
            button.setAttribute(
                "aria-expanded",
                "false"
            );


            button.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    toggleQuickMenu();
                }
            );
        }


        if (menu) {
            menu.setAttribute(
                "aria-hidden",
                "true"
            );
        }


        $$(".quick-item").forEach(
            (item) => {
                item.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();

                        openSection(
                            item.dataset
                                .target
                        );
                    }
                );
            }
        );


        document.addEventListener(
            "click",
            (event) => {
                if (
                    !menu ||
                    !button
                ) {
                    return;
                }


                if (
                    menu.contains(
                        event.target
                    ) ||
                    button.contains(
                        event.target
                    )
                ) {
                    return;
                }


                closeQuickMenu();
            }
        );


        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    closeQuickMenu();
                }
            }
        );
    }


    /* =====================================================
       NAVEGAÇÃO
    ===================================================== */

    function goBackToCharacters() {
        /*
         * Cancela um possível timer antes de sair.
         */
        clearTimeout(
            state.saveTimer
        );


        window.location.href =
            "fichas.html";
    }


    function setupBackButtons() {
        if (elements.backButton) {
            elements.backButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    goBackToCharacters();
                }
            );
        }


        if (
            elements.backErrorButton
        ) {
            elements.backErrorButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    goBackToCharacters();
                }
            );
        }
    }


    /* =====================================================
       SESSÃO
    ===================================================== */

    async function getSession() {
        try {
            const {
                data,
                error
            } =
                await supabase.auth
                    .getSession();


            if (error) {
                console.error(
                    "[Aeriom] Erro ao obter sessão:",
                    error
                );

                return null;
            }


            return (
                data?.session ||
                null
            );


        } catch (error) {
            console.error(
                "[Aeriom] Erro inesperado ao obter sessão:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       CARREGAR FICHA
    ===================================================== */

    async function loadCharacter() {
        if (!characterId) {
            showError(
                "Nenhuma ficha foi selecionada."
            );

            return false;
        }


        const session =
            await getSession();


        if (!session) {
            window.location.href =
                "index.html";

            return false;
        }


        state.session =
            session;


        try {
            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "characters"
                    )
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


            if (error) {
                console.error(
                    "[Aeriom] Erro ao carregar ficha:",
                    error
                );


                showError(
                    "Não foi possível carregar a ficha agora. Verifique sua conexão e tente novamente."
                );


                return false;
            }


            if (!data) {
                console.warn(
                    "[Aeriom] Ficha não encontrada:",
                    characterId
                );


                showError(
                    "A ficha não foi encontrada ou você não tem permissão para acessá-la."
                );


                return false;
            }


            renderCharacter(
                data
            );


            return true;


        } catch (error) {
            console.error(
                "[Aeriom] Erro inesperado ao carregar ficha:",
                error
            );


            showError(
                "Ocorreu um erro inesperado ao carregar a ficha. Tente novamente."
            );


            return false;
        }
    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {
        if (
            state.initialized
        ) {
            return;
        }


        state.initialized =
            true;


        showLoading();


        /*
         * Eventos independentes
         * do carregamento da ficha.
         */
        setupQuickMenu();

        setupBackButtons();

        setupAvatarUpload();

        bindAutoSave();


        /*
         * Verifica ID.
         */
        if (!characterId) {
            showError(
                "Nenhuma ficha foi selecionada."
            );

            return;
        }


        /*
         * Carrega sessão + ficha.
         */
        await loadCharacter();
    }


    /* =====================================================
       INICIAR
    ===================================================== */

    await init();

});