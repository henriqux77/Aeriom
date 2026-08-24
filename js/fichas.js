/* =========================================================
   AERIOM — GERENCIADOR DE FICHAS (js/fichas.js)
   Fase 2: Remoção de Estilos Inline, Anti-XSS e Refatoração
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ Supabase não inicializado.");
        return;
    }

    let currentUser = null;

    // 1. Elementos de Estado da Interface
    const loadingCharacters = document.getElementById("loadingCharacters");
    const emptyCharacters = document.getElementById("emptyCharacters");
    const charactersList = document.getElementById("charactersList");
    const charactersMessage = document.getElementById("charactersMessage");

    // 2. Elementos de Ação
    const createCharacterBtn = document.getElementById("createCharacterBtn");
    const createFirstCharacterBtn = document.getElementById("createFirstCharacterBtn");

    // =========================================================
    // UTILITÁRIOS E FEEDBACK
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!charactersMessage) return;
        charactersMessage.textContent = msg;
        charactersMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
        setTimeout(() => { charactersMessage.classList.remove('active'); }, 4000);
    }

    function showState(state) {
        if (loadingCharacters) loadingCharacters.style.display = "none";
        if (emptyCharacters) emptyCharacters.style.display = "none";
        if (charactersList) charactersList.style.display = "none";

        if (state === 'loading' && loadingCharacters) loadingCharacters.style.display = "block";
        if (state === 'empty' && emptyCharacters) emptyCharacters.style.display = "block";
        if (state === 'list' && charactersList) charactersList.style.display = "grid"; 
    }

    function createSafeElement(tag, className, textContent = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== null) el.textContent = textContent;
        return el;
    }

    // =========================================================
    // CARREGAMENTO DE FICHAS
    // =========================================================
    async function loadCharacters() {
        showState('loading');
        
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (authError || !session) {
                window.location.href = "index.html";
                return;
            }
            
            currentUser = session.user;

            const { data: characters, error: dbError } = await supabase
                .from('characters')
                .select('id, name, race, class, level, avatar_url, hp_max, mana_max')
                .eq('user_id', currentUser.id)
                .order('name', { ascending: true }); // Ordenar pelo nome é seguro e sempre existe.

            if (dbError) throw dbError;

            if (!characters || characters.length === 0) {
                showState('empty');
                return;
            }

            renderCharacters(characters);
            showState('list');

        } catch (error) {
            console.error("Erro ao consultar fichas:", error);
            showState('empty'); 
            showMessage("Erro de comunicação com os servidores. Tente novamente.", true);
        }
    }

    // =========================================================
    // RENDERIZAÇÃO BLINDADA (ANTI-XSS) E DESIGN SYSTEM
    // =========================================================
    function renderCharacters(characters) {
        if (!charactersList) return;
        charactersList.innerHTML = '';

        characters.forEach(char => {
            // Container Base Interativo
            const card = document.createElement("div");
            card.className = "aeriom-card-interactive";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.gap = "var(--space-md)";
            card.style.padding = "var(--space-md)";

            // Avatar Container
            const avatarContainer = document.createElement("div");
            avatarContainer.style.width = "72px";
            avatarContainer.style.height = "72px";
            avatarContainer.style.borderRadius = "50%";
            avatarContainer.style.border = "2px solid var(--color-border-strong)";
            avatarContainer.style.backgroundColor = "var(--color-bg-secondary)";
            avatarContainer.style.flexShrink = "0";
            avatarContainer.style.display = "grid";
            avatarContainer.style.placeItems = "center";
            avatarContainer.style.overflow = "hidden";

            if (char.avatar_url && char.avatar_url.trim() !== '') {
                const img = document.createElement("img");
                img.src = char.avatar_url;
                img.alt = "Avatar";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                // Tratamento de erro nativo caso a URL seja inválida/quebrada
                img.onerror = () => {
                    avatarContainer.innerHTML = '';
                    const fallback = createSafeElement("span", "", char.name ? char.name.charAt(0).toUpperCase() : "?");
                    fallback.style.fontFamily = "var(--font-heading)";
                    fallback.style.fontSize = "1.8rem";
                    fallback.style.color = "var(--color-primary)";
                    avatarContainer.appendChild(fallback);
                };
                avatarContainer.appendChild(img);
            } else {
                const initial = createSafeElement("span", "", char.name ? char.name.charAt(0).toUpperCase() : "?");
                initial.style.fontFamily = "var(--font-heading)";
                initial.style.fontSize = "1.8rem";
                initial.style.color = "var(--color-primary)";
                avatarContainer.appendChild(initial);
            }

            // Info Container
            const infoContainer = document.createElement("div");
            infoContainer.style.flex = "1";
            infoContainer.style.minWidth = "0"; // Previne overflow

            const name = createSafeElement("h3", "", char.name || "Herói Sem Nome");
            name.style.margin = "0 0 4px 0";
            name.style.color = "var(--color-text)";
            name.style.whiteSpace = "nowrap";
            name.style.overflow = "hidden";
            name.style.textOverflow = "ellipsis";
            name.style.fontFamily = "var(--font-heading)";
            name.style.fontSize = "1.2rem";

            const details = createSafeElement("p", "text-muted", `${char.race || "Sem Raça"} • ${char.class || "Sem Classe"} (Nv.${char.level || 1})`);
            details.style.margin = "0 0 8px 0";
            details.style.fontSize = "0.85rem";

            // Status Rápidos (PV e PM)
            const statsDiv = document.createElement("div");
            statsDiv.style.display = "flex";
            statsDiv.style.gap = "var(--space-md)";
            statsDiv.style.fontSize = "0.75rem";
            statsDiv.style.fontWeight = "600";
            
            const hpStat = document.createElement("span");
            hpStat.style.color = "var(--color-danger)";
            hpStat.textContent = `♥ PV: ${char.hp_max || 0}`;
            
            const mpStat = document.createElement("span");
            mpStat.style.color = "var(--color-mana)";
            mpStat.textContent = `✧ PM: ${char.mana_max || 0}`;

            statsDiv.appendChild(hpStat);
            statsDiv.appendChild(mpStat);

            infoContainer.appendChild(name);
            infoContainer.appendChild(details);
            infoContainer.appendChild(statsDiv);

            // Montagem
            card.appendChild(avatarContainer);
            card.appendChild(infoContainer);

            // Evento de Clique Seguro (em vez de onclick="" no HTML)
            card.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha-view.html";
            });

            charactersList.appendChild(card);
        });
    }

    // =========================================================
    // NAVEGAÇÃO DE CRIAÇÃO
    // =========================================================
    const goToCreator = () => {
        // Limpa qualquer ID residual para forçar o modo "Criação de Ficha Nova"
        localStorage.removeItem("aeriom_character_id");
        window.location.href = "ficha.html";
    };

    createCharacterBtn?.addEventListener("click", goToCreator);
    createFirstCharacterBtn?.addEventListener("click", goToCreator);

    // Gatilho Inicial
    loadCharacters();
});
