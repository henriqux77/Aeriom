/* =========================================================
   AERIOM — NÚCLEO DA MESA DIGITAL
   Arquivo: js/campanha.js

   Responsabilidades:
   - Inicialização da Mesa
   - Autenticação
   - Carregamento da campanha
   - Controle Mestre/Jogador
   - Temas da campanha
   - Navegação entre abas
   - Personagens da campanha
   - Ficha rápida do jogador
   - Alteração de PV/Mana/Condições
   - Rolagens
   - Pedidos de teste
   - Tracker de combate
   - Realtime
   - Integração com módulos externos

   Dependências:
   - window.supabaseClient
   - js/dice.js
   - sistema de tema
   - módulos opcionais da Mesa
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =====================================================
       0. SUPABASE
    ===================================================== */

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("[AERIOM] Supabase não encontrado.");
        return;
    }

    /* =====================================================
       1. ESTADO GLOBAL DA MESA
    ===================================================== */

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;

    let activeStateLinkId = null;

    let playerSheetLinkId = null;
    let playerSheetCharName = "";
    let playerSheetCharacter = null;

    let combatState = createEmptyCombatState();

    let currentRequestAttrValue = 0;
    let currentRequestAttrName = "";

    let realtimeChannel = null;

    let initialized = false;

    /* =====================================================
       2. ELEMENTOS PRINCIPAIS
    ===================================================== */

    const campaignId = localStorage.getItem("aeriom_active_campaign");

    const loadingEl = document.getElementById("loadingDash");
    const contentEl = document.getElementById("dashContent");
    const roleLabel = document.getElementById("campaignRoleLabel");

    const bannerNameSidebar = document.getElementById("bannerName");
    const bannerNameMobile = document.getElementById("bannerNameMobile");
    const bannerTitleDisplay = document.getElementById("bannerTitleDisplay");

    const masterPanel = document.getElementById("masterPanel");

    /* =====================================================
       3. ELEMENTOS DE COMBATE
    ===================================================== */

    const toggleCombatBtn = document.getElementById("toggleCombatBtn");
    const combatMasterPanel = document.getElementById("combatMasterPanel");
    const combatTrackerContainer =
        document.getElementById("combatTrackerContainer");

    const noCombatPlaceholder =
        document.getElementById("noCombatPlaceholder");

    const initiativeList =
        document.getElementById("initiativeList");

    const addCombatantForm =
        document.getElementById("addCombatantForm");

    /* =====================================================
       4. UTILITÁRIOS
    ===================================================== */

    function createSafeElement(tag, className = "", text = null) {
        const el = document.createElement(tag);

        if (className) {
            el.className = className;
        }

        if (text !== null && text !== undefined) {
            el.textContent = String(text);
        }

        return el;
    }

    function safeText(value, fallback = "") {
        if (value === null || value === undefined) {
            return fallback;
        }

        return String(value);
    }

    function safeNumber(value, fallback = 0) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }

    function parseJSON(value, fallback = null) {
        if (value === null || value === undefined || value === "") {
            return fallback;
        }

        if (typeof value === "object") {
            return value;
        }

        if (typeof value !== "string") {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn(
                "[AERIOM] JSON inválido:",
                value,
                error
            );

            return fallback;
        }
    }

    function normalizeArray(value) {
        const parsed = parseJSON(value, value);

        return Array.isArray(parsed)
            ? parsed
            : [];
    }

    function normalizeObject(value) {
        const parsed = parseJSON(value, value);

        if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        ) {
            return parsed;
        }

        return {};
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value, fallback = "") {
        const element = getElement(id);

        if (!element) {
            return;
        }

        element.textContent =
            value === null || value === undefined
                ? fallback
                : String(value);
    }

    function setValue(id, value, fallback = "") {
        const element = getElement(id);

        if (!element) {
            return;
        }

        element.value =
            value === null || value === undefined
                ? fallback
                : value;
    }

    function getValue(id, fallback = "") {
        const element = getElement(id);

        if (!element) {
            return fallback;
        }

        return element.value;
    }

    /* =====================================================
       5. ESTADO PADRÃO DE COMBATE
    ===================================================== */

    function createEmptyCombatState() {
        return {
            id: null,
            campaign_id: campaignId || null,
            is_active: false,
            round_number: 1,
            turn_index: 0,
            combatants: []
        };
    }

    function normalizeCombatState(value) {
        const source = normalizeObject(value);

        const combatants = normalizeArray(
            source.combatants
        )
            .filter(Boolean)
            .map((combatant) => ({
                name: safeText(
                    combatant.name,
                    "Combatente"
                ).trim() || "Combatente",

                init: safeNumber(
                    combatant.init,
                    0
                )
            }));

        let turnIndex = safeNumber(
            source.turn_index,
            0
        );

        if (combatants.length === 0) {
            turnIndex = 0;
        } else {
            turnIndex = Math.max(
                0,
                Math.min(
                    turnIndex,
                    combatants.length - 1
                )
            );
        }

        return {
            id: source.id || null,

            campaign_id:
                source.campaign_id ||
                campaignId,

            is_active:
                Boolean(source.is_active),

            round_number:
                Math.max(
                    1,
                    safeNumber(
                        source.round_number,
                        1
                    )
                ),

            turn_index: turnIndex,

            combatants
        };
    }

    /* =====================================================
       6. PARSER DE TEMA
    ===================================================== */

    function parseCampaignTheme(description) {
        const desc = safeText(description, "");

        if (!desc) {
            return {
                cleanDesc: "",
                themeId: "default"
            };
        }

        const marker = "=== TEMA ===";
        const index = desc.indexOf(marker);

        if (index === -1) {
            return {
                cleanDesc: desc.trim(),
                themeId: "default"
            };
        }

        const cleanDesc =
            desc
                .substring(0, index)
                .trim();

        const block =
            desc.substring(index);

        const match =
            block.match(
                /ID:\s*([a-zA-Z0-9_-]+)/
            );

        return {
            cleanDesc,
            themeId:
                match && match[1]
                    ? match[1]
                    : "default"
        };
    }

    /* =====================================================
       7. APLICAR DADOS VISUAIS DA CAMPANHA
    ===================================================== */

    function updateCampaignVisuals() {
        if (!currentCampaign) {
            return;
        }

        const name =
            safeText(
                currentCampaign.name,
                "Campanha"
            );

        setText(
            "bannerName",
            name
        );

        setText(
            "bannerNameMobile",
            name
        );

        setText(
            "bannerTitleDisplay",
            name
        );

        const parsed =
            parseCampaignTheme(
                currentCampaign.description
            );

        if (
            window.AeriomThemeManager &&
            typeof window.AeriomThemeManager.applyTheme === "function"
        ) {
            try {
                window.AeriomThemeManager.applyTheme(
                    parsed.themeId,
                    currentCampaign.cover_url || null
                );
            } catch (error) {
                console.error(
                    "[AERIOM] Erro ao aplicar tema:",
                    error
                );
            }
        }
    }

    /* =====================================================
       8. CONTROLE DE ACESSO VISUAL
    ===================================================== */

    function updateRoleInterface() {
        const isMaster =
            userRole === "master";

        if (roleLabel) {
            roleLabel.textContent =
                isMaster
                    ? "Mestre"
                    : "Aventureiro";

            roleLabel.style.color =
                isMaster
                    ? "var(--theme-accent, var(--color-warning))"
                    : "var(--theme-primary, var(--color-primary))";
        }

        if (masterPanel) {
            masterPanel.style.display =
                isMaster
                    ? "block"
                    : "none";
        }

        document
            .querySelectorAll(".master-only")
            .forEach((element) => {
                element.style.display =
                    isMaster
                        ? ""
                        : "none";
            });

        const masterThemeMobile =
            getElement(
                "openMasterThemeMobile"
            );

        if (masterThemeMobile) {
            masterThemeMobile.style.display =
                isMaster
                    ? "block"
                    : "none";
        }
    }

    /* =====================================================
       9. ESTADOS DE LOADING
    ===================================================== */

    function showLoading() {
        if (loadingEl) {
            loadingEl.style.display = "flex";
        }

        if (contentEl) {
            contentEl.style.display = "none";
        }
    }

    function showContent() {
        if (loadingEl) {
            loadingEl.style.display = "none";
        }

        if (contentEl) {
            contentEl.style.display = "flex";
        }
    }

    function showFatalError(error) {
        console.error(
            "[AERIOM] Falha na Mesa:",
            error
        );

        if (!loadingEl) {
            return;
        }

        loadingEl.innerHTML = "";

        const icon =
            createSafeElement(
                "div",
                "placeholder-icon",
                "⚠️"
            );

        const title =
            createSafeElement(
                "h3",
                "",
                "A Magia Falhou"
            );

        title.style.color =
            "var(--color-danger)";

        const message =
            createSafeElement(
                "p",
                "text-muted",
                "Os tomos desta campanha não puderam ser abertos. Verifique a conexão e tente novamente."
            );

        const button =
            createSafeElement(
                "button",
                "btn btn-primary",
                "Voltar para Campanhas"
            );

        button.addEventListener(
            "click",
            () => {
                window.location.href =
                    "campanhas.html";
            }
        );

        loadingEl.appendChild(icon);
        loadingEl.appendChild(title);
        loadingEl.appendChild(message);
        loadingEl.appendChild(button);

        loadingEl.style.display = "flex";

        if (contentEl) {
            contentEl.style.display =
                "none";
        }
    }

    /* =====================================================
       10. INICIALIZAÇÃO
    ===================================================== */

    async function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        showLoading();

        if (!campaignId) {
            console.warn(
                "[AERIOM] Nenhuma campanha ativa."
            );

            window.location.href =
                "campanhas.html";

            return;
        }

        setupTabs();
        setupThemeModal();
        setupPlayerSheetEvents();
        setupCharacterStateEvents();
        setupCombatEvents();
        setupRollEvents();

        try {
            const {
                data: {
                    session
                },
                error
            } =
                await supabase.auth.getSession();

            if (
                error ||
                !session ||
                !session.user
            ) {
                console.warn(
                    "[AERIOM] Sessão inexistente."
                );

                window.location.href =
                    "index.html";

                return;
            }

            currentUser =
                session.user;

            await loadCampaignData();

            setupRealtime();

            initializeExternalModules();

            await loadCombatState();

        } catch (error) {
            showFatalError(error);
        }
    }

    /* =====================================================
       11. MÓDULOS EXTERNOS
    ===================================================== */

    function initializeExternalModules() {
        try {
            if (
                typeof window.initTimelineSystem ===
                "function"
            ) {
                window.initTimelineSystem(
                    supabase,
                    campaignId
                );
            }

            if (
                typeof window.initCookingSystem ===
                "function"
            ) {
                window.initCookingSystem(
                    supabase,
                    campaignId
                );
            }

            if (
                typeof window.initSessionSystem ===
                "function"
            ) {
                window.initSessionSystem(
                    supabase,
                    campaignId
                );
            }

            if (
                typeof window.initSecretsSystem ===
                "function"
            ) {
                window.initSecretsSystem(
                    supabase,
                    campaignId,
                    currentUser,
                    userRole
                );
            }

            if (
                typeof window.initMapSystem ===
                "function"
            ) {
                window.initMapSystem(
                    supabase,
                    campaignId,
                    userRole
                );
            }
        } catch (error) {
            console.error(
                "[AERIOM] Erro ao inicializar módulo externo:",
                error
            );
        }
    }

    /* =====================================================
       12. CARREGAMENTO DA CAMPANHA
    ===================================================== */

    async function loadCampaignData() {
        if (!currentUser) {
            throw new Error(
                "Usuário não autenticado."
            );
        }

        /* -----------------------------------------------
           MEMBRO DA CAMPANHA
        ------------------------------------------------ */

        const {
            data: memberData,
            error: memberError
        } =
            await supabase
                .from("campaign_members")
                .select("role")
                .eq(
                    "campaign_id",
                    campaignId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if (memberError) {
            throw memberError;
        }

        /*
         * Não assumimos acesso de jogador quando não
         * existe membro. Isso evita abrir uma campanha
         * inválida silenciosamente.
         */
        if (!memberData) {
            console.warn(
                "[AERIOM] Usuário não pertence à campanha."
            );

            window.location.href =
                "campanhas.html";

            return;
        }

        userRole =
            memberData.role === "master"
                ? "master"
                : "player";

        /* -----------------------------------------------
           CAMPANHA
        ------------------------------------------------ */

        const {
            data: campaignData,
            error: campaignError
        } =
            await supabase
                .from("campaigns")
                .select("*")
                .eq(
                    "id",
                    campaignId
                )
                .single();

        if (campaignError) {
            throw campaignError;
        }

        if (!campaignData) {
            throw new Error(
                "Campanha não encontrada."
            );
        }

        currentCampaign =
            campaignData;

        updateCampaignVisuals();
        updateRoleInterface();
        showContent();

        await loadCampaignCharacters();
    }

    /* =====================================================
       13. REALTIME
    ===================================================== */

    function setupRealtime() {
        if (realtimeChannel) {
            try {
                supabase.removeChannel(
                    realtimeChannel
                );
            } catch (_) {}
        }

        realtimeChannel =
            supabase
                .channel(
                    `campaign-events-${campaignId}`
                )

                /* ---------------------------------------
                   CAMPANHA
                ---------------------------------------- */

                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "campaigns",
                        filter:
                            `id=eq.${campaignId}`
                    },
                    (payload) => {
                        if (
                            !payload ||
                            !payload.new
                        ) {
                            return;
                        }

                        currentCampaign =
                            payload.new;

                        updateCampaignVisuals();
                    }
                )

                /* ---------------------------------------
                   LOGS
                ---------------------------------------- */

                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "campaign_logs",
                        filter:
                            `campaign_id=eq.${campaignId}`
                    },
                    async (payload) => {
                        const newLog =
                            payload?.new;

                        if (!newLog) {
                            return;
                        }

                        const logsTab =
                            getElement(
                                "tab-logs"
                            );

                        if (
                            logsTab?.classList
                                .contains("active") &&
                            typeof window.loadTimeline ===
                                "function"
                        ) {
                            try {
                                await window.loadTimeline();
                            } catch (error) {
                                console.error(
                                    "[AERIOM] Erro ao atualizar timeline:",
                                    error
                                );
                            }
                        }

                        if (
                            newLog.log_type ===
                                "request_roll" &&
                            userRole !== "master"
                        ) {
                            showRollRequest(
                                newLog.description
                            );
                        }
                    }
                )

                /* ---------------------------------------
                   MURAL
                ---------------------------------------- */

                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "campaign_mural",
                        filter:
                            `campaign_id=eq.${campaignId}`
                    },
                    async () => {
                        const muralTab =
                            getElement(
                                "tab-mural"
                            );

                        if (
                            muralTab?.classList
                                .contains("active") &&
                            typeof window.loadMural ===
                                "function"
                        ) {
                            try {
                                await window.loadMural();
                            } catch (error) {
                                console.error(
                                    "[AERIOM] Erro ao atualizar mural:",
                                    error
                                );
                            }
                        }
                    }
                )

                /* ---------------------------------------
                   COMBATE
                ---------------------------------------- */

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "campaign_combat",
                        filter:
                            `campaign_id=eq.${campaignId}`
                    },
                    (payload) => {
                        if (
                            payload.eventType ===
                            "DELETE"
                        ) {
                            combatState =
                                createEmptyCombatState();
                        } else if (
                            payload.new &&
                            Object.keys(
                                payload.new
                            ).length > 0
                        ) {
                            combatState =
                                normalizeCombatState(
                                    payload.new
                                );
                        }

                        renderCombat();
                    }
                )

                .subscribe((status) => {
                    if (
                        status === "CHANNEL_ERROR"
                    ) {
                        console.error(
                            "[AERIOM] Falha no canal Realtime."
                        );
                    }
                });
    }

    /* =====================================================
       14. NAVEGAÇÃO DAS ABAS
    ===================================================== */

    function setupTabs() {
        const tabs =
            document.querySelectorAll(
                ".dash-tab, .nav-mob-btn"
            );

        const contents =
            document.querySelectorAll(
                ".dash-tab-content"
            );

        tabs.forEach((tab) => {
            if (
                tab.dataset.aeriomTabBound ===
                "true"
            ) {
                return;
            }

            tab.dataset.aeriomTabBound =
                "true";

            tab.addEventListener(
                "click",
                async () => {
                    const targetId =
                        tab.getAttribute(
                            "data-tab"
                        );

                    if (!targetId) {
                        return;
                    }

                    tabs.forEach((item) => {
                        item.classList.remove(
                            "active"
                        );
                    });

                    contents.forEach(
                        (content) => {
                            content.classList.remove(
                                "active"
                            );
                        }
                    );

                    document
                        .querySelectorAll(
                            `[data-tab="${CSS.escape(targetId)}"]`
                        )
                        .forEach((button) => {
                            button.classList.add(
                                "active"
                            );
                        });

                    const target =
                        getElement(
                            targetId
                        );

                    if (target) {
                        target.classList.add(
                            "active"
                        );
                    }

                    try {
                        switch (targetId) {
                            case "tab-overview":
                                await loadCampaignCharacters();
                                break;

                            case "tab-combate":
                                await loadCombatState();
                                break;

                            case "tab-mural":
                                if (
                                    typeof window.loadMural ===
                                    "function"
                                ) {
                                    await window.loadMural();
                                }
                                break;

                            case "tab-logs":
                                if (
                                    typeof window.loadTimeline ===
                                    "function"
                                ) {
                                    await window.loadTimeline();
                                }
                                break;

                            default:
                                break;
                        }
                    } catch (error) {
                        console.error(
                            "[AERIOM] Erro ao carregar aba:",
                            error
                        );
                    }
                }
            );
        });
    }

    /* =====================================================
       15. MODAL DE TEMA
    ===================================================== */

    function setupThemeModal() {
        const themeModal =
            getElement(
                "themeConfigModal"
            );

        const themeSelect =
            getElement(
                "themeSelectDropdown"
            );

        const customUrlInput =
            getElement(
                "customThemeBgUrl"
            );

        const openButtons = [
            getElement(
                "openThemeConfigModalBtn"
            ),
            getElement(
                "openThemeModalBtn"
            ),
            getElement(
                "openMasterThemeMobile"
            )
        ].filter(Boolean);

        const closeButton =
            getElement(
                "closeThemeModalBtn"
            );

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                () => {
                    themeModal?.classList.remove(
                        "active"
                    );
                }
            );
        }

        function openModal() {
            if (
                !themeModal ||
                !themeSelect ||
                !currentCampaign ||
                !window.AeriomThemeManager
            ) {
                return;
            }

            themeSelect.innerHTML = "";

            let options = [];

            try {
                options =
                    window.AeriomThemeManager
                        .getThemeOptions?.() || [];
            } catch (error) {
                console.error(
                    "[AERIOM] Não foi possível obter temas:",
                    error
                );
            }

            if (!Array.isArray(options)) {
                options = [];
            }

            options.forEach((option) => {
                if (!option?.id) {
                    return;
                }

                const element =
                    document.createElement(
                        "option"
                    );

                element.value =
                    option.id;

                element.textContent =
                    safeText(
                        option.name,
                        option.id
                    );

                themeSelect.appendChild(
                    element
                );
            });

            const parsed =
                parseCampaignTheme(
                    currentCampaign.description
                );

            themeSelect.value =
                parsed.themeId;

            if (customUrlInput) {
                customUrlInput.value =
                    currentCampaign.cover_url ||
                    "";
            }

            themeModal.classList.add(
                "active"
            );
        }

        openButtons.forEach(
            (button) => {
                if (
                    button.dataset.aeriomThemeBound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.aeriomThemeBound =
                    "true";

                button.addEventListener(
                    "click",
                    openModal
                );
            }
        );

        const form =
            getElement(
                "themeConfigForm"
            );

        if (
            form &&
            form.dataset.aeriomThemeFormBound !==
                "true"
        ) {
            form.dataset.aeriomThemeFormBound =
                "true";

            form.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();

                    if (
                        !currentCampaign ||
                        userRole !== "master"
                    ) {
                        return;
                    }

                    const selectedTheme =
                        themeSelect?.value ||
                        "default";

                    const customUrl =
                        safeText(
                            customUrlInput?.value,
                            ""
                        ).trim();

                    const parsed =
                        parseCampaignTheme(
                            currentCampaign.description
                        );

                    const cleanDescription =
                        parsed.cleanDesc ||
                        "";

                    const newDescription =
                        cleanDescription
                            ? `${cleanDescription}\n\n=== TEMA ===\nID: ${selectedTheme}`
                            : `=== TEMA ===\nID: ${selectedTheme}`;

                    const button =
                        form.querySelector(
                            'button[type="submit"]'
                        );

                    const originalText =
                        button?.textContent ||
                        "Salvar";

                    if (button) {
                        button.disabled =
                            true;

                        button.textContent =
                            "A Sincronizar Atmosfera...";
                    }

                    try {
                        const {
                            error
                        } =
                            await supabase
                                .from("campaigns")
                                .update({
                                    description:
                                        newDescription,

                                    cover_url:
                                        customUrl ||
                                        null
                                })
                                .eq(
                                    "id",
                                    campaignId
                                );

                        if (error) {
                            throw error;
                        }

                        currentCampaign = {
                            ...currentCampaign,
                            description:
                                newDescription,
                            cover_url:
                                customUrl ||
                                null
                        };

                        updateCampaignVisuals();

                        themeModal?.classList.remove(
                            "active"
                        );

                        if (
                            typeof window.generateLog ===
                            "function"
                        ) {
                            await window.generateLog(
                                "A atmosfera do ambiente mudou sutilmente...",
                                "system"
                            );
                        }
                    } catch (error) {
                        console.error(
                            "[AERIOM] Erro ao salvar tema:",
                            error
                        );

                        alert(
                            "Não foi possível alterar a atmosfera da campanha."
                        );
                    } finally {
                        if (button) {
                            button.disabled =
                                false;

                            button.textContent =
                                originalText;
                        }
                    }
                }
            );
        }
    }

    /* =====================================================
       16. PERSONAGENS DA CAMPANHA
    ===================================================== */

    async function loadCampaignCharacters() {
        const list =
            getElement(
                "campaignCharactersList"
            );

        if (!list) {
            return;
        }

        const {
            data,
            error
        } =
            await supabase
                .from("campaign_characters")
                .select(`
                    id,
                    user_id,
                    character_id,
                    current_hp,
                    current_mana,
                    conditions,
                    characters(
                        id,
                        name,
                        race,
                        class,
                        avatar_url
                    )
                `)
                .eq(
                    "campaign_id",
                    campaignId
                );

        if (error) {
            console.error(
                "[AERIOM] Erro ao carregar personagens:",
                error
            );

            throw error;
        }

        list.innerHTML = "";

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {
            const empty =
                createSafeElement(
                    "p",
                    "text-muted w-full text-center",
                    "Nenhum aventureiro respondeu ao chamamento da mesa ainda."
                );

            empty.style.gridColumn =
                "1 / -1";

            empty.style.padding =
                "var(--space-24)";

            list.appendChild(
                empty
            );

            return;
        }

        data.forEach((link) => {
            const char =
                link?.characters;

            if (!char) {
                return;
            }

            const isOwnCharacter =
                link.user_id ===
                currentUser?.id;

            const card =
                createSafeElement(
                    "div",
                    `campaign-char-card ${
                        isOwnCharacter
                            ? "own-character"
                            : ""
                    }`
                );

            /* AVATAR */

            const avatarContainer =
                createSafeElement(
                    "div",
                    "char-avatar-container"
                );

            const charName =
                safeText(
                    char.name,
                    "Aventureiro"
                );

            const initial =
                charName
                    .charAt(0)
                    .toUpperCase() ||
                "?";

            if (char.avatar_url) {
                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    char.avatar_url;

                img.className =
                    "char-card-avatar";

                img.alt =
                    charName;

                img.loading =
                    "lazy";

                img.addEventListener(
                    "error",
                    () => {
                        avatarContainer.innerHTML =
                            "";

                        avatarContainer.appendChild(
                            createSafeElement(
                                "div",
                                "char-card-fallback",
                                initial
                            )
                        );
                    },
                    {
                        once: true
                    }
                );

                avatarContainer.appendChild(
                    img
                );
            } else {
                avatarContainer.appendChild(
                    createSafeElement(
                        "div",
                        "char-card-fallback",
                        initial
                    )
                );
            }

            /* INFORMAÇÕES */

            const infoDiv =
                createSafeElement(
                    "div",
                    "char-card-info"
                );

            infoDiv.appendChild(
                createSafeElement(
                    "h4",
                    "",
                    charName
                )
            );

            infoDiv.appendChild(
                createSafeElement(
                    "span",
                    "subtitle",
                    `${safeText(char.race, "?")} • ${safeText(char.class, "?")}`
                )
            );

            const stats =
                createSafeElement(
                    "div",
                    "char-stats-mini"
                );

            stats.appendChild(
                createSafeElement(
                    "span",
                    "pv",
                    `PV: ${safeNumber(link.current_hp, 0)}`
                )
            );

            stats.appendChild(
                createSafeElement(
                    "span",
                    "mp",
                    `MP: ${safeNumber(link.current_mana, 0)}`
                )
            );

            infoDiv.appendChild(
                stats
            );

            const conditions =
                safeText(
                    link.conditions,
                    ""
                ).trim();

            if (conditions) {
                const conditionBadge =
                    createSafeElement(
                        "div",
                        "char-state-badge",
                        "Condições"
                    );

                conditionBadge.title =
                    conditions;

                infoDiv.appendChild(
                    conditionBadge
                );
            }

            /* AÇÕES */

            const actionDiv =
                createSafeElement(
                    "div"
                );

            if (
                userRole ===
                "master"
            ) {
                const button =
                    createSafeElement(
                        "button",
                        "btn btn-secondary btn-sm",
                        "Gerir"
                    );

                button.type =
                    "button";

                button.addEventListener(
                    "click",
                    () => {
                        openCharacterStateModal(
                            link
                        );
                    }
                );

                actionDiv.appendChild(
                    button
                );
            } else if (
                isOwnCharacter
            ) {
                const button =
                    createSafeElement(
                        "button",
                        "btn btn-primary btn-sm",
                        "Ficha"
                    );

                button.type =
                    "button";

                button.addEventListener(
                    "click",
                    () => {
                        openPlayerSheet(
                            link.character_id,
                            link.id,
                            link.current_hp,
                            link.current_mana,
                            link.conditions
                        );
                    }
                );

                actionDiv.appendChild(
                    button
                );
            }

            card.appendChild(
                avatarContainer
            );

            card.appendChild(
                infoDiv
            );

            card.appendChild(
                actionDiv
            );

            list.appendChild(
                card
            );
        });
    }

    /* =====================================================
       17. ABRIR FICHA RÁPIDA
    ===================================================== */

    async function openPlayerSheet(
        characterId,
        linkId,
        currentHp,
        currentMana,
        conditions
    ) {
        if (!characterId) {
            return;
        }

        playerSheetLinkId =
            linkId || null;

        const {
            data: char,
            error
        } =
            await supabase
                .from("characters")
                .select("*")
                .eq(
                    "id",
                    characterId
                )
                .single();

        if (error) {
            console.error(
                "[AERIOM] Erro ao carregar ficha:",
                error
            );

            return;
        }

        if (!char) {
            return;
        }

        playerSheetCharacter =
            char;

        playerSheetCharName =
            safeText(
                char.name,
                "Aventureiro"
            );

        setText(
            "psName",
            playerSheetCharName
        );

        setText(
            "psSubinfo",
            `${safeText(char.race, "?")} • ${safeText(char.class, "?")}`
        );

        setText(
            "psHpView",
            safeNumber(
                currentHp,
                0
            )
        );

        setText(
            "psManaView",
            safeNumber(
                currentMana,
                0
            )
        );

        setText(
            "psConditionsView",
            safeText(
                conditions,
                ""
            ).trim() ||
                "Nenhuma"
        );

        setValue(
            "psHp",
            safeNumber(
                currentHp,
                0
            )
        );

        setValue(
            "psMana",
            safeNumber(
                currentMana,
                0
            )
        );

        setValue(
            "psConditions",
            safeText(
                conditions,
                ""
            )
        );

        renderPlayerAttributes(
            char
        );

        setText(
            "psInventory",
            safeText(
                char.inventory,
                "Vazio"
            ) || "Vazio"
        );

        setText(
            "psSkills",
            safeText(
                char.skills,
                "Nenhum registo."
            ) || "Nenhum registo."
        );

        const form =
            getElement(
                "psStateForm"
            );

        if (form) {
            form.style.display =
                "none";
        }

        const modal =
            getElement(
                "playerSheetModal"
            );

        if (modal) {
            modal.classList.add(
                "active"
            );
        }
    }

    /* =====================================================
       18. ATRIBUTOS DO JOGADOR
    ===================================================== */

    function getAttributeValue(
        attributes,
        keys
    ) {
        for (const key of keys) {
            if (
                Object.prototype.hasOwnProperty.call(
                    attributes,
                    key
                )
            ) {
                return safeNumber(
                    attributes[key],
                    0
                );
            }
        }

        return 0;
    }

    function renderPlayerAttributes(
        char
    ) {
        const attrGrid =
            getElement(
                "psAttributesGrid"
            );

        if (!attrGrid) {
            return;
        }

        attrGrid.innerHTML =
            "";

        const standardAttributes = [
            {
                key: "forca",
                label: "Força",
                aliases: [
                    "forca",
                    "Força",
                    "FORÇA",
                    "strength"
                ]
            },
            {
                key: "agilidade",
                label: "Agilidade",
                aliases: [
                    "agilidade",
                    "Agilidade",
                    "AGILIDADE",
                    "dexterity"
                ]
            },
            {
                key: "vigor",
                label: "Vigor",
                aliases: [
                    "vigor",
                    "Vigor",
                    "VIGOR",
                    "constitution"
                ]
            },
            {
                key: "intelecto",
                label: "Intelecto",
                aliases: [
                    "intelecto",
                    "Intelecto",
                    "INTELECTO",
                    "intelligence"
                ]
            },
            {
                key: "percepcao",
                label: "Percepção",
                aliases: [
                    "percepcao",
                    "Percepção",
                    "percepção",
                    "PERCEPÇÃO",
                    "wisdom"
                ]
            },
            {
                key: "presenca",
                label: "Presença",
                aliases: [
                    "presenca",
                    "Presença",
                    "presença",
                    "PRESENÇA",
                    "charisma"
                ]
            },
            {
                key: "precisao",
                label: "Precisão",
                aliases: [
                    "precisao",
                    "Precisão",
                    "precisão",
                    "PRECISÃO"
                ]
            },
            {
                key: "controle",
                label: "Controle",
                aliases: [
                    "controle",
                    "Controle",
                    "CONTROLE"
                ]
            }
        ];

        let attrsData =
            normalizeObject(
                char.attributes
            );

        /*
         * Alguns bancos podem guardar atributos
         * diretamente nas colunas do personagem.
         */
        if (
            Object.keys(
                attrsData
            ).length === 0
        ) {
            attrsData =
                char;
        }

        standardAttributes.forEach(
            (attribute) => {
                const value =
                    getAttributeValue(
                        attrsData,
                        attribute.aliases
                    );

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "ps-roll-btn";

                const labelSpan =
                    createSafeElement(
                        "span",
                        "attr-label",
                        attribute.label
                    );

                const valueSpan =
                    createSafeElement(
                        "span",
                        "attr-val",
                        value
                    );

                button.appendChild(
                    labelSpan
                );

                button.appendChild(
                    valueSpan
                );

                button.addEventListener(
                    "click",
                    async () => {
                        await executeAttributeRoll(
                            attribute,
                            value,
                            char
                        );
                    }
                );

                attrGrid.appendChild(
                    button
                );
            }
        );
    }

    /* =====================================================
       19. ROLAGEM DE ATRIBUTO
    ===================================================== */

    async function executeAttributeRoll(
        attribute,
        modifier,
        character
    ) {
        const modal =
            getElement(
                "playerSheetModal"
            );

        modal?.classList.remove(
            "active"
        );

        if (
            !window.AeriomDice ||
            typeof window.AeriomDice.roll !==
                "function"
        ) {
            console.error(
                "[AERIOM] Motor de dados não encontrado."
            );

            return;
        }

        try {
            const result =
                await window.AeriomDice.roll({
                    quantity: 1,
                    sides: 20,
                    modifier,
                    label:
                        `Teste de ${attribute.label}`
                });

            if (
                typeof window.generateLog ===
                "function"
            ) {
                const signal =
                    modifier >= 0
                        ? "+"
                        : "";

                await window.generateLog(
                    `${safeText(character.name, "Aventureiro")} rolou ${attribute.label}: 1d20 (${result.rolls[0]}) ${signal}${modifier} = **${result.total}**`,
                    "roll"
                );
            }
        } catch (error) {
            console.error(
                "[AERIOM] Erro na rolagem:",
                error
            );
        }
    }

    /* =====================================================
       20. EVENTOS DA FICHA RÁPIDA
    ===================================================== */

    function setupPlayerSheetEvents() {
        const toggle =
            getElement(
                "psToggleEditStateBtn"
            );

        if (toggle) {
            toggle.addEventListener(
                "click",
                () => {
                    const form =
                        getElement(
                            "psStateForm"
                        );

                    if (!form) {
                        return;
                    }

                    const hidden =
                        form.style.display ===
                        "none";

                    form.style.display =
                        hidden
                            ? "block"
                            : "none";
                }
            );
        }

        const close =
            getElement(
                "closePlayerSheetModal"
            );

        if (close) {
            close.addEventListener(
                "click",
                () => {
                    getElement(
                        "playerSheetModal"
                    )?.classList.remove(
                        "active"
                    );
                }
            );
        }
    }

    /* =====================================================
       21. ESTADO DO PERSONAGEM — JOGADOR
    ===================================================== */

    function setupCharacterStateEvents() {
        const form =
            getElement(
                "psStateForm"
            );

        if (form) {
            form.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();

                    await savePlayerVitalState();
                }
            );
        }

        const close =
            getElement(
                "closeCharacterStateModal"
            );

        if (close) {
            close.addEventListener(
                "click",
                () => {
                    getElement(
                        "characterStateModal"
                    )?.classList.remove(
                        "active"
                    );
                }
            );
        }

        const closeSecret =
            getElement(
                "closeCreateSecretModal"
            );

        if (closeSecret) {
            closeSecret.addEventListener(
                "click",
                () => {
                    getElement(
                        "createSecretModal"
                    )?.classList.remove(
                        "active"
                    );
                }
            );
        }

        const masterForm =
            getElement(
                "characterStateForm"
            );

        if (masterForm) {
            masterForm.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();

                    await saveMasterCharacterState();
                }
            );
        }
    }

    /* =====================================================
       22. SALVAR ESTADO DO JOGADOR
    ===================================================== */

    async function savePlayerVitalState() {
        if (!playerSheetLinkId) {
            return;
        }

        const hpView =
            getElement(
                "psHpView"
            );

        const manaView =
            getElement(
                "psManaView"
            );

        const hp =
            Math.max(
                0,
                safeNumber(
                    getValue(
                        "psHp",
                        0
                    ),
                    0
                )
            );

        const mana =
            Math.max(
                0,
                safeNumber(
                    getValue(
                        "psMana",
                        0
                    ),
                    0
                )
            );

        const oldHp =
            safeNumber(
                hpView?.textContent,
                0
            );

        const oldMana =
            safeNumber(
                manaView?.textContent,
                0
            );

        const conditions =
            safeText(
                getValue(
                    "psConditions",
                    ""
                ),
                ""
            ).trim();

        const hpDiff =
            hp - oldHp;

        const manaDiff =
            mana - oldMana;

        spawnFloatingNumber(
            hpDiff,
            true,
            "psHpView"
        );

        setTimeout(
            () => {
                spawnFloatingNumber(
                    manaDiff,
                    false,
                    "psManaView"
                );
            },
            150
        );

        setText(
            "psHpView",
            hp
        );

        setText(
            "psManaView",
            mana
        );

        setText(
            "psConditionsView",
            conditions ||
                "Nenhuma"
        );

        const form =
            getElement(
                "psStateForm"
            );

        if (form) {
            form.style.display =
                "none";
        }

        try {
            const {
                error
            } =
                await supabase
                    .from("campaign_characters")
                    .update({
                        current_hp:
                            hp,
                        current_mana:
                            mana,
                        conditions:
                            conditions
                    })
                    .eq(
                        "id",
                        playerSheetLinkId
                    );

            if (error) {
                throw error;
            }

            if (
                typeof window.generateLog ===
                "function" &&
                (
                    hpDiff !== 0 ||
                    manaDiff !== 0
                )
            ) {
                await window.generateLog(
                    `${playerSheetCharName} alterou o seu estado vital (PV: ${hp}, Mana: ${mana}).`,
                    "system"
                );
            }

            await loadCampaignCharacters();

        } catch (error) {
            console.error(
                "[AERIOM] Erro ao salvar estado:",
                error
            );

            alert(
                "Não foi possível salvar o estado do personagem."
            );
        }
    }

    /* =====================================================
       23. NÚMERO FLUTUANTE
    ===================================================== */

    function spawnFloatingNumber(
        diff,
        isHp,
        anchorId
    ) {
        if (!diff) {
            return;
        }

        const anchor =
            getElement(
                anchorId
            );

        if (!anchor) {
            return;
        }

        const rect =
            anchor.getBoundingClientRect();

        const element =
            document.createElement(
                "div"
            );

        let className;

        if (isHp) {
            className =
                diff > 0
                    ? "float-heal"
                    : "float-damage";
        } else {
            className =
                "float-mana-loss";
        }

        element.className =
            `floating-number ${className}`;

        const randomX =
            Math.random() * 30 - 15;

        element.style.left =
            `${rect.left + 20 + randomX}px`;

        element.style.top =
            `${rect.top - 20}px`;

        element.textContent =
            diff > 0
                ? `+${diff}`
                : String(diff);

        if (!isHp) {
            element.textContent +=
                " MP";
        }

        document.body.appendChild(
            element
        );

        window.setTimeout(
            () => {
                element.remove();
            },
            1200
        );
    }

    /* =====================================================
       24. MODAL DE GERENCIAMENTO DO MESTRE
    ===================================================== */

    function openCharacterStateModal(
        link
    ) {
        if (
            !link ||
            userRole !== "master"
        ) {
            return;
        }

        activeStateLinkId =
            link.id;

        setValue(
            "stateHp",
            safeNumber(
                link.current_hp,
                0
            )
        );

        setValue(
            "stateMana",
            safeNumber(
                link.current_mana,
                0
            )
        );

        setValue(
            "stateConditions",
            safeText(
                link.conditions,
                ""
            )
        );

        const modal =
            getElement(
                "characterStateModal"
            );

        modal?.classList.add(
            "active"
        );
    }

    /* =====================================================
       25. SALVAR ESTADO PELO MESTRE
    ===================================================== */

    async function saveMasterCharacterState() {
        if (