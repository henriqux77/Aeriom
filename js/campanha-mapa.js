/* =========================================================
   AERIOM — MAPAS INTERATIVOS E PINS
   js/campanha-mapa.js

   Responsabilidades:
   - Abrir mapas interativos
   - Carregar pins da campanha
   - Realtime dos pins
   - Criar pins como Mestre
   - Revelar/ocultar pins
   - Excluir pins
   - Tooltips seguros contra XSS
   - Evitar canais realtime duplicados
========================================================= */

(function () {
    "use strict";

    // =========================================================
    // ESTADO
    // =========================================================

    let supabase = null;
    let campaignId = null;
    let userRole = null;

    let currentMapMuralId = null;
    let currentPins = [];

    let mapRealtimeChannel = null;
    let initialized = false;

    // =========================================================
    // UTILITÁRIOS
    // =========================================================

    function getElement(id) {
        return document.getElementById(id);
    }

    function safeText(value, fallback = "") {
        if (value === null || value === undefined) {
            return fallback;
        }

        return String(value);
    }

    function clampPercent(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.min(100, Math.max(0, number));
    }

    function isMaster() {
        return userRole === "master";
    }

    function logError(context, error) {
        console.error(`[AERIOM][MAPA] ${context}:`, error);
    }

    // =========================================================
    // 1. INICIALIZAÇÃO
    // =========================================================

    window.initMapSystem = function (
        _supabase,
        _campaignId,
        _userRole
    ) {
        supabase = _supabase;
        campaignId = _campaignId;
        userRole = _userRole;

        initialized = true;

        attachMapEvents();

        console.log(
            "[AERIOM][MAPA] Sistema inicializado.",
            {
                campaignId,
                userRole
            }
        );
    };

    // =========================================================
    // 2. ABRIR MAPA
    // =========================================================

    window.openInteractiveMap = async function (
        muralId,
        imageUrl,
        title
    ) {
        if (!initialized || !supabase) {
            console.error(
                "[AERIOM][MAPA] Sistema de mapas não inicializado."
            );
            return;
        }

        if (!muralId) {
            console.error(
                "[AERIOM][MAPA] muralId inválido."
            );
            return;
        }

        const modal = getElement("mapViewModal");
        const image = getElement("mapInteractiveImage");
        const titleElement = getElement("mapViewTitle");

        if (!modal || !image) {
            console.error(
                "[AERIOM][MAPA] Elementos do mapa não encontrados no HTML."
            );
            return;
        }

        currentMapMuralId = muralId;
        currentPins = [];

        if (titleElement) {
            titleElement.textContent =
                safeText(title, "Mapa da Região");
        }

        image.src = safeText(imageUrl);

        image.alt =
            safeText(title, "Mapa interativo");

        modal.classList.add("active");

        await loadPins();

        setupMapRealtime();
    };

    // =========================================================
    // 3. CARREGAR PINS
    // =========================================================

    async function loadPins() {
        if (!supabase || !currentMapMuralId) {
            return;
        }

        try {
            const {
                data,
                error
            } = await supabase
                .from("campaign_map_pins")
                .select("*")
                .eq("mural_id", currentMapMuralId)
                .order("created_at", {
                    ascending: true
                });

            if (error) {
                throw error;
            }

            currentPins = Array.isArray(data)
                ? data
                : [];

            renderPins();

        } catch (error) {
            logError(
                "Erro ao carregar pins.",
                error
            );

            currentPins = [];
            renderPins();
        }
    }

    // =========================================================
    // 4. REALTIME
    // =========================================================

    function removeMapRealtime() {
        if (!supabase || !mapRealtimeChannel) {
            mapRealtimeChannel = null;
            return;
        }

        try {
            supabase.removeChannel(
                mapRealtimeChannel
            );
        } catch (error) {
            logError(
                "Erro ao remover canal realtime.",
                error
            );
        }

        mapRealtimeChannel = null;
    }

    function setupMapRealtime() {
        if (!supabase || !currentMapMuralId) {
            return;
        }

        // Impede vários canais iguais quando o mapa
        // é aberto/fechado repetidamente.
        removeMapRealtime();

        const channelName =
            `map-pins-${currentMapMuralId}`;

        mapRealtimeChannel =
            supabase
                .channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "campaign_map_pins",
                        filter:
                            `mural_id=eq.${currentMapMuralId}`
                    },
                    async () => {
                        await loadPins();
                    }
                )
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") {
                        console.log(
                            "[AERIOM][MAPA] Realtime conectado."
                        );
                    }

                    if (status === "CHANNEL_ERROR") {
                        console.error(
                            "[AERIOM][MAPA] Erro no canal realtime."
                        );
                    }
                });
    }

    // =========================================================
    // 5. RENDERIZAÇÃO DOS PINS
    // =========================================================

    function renderPins() {
        const container =
            getElement("mapPinsContainer");

        if (!container) {
            return;
        }

        container.replaceChildren();

        currentPins.forEach((pin) => {
            const pinElement =
                createPinElement(pin);

            if (pinElement) {
                container.appendChild(
                    pinElement
                );
            }
        });
    }

    function createPinElement(pin) {
        const pinElement =
            document.createElement("div");

        pinElement.className =
            `map-pin ${
                pin.is_hidden
                    ? "pin-hidden"
                    : "pin-revealed"
            }`;

        const x =
            clampPercent(pin.pos_x);

        const y =
            clampPercent(pin.pos_y);

        pinElement.style.left =
            `${x}%`;

        pinElement.style.top =
            `${y}%`;

        // -----------------------------------------------------
        // MARCADOR
        // -----------------------------------------------------

        const marker =
            document.createElement("div");

        marker.className =
            "pin-marker";

        marker.textContent = "📍";

        pinElement.appendChild(marker);

        // -----------------------------------------------------
        // TOOLTIP
        // -----------------------------------------------------

        const tooltip =
            document.createElement("div");

        tooltip.className =
            "pin-tooltip";

        const title =
            document.createElement("strong");

        title.textContent =
            safeText(
                pin.title,
                "Local desconhecido"
            );

        title.style.color =
            "var(--theme-primary)";

        title.style.fontFamily =
            "var(--font-heading)";

        title.style.display =
            "block";

        title.style.marginBottom =
            "4px";

        title.style.fontSize =
            "1.1rem";

        tooltip.appendChild(title);

        // -----------------------------------------------------
        // DESCRIÇÃO
        // -----------------------------------------------------

        const description =
            document.createElement("span");

        description.textContent =
            safeText(
                pin.description,
                ""
            );

        description.style.color =
            "var(--text-primary)";

        description.style.fontSize =
            "0.85rem";

        description.style.display =
            "block";

        description.style.whiteSpace =
            "pre-wrap";

        description.style.lineHeight =
            "1.4";

        tooltip.appendChild(description);

        // -----------------------------------------------------
        // STATUS OCULTO
        // -----------------------------------------------------

        if (pin.is_hidden) {
            const hiddenLabel =
                document.createElement("span");

            hiddenLabel.textContent =
                "(Oculto)";

            hiddenLabel.style.color =
                "var(--danger)";

            hiddenLabel.style.fontSize =
                "0.7rem";

            hiddenLabel.style.display =
                "block";

            hiddenLabel.style.marginTop =
                "8px";

            hiddenLabel.style.textTransform =
                "uppercase";

            hiddenLabel.style.fontWeight =
                "600";

            tooltip.appendChild(
                hiddenLabel
            );
        }

        // -----------------------------------------------------
        // CONTROLES DO MESTRE
        // -----------------------------------------------------

        if (isMaster()) {
            const actions =
                createMasterActions(pin);

            tooltip.appendChild(actions);
        }

        pinElement.appendChild(
            tooltip
        );

        // -----------------------------------------------------
        // CLIQUE NO PIN
        // -----------------------------------------------------

        pinElement.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                document
                    .querySelectorAll(
                        ".pin-tooltip.active"
                    )
                    .forEach((otherTooltip) => {
                        if (
                            otherTooltip !== tooltip
                        ) {
                            otherTooltip.classList.remove(
                                "active"
                            );
                        }
                    });

                tooltip.classList.toggle(
                    "active"
                );
            }
        );

        return pinElement;
    }

    // =========================================================
    // 6. AÇÕES DO MESTRE
    // =========================================================

    function createMasterActions(pin) {
        const actions =
            document.createElement("div");

        actions.style.marginTop =
            "12px";

        actions.style.display =
            "flex";

        actions.style.flexDirection =
            "column";

        actions.style.gap =
            "6px";

        // -----------------------------------------------------
        // BOTÃO REVELAR / OCULTAR
        // -----------------------------------------------------

        const visibilityButton =
            document.createElement("button");

        visibilityButton.type =
            "button";

        visibilityButton.className =
            "btn btn-secondary w-full";

        visibilityButton.style.padding =
            "6px";

        visibilityButton.style.fontSize =
            "0.75rem";

        visibilityButton.textContent =
            pin.is_hidden
                ? "👁️ Revelar aos Jogadores"
                : "🔒 Ocultar do Grupo";

        visibilityButton.addEventListener(
            "click",
            async (event) => {
                event.stopPropagation();

                visibilityButton.disabled =
                    true;

                try {
                    await window.togglePinVisibility(
                        pin.id,
                        !pin.is_hidden
                    );
                } finally {
                    visibilityButton.disabled =
                        false;
                }
            }
        );

        actions.appendChild(
            visibilityButton
        );

        // -----------------------------------------------------
        // BOTÃO EXCLUIR
        // -----------------------------------------------------

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "btn btn-ghost w-full";

        deleteButton.style.padding =
            "6px";

        deleteButton.style.fontSize =
            "0.75rem";

        deleteButton.style.color =
            "var(--danger)";

        deleteButton.textContent =
            "Excluir Pin";

        deleteButton.addEventListener(
            "click",
            async (event) => {
                event.stopPropagation();

                await window.deletePin(
                    pin.id
                );
            }
        );

        actions.appendChild(
            deleteButton
        );

        return actions;
    }

    // =========================================================
    // 7. EVENTOS DA INTERFACE
    // =========================================================

    function attachMapEvents() {
        // Evita registrar os mesmos eventos duas vezes.
        if (
            document.body.dataset.aeriomMapEvents ===
            "attached"
        ) {
            return;
        }

        document.body.dataset.aeriomMapEvents =
            "attached";

        const modal =
            getElement("mapViewModal");

        const mapArea =
            getElement("mapInteractiveArea");

        const image =
            getElement("mapInteractiveImage");

        const createPinModal =
            getElement("createPinModal");

        // =====================================================
        // FECHAR MAPA
        // =====================================================

        getElement("closeMapViewBtn")
            ?.addEventListener(
                "click",
                () => {
                    closeInteractiveMap();
                }
            );

        // =====================================================
        // CLICAR FORA DOS TOOLTIPS
        // =====================================================

        mapArea?.addEventListener(
            "click",
            (event) => {
                document
                    .querySelectorAll(
                        ".pin-tooltip.active"
                    )
                    .forEach((tooltip) => {
                        tooltip.classList.remove(
                            "active"
                        );
                    });

                // Apenas o Mestre pode criar pins.
                if (!isMaster()) {
                    return;
                }

                // O clique precisa ser diretamente
                // na imagem do mapa.
                if (event.target !== image) {
                    return;
                }

                createPinFromClick(
                    event,
                    mapArea,
                    image
                );
            }
        );

        // =====================================================
        // FECHAR FORMULÁRIO DE PIN
        // =====================================================

        getElement("closeCreatePinBtn")
            ?.addEventListener(
                "click",
                () => {
                    createPinModal
                        ?.classList
                        .remove("active");
                }
            );

        // =====================================================
        // FORMULÁRIO DE PIN
        // =====================================================

        getElement("createPinForm")
            ?.addEventListener(
                "submit",
                handleCreatePinSubmit
            );

        // =====================================================
        // ESC
        // =====================================================

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                const mapModalOpen =
                    modal?.classList.contains(
                        "active"
                    );

                const pinModalOpen =
                    createPinModal?.classList.contains(
                        "active"
                    );

                if (pinModalOpen) {
                    createPinModal.classList.remove(
                        "active"
                    );
                    return;
                }

                if (mapModalOpen) {
                    closeInteractiveMap();
                }
            }
        );
    }

    // =========================================================
    // 8. CRIAÇÃO DE PIN PELO CLIQUE
    // =========================================================

    function createPinFromClick(
        event,
        mapArea,
        image
    ) {
        if (!mapArea || !image) {
            return;
        }

        const rect =
            image.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        let xPercent =
            (
                (event.clientX - rect.left) /
                rect.width
            ) * 100;

        let yPercent =
            (
                (event.clientY - rect.top) /
                rect.height
            ) * 100;

        xPercent =
            clampPercent(xPercent);

        yPercent =
            clampPercent(yPercent);

        openPinForm(
            xPercent,
            yPercent
        );
    }

    // =========================================================
    // 9. ABRIR FORMULÁRIO DE PIN
    // =========================================================

    function openPinForm(x, y) {
        if (!isMaster()) {
            return;
        }

        const modal =
            getElement("createPinModal");

        const xInput =
            getElement("pinPosX");

        const yInput =
            getElement("pinPosY");

        if (!modal) {
            return;
        }

        if (xInput) {
            xInput.value =
                clampPercent(x).toFixed(2);
        }

        if (yInput) {
            yInput.value =
                clampPercent(y).toFixed(2);
        }

        modal.classList.add(
            "active"
        );

        setTimeout(() => {
            getElement(
                "pinTitleInput"
            )?.focus();
        }, 50);
    }

    // =========================================================
    // 10. SUBMIT DO FORMULÁRIO
    // =========================================================

    async function handleCreatePinSubmit(event) {
        event.preventDefault();

        if (!isMaster()) {
            return;
        }

        if (
            !supabase ||
            !campaignId ||
            !currentMapMuralId
        ) {
            alert(
                "A sessão do mapa ainda não está pronta."
            );
            return;
        }

        const form =
            event.currentTarget;

        const button =
            getElement("savePinBtn");

        const titleInput =
            getElement("pinTitleInput");

        const descriptionInput =
            getElement("pinDescInput");

        const xInput =
            getElement("pinPosX");

        const yInput =
            getElement("pinPosY");

        const hiddenInput =
            getElement("pinHiddenInput");

        const title =
            titleInput
                ? titleInput.value.trim()
                : "";

        const description =
            descriptionInput
                ? descriptionInput.value.trim()
                : "";

        const x =
            Number(
                xInput?.value
            );

        const y =
            Number(
                yInput?.value
            );

        const isHidden =
            Boolean(
                hiddenInput?.checked
            );

        // -----------------------------------------------------
        // VALIDAÇÃO
        // -----------------------------------------------------

        if (!title) {
            alert(
                "Digite um nome para a marcação."
            );

            titleInput?.focus();

            return;
        }

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            alert(
                "A posição da marcação é inválida."
            );

            return;
        }

        const safeX =
            clampPercent(x);

        const safeY =
            clampPercent(y);

        if (button) {
            button.disabled = true;
            button.textContent =
                "Marcando...";
        }

        try {
            const {
                error
            } = await supabase
                .from("campaign_map_pins")
                .insert({
                    campaign_id:
                        campaignId,

                    mural_id:
                        currentMapMuralId,

                    title:
                        title,

                    description:
                        description,

                    pos_x:
                        safeX,

                    pos_y:
                        safeY,

                    is_hidden:
                        isHidden
                });

            if (error) {
                throw error;
            }

            // O realtime atualizará os pins.
            // Não precisamos inserir manualmente
            // um segundo card na interface.

            if (
                !isHidden &&
                typeof window.generateLog ===
                    "function"
            ) {
                window.generateLog(
                    `Um novo ponto foi marcado no mapa: "${title}".`,
                    "system"
                );
            }

            const modal =
                getElement(
                    "createPinModal"
                );

            modal?.classList.remove(
                "active"
            );

            form.reset();

        } catch (error) {
            logError(
                "Erro ao salvar pin.",
                error
            );

            alert(
                "Não foi possível salvar a marcação."
            );

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent =
                    "Salvar Marcação";
            }
        }
    }

    // =========================================================
    // 11. FECHAR MAPA
    // =========================================================

    function closeInteractiveMap() {
        const modal =
            getElement("mapViewModal");

        const createPinModal =
            getElement("createPinModal");

        modal?.classList.remove(
            "active"
        );

        createPinModal?.classList.remove(
            "active"
        );

        document
            .querySelectorAll(
                ".pin-tooltip.active"
            )
            .forEach((tooltip) => {
                tooltip.classList.remove(
                    "active"
                );
            });

        removeMapRealtime();

        currentMapMuralId = null;
        currentPins = [];
    }

    // =========================================================
    // 12. REVELAR / OCULTAR PIN
    // =========================================================

    window.togglePinVisibility =
        async function (
            pinId,
            newState
        ) {
            if (!isMaster()) {
                console.warn(
                    "[AERIOM][MAPA] Usuário sem permissão para alterar pins."
                );
                return;
            }

            if (
                !supabase ||
                !pinId
            ) {
                return;
            }

            const pin =
                currentPins.find(
                    (item) =>
                        item.id === pinId
                );

            try {
                const {
                    error
                } = await supabase
                    .from("campaign_map_pins")
                    .update({
                        is_hidden:
                            Boolean(
                                newState
                            )
                    })
                    .eq(
                        "id",
                        pinId
                    );

                if (error) {
                    throw error;
                }

                if (
                    !newState &&
                    pin &&
                    typeof window.generateLog ===
                        "function"
                ) {
                    window.generateLog(
                        `Um local secreto foi revelado no mapa: "${safeText(pin.title, "Local desconhecido")}".`,
                        "scene"
                    );
                }

            } catch (error) {
                logError(
                    "Erro ao alterar visibilidade do pin.",
                    error
                );

                alert(
                    "Não foi possível alterar a visibilidade."
                );
            }
        };

    // =========================================================
    // 13. EXCLUIR PIN
    // =========================================================

    window.deletePin =
        async function (
            pinId
        ) {
            if (!isMaster()) {
                console.warn(
                    "[AERIOM][MAPA] Usuário sem permissão para excluir pins."
                );
                return;
            }

            if (
                !supabase ||
                !pinId
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    "Remover esta marcação?"
                );

            if (!confirmed) {
                return;
            }

            try {
                const {
                    error
                } = await supabase
                    .from("campaign_map_pins")
                    .delete()
                    .eq(
                        "id",
                        pinId
                    );

                if (error) {
                    throw error;
                }

            } catch (error) {
                logError(
                    "Erro ao excluir pin.",
                    error
                );

                alert(
                    "Não foi possível excluir a marcação."
                );
            }
        };

})();