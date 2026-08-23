/* =========================================================
   AERIOM — GERENCIADOR DE FICHAS (js/fichas.js)
   Fase 4: Listagem Premium, Segura e Desacoplada
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ Supabase não inicializado.");
        return;
    }

    const charactersList = document.getElementById("charactersList");
    const charactersMessage = document.getElementById("charactersMessage");
    
    // Modal de Exclusão
    const deleteModal = document.getElementById("deleteConfirmModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    let characterToDelete = null;

    // =========================================================
    // 1. UTILITÁRIOS E FEEDBACK
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!charactersMessage) return;
        charactersMessage.textContent = msg;
        charactersMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'}`;
        charactersMessage.classList.add('active'); // Usando active em vez de display: flex
        
        setTimeout(() => { 
            charactersMessage.classList.remove('active'); 
        }, 4000);
    }

    function createSafeElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    // =========================================================
    // 2. BUSCA DE DADOS
    // =========================================================
    async function loadCharacters() {
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (authError || !session) {
                window.location.href = "index.html";
                return;
            }

            const { data: characters, error: dbError } = await supabase
                .from('characters')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;

            renderCharacters(characters);
        } catch (error) {
            console.error("Erro ao carregar fichas:", error);
            showMessage("Falha ao se conectar aos registros de Aeriom.", true);
            renderEmptyState(true);
        }
    }

    // =========================================================
    // 3. RENDERIZAÇÃO SEGURA (DOM Puro)
    // =========================================================
    function renderEmptyState(isError = false) {
        charactersList.innerHTML = "";
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state-panel';

        emptyState.innerHTML = `
            <div class="empty-state-icon">📜</div>
            <p class="empty-state-title">${isError ? 'Conexão Perdida' : 'Nenhum Herói Encontrado'}</p>
            <p class="empty-state-desc">${isError ? 'Tente atualizar a página.' : 'Os salões de Aeriom aguardam a sua primeira lenda.'}</p>
        `;

        if (!isError) {
            const createBtn = document.createElement('button');
            createBtn.className = 'btn btn-primary mt-4';
            createBtn.textContent = 'Forjar Novo Personagem';
            createBtn.addEventListener('click', () => {
                localStorage.removeItem("aeriom_character_id");
                window.location.href = 'ficha.html';
            });
            emptyState.appendChild(createBtn);
        }

        charactersList.appendChild(emptyState);
    }

    function renderCharacters(characters) {
        charactersList.innerHTML = "";

        if (!characters || characters.length === 0) {
            renderEmptyState();
            return;
        }

        characters.forEach(char => {
            const card = document.createElement("div");
            card.className = "character-card";

            // Header do Card (Avatar + Info)
            const cardHeader = document.createElement("div");
            cardHeader.className = "char-card-header";

            // Container do Avatar com Fallback Seguro
            const avatarContainer = document.createElement("div");
            avatarContainer.className = "char-avatar-container";
            
            const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';

            if (char.avatar_url && char.avatar_url.trim() !== '') {
                const img = document.createElement("img");
                img.src = char.avatar_url;
                img.className = "char-avatar-img";
                img.alt = `Avatar de ${char.name}`;
                // Fallback em caso de URL quebrada
                img.onerror = () => {
                    avatarContainer.innerHTML = `<div class="char-avatar-fallback">${initial}</div>`;
                };
                avatarContainer.appendChild(img);
            } else {
                avatarContainer.innerHTML = `<div class="char-avatar-fallback">${initial}</div>`;
            }

            // Info de Texto Segura contra XSS
            const infoContainer = document.createElement("div");
            infoContainer.className = "char-info";
            
            infoContainer.appendChild(createSafeElement("h3", "char-name", char.name || "Sem Nome"));
            
            const subtitle = `${char.race || 'Desconhecido'} • ${char.class || 'Aventureiro'} • Nv. ${char.level || 1}`;
            infoContainer.appendChild(createSafeElement("p", "char-subtitle", subtitle));

            cardHeader.appendChild(avatarContainer);
            cardHeader.appendChild(infoContainer);

            // Container de Ações
            const actionsContainer = document.createElement("div");
            actionsContainer.className = "char-card-actions";

            const btnView = createSafeElement("button", "btn btn-primary flex-1", "Inspecionar");
            const btnEdit = createSafeElement("button", "btn btn-secondary", "✏️");
            btnEdit.title = "Editar Ficha";
            const btnDelete = createSafeElement("button", "btn btn-danger", "🗑️");
            btnDelete.title = "Excluir Herói";

            // Eventos
            btnView.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha-view.html";
            });

            btnEdit.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha.html";
            });

            btnDelete.addEventListener("click", () => {
                characterToDelete = char.id;
                document.getElementById('deleteCharName').textContent = char.name;
                deleteModal.classList.add('active');
            });

            actionsContainer.appendChild(btnView);
            actionsContainer.appendChild(btnEdit);
            actionsContainer.appendChild(btnDelete);

            card.appendChild(cardHeader);
            card.appendChild(actionsContainer);

            charactersList.appendChild(card);
        });
    }

    // =========================================================
    // 4. LÓGICA DE EXCLUSÃO (MODAL)
    // =========================================================
    cancelDeleteBtn?.addEventListener("click", () => {
        characterToDelete = null;
        deleteModal.classList.remove('active');
    });

    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!characterToDelete) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Apagando...";

        try {
            const { error } = await supabase.from('characters').delete().eq('id', characterToDelete);
            if (error) throw error;
            
            showMessage("Lenda apagada dos registros.");
            
            if (localStorage.getItem("aeriom_character_id") === characterToDelete) {
                localStorage.removeItem("aeriom_character_id");
            }
            
            await loadCharacters(); 
        } catch (error) {
            console.error("Erro ao deletar:", error);
            showMessage("Erro ao excluir o herói.", true);
        } finally {
            deleteModal.classList.remove('active');
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Apagar Herói";
            characterToDelete = null;
        }
    });

    // =========================================================
    // 5. NOVA FICHA
    // =========================================================
    document.getElementById("createCharacterButton")?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("aeriom_character_id");
        window.location.href = "ficha.html";
    });

    // Inicia a busca
    loadCharacters();
});
