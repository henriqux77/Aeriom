/* =========================================================
   AERIOM — MOTOR DE CRIAÇÃO DE FICHAS (js/ficha.js)
   Fase 4: Inserção e Edição (Integração Supabase)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ Supabase não inicializado.");
        return;
    }

    const characterForm = document.getElementById("characterForm");
    const fichaMessage = document.getElementById("fichaMessage");
    const pageTitle = document.getElementById("pageTitle");
    const saveBtn = document.getElementById("saveCharacterBtn");

    let currentCharacterId = localStorage.getItem("aeriom_character_id");
    let currentUser = null;

    // =========================================================
    // 1. UTILITÁRIOS E FEEDBACK
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!fichaMessage) return;
        fichaMessage.textContent = msg;
        fichaMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'}`;
        fichaMessage.style.display = 'flex';
        
        // Rola a tela para cima para o usuário ler a mensagem
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (!isError) {
            setTimeout(() => { fichaMessage.style.display = 'none'; }, 4000);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Forjando...";
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = currentCharacterId ? "Salvar Alterações" : "Forjar Personagem";
        }
    }

    // =========================================================
    // 2. INICIALIZAÇÃO E CARREGAMENTO
    // =========================================================
    async function init() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;

        if (currentCharacterId) {
            await loadCharacterData(currentCharacterId);
        }
    }

    async function loadCharacterData(id) {
        try {
            const { data: char, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!char) {
                showMessage("Ficha não encontrada.", true);
                return;
            }

            // Atualiza Interface para Modo Edição
            if (pageTitle) pageTitle.textContent = `Editando: ${char.name}`;
            saveBtn.textContent = "Salvar Alterações";

            // 1. Identidade
            document.getElementById("charName").value = char.name || "";
            document.getElementById("charRace").value = char.race || "";
            document.getElementById("charClass").value = char.class || "";
            document.getElementById("charLevel").value = char.level || 1;
            document.getElementById("charAvatar").value = char.avatar_url || "";

            // 2. Recursos Vitais
            document.getElementById("charHpMax").value = char.hp_max || 0;
            document.getElementById("charManaMax").value = char.mana_max || 0;

            // 3. Atributos (Suporta colunas diretas ou JSON)
            const attrs = char.attributes || char; // Fallback estrutural
            document.getElementById("attrForca").value = attrs.forca || 0;
            document.getElementById("attrAgilidade").value = attrs.agilidade || 0;
            document.getElementById("attrVigor").value = attrs.vigor || 0;
            document.getElementById("attrIntelecto").value = attrs.intelecto || 0;
            document.getElementById("attrPercepcao").value = attrs.percepcao || 0;
            document.getElementById("attrPresenca").value = attrs.presenca || 0;
            document.getElementById("attrPrecisao").value = attrs.precisao || 0;
            document.getElementById("attrControle").value = attrs.controle || 0;

            // 4 e 5. Textos Livres
            document.getElementById("charSkills").value = char.skills || "";
            document.getElementById("charInventory").value = char.inventory || "";
            document.getElementById("charHistory").value = char.history || "";

        } catch (err) {
            console.error("Erro ao carregar ficha:", err);
            showMessage("Erro ao acessar os registros do personagem.", true);
        }
    }

    // =========================================================
    // 3. SALVAMENTO (CREATE / UPDATE)
    // =========================================================
    characterForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);
        fichaMessage.style.display = 'none';

        // Coleta dos dados do formulário
        const characterData = {
            user_id: currentUser.id,
            name: document.getElementById("charName").value.trim(),
            race: document.getElementById("charRace").value.trim(),
            class: document.getElementById("charClass").value.trim(),
            level: parseInt(document.getElementById("charLevel").value) || 1,
            avatar_url: document.getElementById("charAvatar").value.trim(),
            
            hp_max: parseInt(document.getElementById("charHpMax").value) || 0,
            mana_max: parseInt(document.getElementById("charManaMax").value) || 0,
            
            // Atributos
            forca: parseInt(document.getElementById("attrForca").value) || 0,
            agilidade: parseInt(document.getElementById("attrAgilidade").value) || 0,
            vigor: parseInt(document.getElementById("attrVigor").value) || 0,
            intelecto: parseInt(document.getElementById("attrIntelecto").value) || 0,
            percepcao: parseInt(document.getElementById("attrPercepcao").value) || 0,
            presenca: parseInt(document.getElementById("attrPresenca").value) || 0,
            precisao: parseInt(document.getElementById("attrPrecisao").value) || 0,
            controle: parseInt(document.getElementById("attrControle").value) || 0,
            
            skills: document.getElementById("charSkills").value.trim(),
            inventory: document.getElementById("charInventory").value.trim(),
            history: document.getElementById("charHistory").value.trim(),
        };

        try {
            if (currentCharacterId) {
                // UPDATE (Atualizar Existente)
                const { error } = await supabase
                    .from('characters')
                    .update(characterData)
                    .eq('id', currentCharacterId)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                showMessage("Lenda atualizada com sucesso!");
                
            } else {
                // INSERT (Criar Novo)
                const { data, error } = await supabase
                    .from('characters')
                    .insert([characterData])
                    .select()
                    .single();

                if (error) throw error;
                
                currentCharacterId = data.id;
                localStorage.setItem("aeriom_character_id", currentCharacterId);
                showMessage("Novo herói materializado com sucesso!");
            }

            // Redireciona para o modo de leitura após 1.5s
            setTimeout(() => {
                window.location.href = "ficha-view.html";
            }, 1500);

        } catch (err) {
            console.error("Erro ao salvar ficha:", err);
            showMessage("Uma falha mística impediu o registro. Tente novamente.", true);
            setLoading(false);
        }
    });

    // Inicializa o módulo
    init();
});
