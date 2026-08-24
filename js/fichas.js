/* =========================================================
   AERIOM — GERENCIADOR DE FICHAS (js/fichas.js)
   Fase 2: Diagnóstico, Limpeza de ID e SELECT Blindado (*)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("[AERIOM] ❌ Supabase não inicializado.");
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
    // DIAGNÓSTICO E LOGS SUPABASE
    // =========================================================
    function logSupabaseError(arquivo, funcao, tabela, operacao, error) {
        console.error(`
[AERIOM][SUPABASE]
Arquivo: ${arquivo}
Função: ${funcao}
Tabela: ${tabela}
Operação: ${operacao}
Código: ${error.code || 'N/A'}
Mensagem: ${error.message || 'N/A'}
Detalhes: ${error.details || 'N/A'}
Hint: ${error.hint || 'N/A'}
        `);
    }

    // =========================================================
    // UTILITÁRIOS E FEEDBACK
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!charactersMessage) return;
        charactersMessage.textContent = msg;
        charactersMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
        setTimeout(() => { charactersMessage.classList.remove('active'); }, 6000); 
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

            // BLINDAGEM: Usamos select('*') para que o Supabase envie apenas as colunas que 
            // realmente existem na tabela, impedindo o Erro 42703 (Bad Request) caso o Schema mude.
            const { data: characters, error: dbError } = await supabase
                .from('characters')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('name', { ascending: true }); 

            if (dbError) {
                logSupabaseError('js/fichas.js', 'loadCharacters', 'characters', 'SELECT', dbError);
                throw dbError;
            }

            if (!characters || characters.length === 0) {
                showState('empty');
                return;
            }

            renderCharacters(characters);
            showState('list');

        } catch (error) {
            showState('empty'); 
            showMessage(`Falha ao carregar fichas: ${error.message || 'Erro de comunicação'}. Verifique o console.`, true);
        }
    }

    // =========================================================
    // RENDERIZAÇÃO BLINDADA (ANTI-XSS) E DESIGN SYSTEM
    // =========================================================
    function renderCharacters(characters) {
        if (!charactersList) return;
        charactersList.innerHTML = '';

        characters.forEach(char => {
            const card = document.createElement("div");
            card.className = "aeriom-card-interactive";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.gap = "var(--space-md)";
            card.style.padding = "var(--space-md)";

            // Avatar Container
            const avatarContainer = document.createElement("div");
            avatarContainer.className = "char-avatar-container";
            avatarContainer.style.width = "72px";
            avatarContainer.style.height = "72px";
            avatarContainer.style.borderRadius = "50%";
            avatarContainer.style.border = "2px solid var(--color-border-strong)";
            avatarContainer.style.backgroundColor = "var(--color-bg-secondary)";
            avatarContainer.style.flexShrink = "0";
            avatarContainer.style.display = "grid";
            avatarContainer.style.placeItems = "center";
            avatarContainer.style.overflow = "hidden";

            const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';

            if (char.avatar_url && char.avatar_url.trim() !== '') {
                const img = document.createElement("img");
                img.src = char.avatar_url;
                img.alt = "Avatar";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                
                img.onerror = () => {
                    avatarContainer.innerHTML = '';
                    const fallback = createSafeElement("span", "", initial);
                    fallback.style.fontFamily = "var(--font-heading)";
                    fallback.style.fontSize = "1.8rem";
                    fallback.style.color = "var(--color-primary)";
                    avatarContainer.appendChild(fallback);
                };
                avatarContainer.appendChild(img);
            } else {
                const fallback = createSafeElement("span", "", initial);
                fallback.style.fontFamily = "var(--font-heading)";
                fallback.style.fontSize = "1.8rem";
                fallback.style.color = "var(--color-primary)";
                avatarContainer.appendChild(fallback);
            }

            // Info Container
            const infoContainer = document.createElement("div");
            infoContainer.style.flex = "1";
            infoContainer.style.minWidth = "0"; 

            const name = createSafeElement("h3", "", char.name || "Herói Sem Nome");
            name.style.margin = "0 0 4px 0";
            name.style.color = "var(--color-text)";
            name.style.whiteSpace = "nowrap";
            name.style.overflow = "hidden";
            name.style.textOverflow = "ellipsis";
            name.style.fontFamily = "var(--font-heading)";
            name.style.fontSize = "1.2rem";

            // Se 'level' for null (porque a coluna ainda não existia e recebeu o alter table), mostramos "1"
            const details = createSafeElement("p", "text-muted", `${char.race || "Sem Raça"} • ${char.class || "Sem Classe"} (Nv.${char.level || 1})`);
            details.style.margin = "0 0 8px 0";
            details.style.fontSize = "0.85rem";

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

            card.appendChild(avatarContainer);
            card.appendChild(infoContainer);

            // Evento de Clique Seguro: Abrir Ficha
            card.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha-view.html";
            });

            charactersList.appendChild(card);
        });
    }

    // =========================================================
    // NAVEGAÇÃO DE CRIAÇÃO (CREATE MODE)
    // =========================================================
    const goToCreator = () => {
        localStorage.removeItem("aeriom_character_id");
        window.location.href = "ficha.html";
    };

    createCharacterBtn?.addEventListener("click", goToCreator);
    createFirstCharacterBtn?.addEventListener("click", goToCreator);

    // Gatilho Inicial
    loadCharacters();
});
