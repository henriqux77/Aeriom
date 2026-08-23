/* =========================================================
   AERIOM — GERENCIADOR DE FICHAS (js/fichas.js)
   Fase 4: Sistema de Fichas (Listagem Premium)
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

    // =========================================================
    // 1. UTILITÁRIOS
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!charactersMessage) return;
        charactersMessage.textContent = msg;
        charactersMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'}`;
        charactersMessage.style.display = 'flex';
        setTimeout(() => { charactersMessage.style.display = 'none'; }, 4000);
    }

    // =========================================================
    // 2. BUSCA E RENDERIZAÇÃO DE FICHAS
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
            charactersList.innerHTML = '';
        }
    }

    function renderCharacters(characters) {
        charactersList.innerHTML = "";

        if (!characters || characters.length === 0) {
            charactersList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: var(--theme-surface-interactive); border: 2px dashed var(--theme-border-strong); border-radius: var(--radius-md);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📜</div>
                    <p style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-primary); margin-bottom: 0.5rem;">Nenhum Herói Encontrado</p>
                    <p style="font-size: 0.95rem; margin-bottom: 1.5rem;">Os salões de Aeriom aguardam a sua primeira lenda.</p>
                    <button class="btn btn-primary" onclick="window.location.href='ficha.html'">Forjar Novo Personagem</button>
                </div>
            `;
            return;
        }

        characters.forEach(char => {
            const card = document.createElement("div");
            // Estilização do Card Premium
            card.style.cssText = `
                background: linear-gradient(145deg, var(--theme-surface-elevated), var(--theme-surface));
                border: 1px solid var(--theme-border-strong);
                border-radius: var(--radius-md);
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                box-shadow: var(--shadow-soft);
                transition: var(--transition-fast);
            `;
            
            card.onmouseenter = () => {
                card.style.borderColor = "var(--theme-primary-soft)";
                card.style.transform = "translateY(-4px)";
                card.style.boxShadow = "var(--shadow-hard)";
            };
            card.onmouseleave = () => {
                card.style.borderColor = "var(--theme-border-strong)";
                card.style.transform = "translateY(0)";
                card.style.boxShadow = "var(--shadow-soft)";
            };

            const avatarHtml = char.avatar_url 
                ? `<img src="${char.avatar_url}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--theme-primary-soft); background: var(--theme-bg);">` 
                : `<div style="width: 64px; height: 64px; border-radius: 50%; background: var(--theme-bg); border: 2px solid var(--theme-border-strong); display: grid; place-items: center; font-size: 1.5rem; color: var(--theme-primary); font-family: var(--font-heading);">${char.name.charAt(0).toUpperCase()}</div>`;

            card.innerHTML = `
                <div style="display: flex; gap: 1rem; align-items: center; border-bottom: 1px solid var(--theme-border); padding-bottom: 1rem;">
                    ${avatarHtml}
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${char.name}</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">${char.race || 'Desconhecido'} • ${char.class || 'Aventureiro'} • Nv. ${char.level || 1}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: auto;">
                    <button class="btn btn-primary" style="flex: 1; padding: 0.6rem;" data-action="view" data-id="${char.id}">Inspecionar</button>
                    <button class="btn btn-secondary" style="padding: 0.6rem;" data-action="edit" data-id="${char.id}" title="Editar Ficha">✏️</button>
                    <button class="btn btn-secondary" style="padding: 0.6rem; color: var(--danger); border-color: rgba(239,68,68,0.3);" data-action="delete" data-id="${char.id}" title="Excluir Herói">🗑️</button>
                </div>
            `;

            // Ações dos Botões
            const btnView = card.querySelector('[data-action="view"]');
            const btnEdit = card.querySelector('[data-action="edit"]');
            const btnDelete = card.querySelector('[data-action="delete"]');

            btnView.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha-view.html";
            });

            btnEdit.addEventListener("click", () => {
                localStorage.setItem("aeriom_character_id", char.id);
                window.location.href = "ficha.html";
            });

            btnDelete.addEventListener("click", async () => {
                if (confirm(`A fogueira apagará a lenda de ${char.name} para sempre. Tem certeza que deseja excluir este herói?`)) {
                    await deleteCharacter(char.id);
                }
            });

            charactersList.appendChild(card);
        });
    }

    // =========================================================
    // 3. EXCLUSÃO E NAVEGAÇÃO
    // =========================================================
    async function deleteCharacter(id) {
        try {
            const { error } = await supabase.from('characters').delete().eq('id', id);
            if (error) throw error;
            
            showMessage("Herói apagado dos registros.");
            
            // Se a ficha deletada estiver no storage, limpa
            if (localStorage.getItem("aeriom_character_id") === id) {
                localStorage.removeItem("aeriom_character_id");
            }
            
            loadCharacters(); // Atualiza a grid
        } catch (error) {
            console.error("Erro ao deletar:", error);
            showMessage("Erro ao excluir o herói.", true);
        }
    }

    // Garante que o botão "+ Nova Ficha" (No HTML) zere o storage para não puxar dados velhos
    document.getElementById("createCharacterButton")?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("aeriom_character_id");
        localStorage.removeItem("aeriom_character_draft");
        window.location.href = "ficha.html";
    });

    // Inicia a busca assim que carrega a página
    loadCharacters();
});
