/* =========================================================
   AERIOM — VISUALIZAÇÃO DE FICHA (js/ficha-view.js)
   Fase 4: Grimório Seguro e Desacoplado (Anti-XSS)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ Supabase não inicializado.");
        return;
    }

    const currentCharacterId = localStorage.getItem("aeriom_character_id");
    const viewContainer = document.getElementById("characterSheetView");
    const msgBox = document.getElementById("fichaViewMessage");

    // =========================================================
    // 1. UTILITÁRIOS
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!msgBox) return;
        msgBox.textContent = msg;
        msgBox.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
    }

    // Preenchimento seguro via textContent (Anti-XSS)
    function setContent(id, text, fallback = "—") {
        const el = document.getElementById(id);
        if (el) el.textContent = (text !== null && text !== undefined && text !== '') ? text : fallback;
    }

    // =========================================================
    // 2. BUSCA E INJEÇÃO DOS DADOS
    // =========================================================
    async function loadCharacterView() {
        if (!currentCharacterId) {
            window.location.href = "fichas.html";
            return;
        }

        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError || !session) {
                window.location.href = "index.html";
                return;
            }

            const { data: char, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', currentCharacterId)
                .single();

            if (error) throw error;
            if (!char) {
                showMessage("Os registros deste herói não foram encontrados.", true);
                return;
            }

            // Exibe o container da ficha
            if (viewContainer) viewContainer.style.display = 'flex';

            // 1. Avatar Seguro
            const avatarImg = document.getElementById("viewCharAvatar");
            const avatarFallback = document.getElementById("viewCharAvatarFallback");
            const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';

            if (char.avatar_url && char.avatar_url.trim() !== '') {
                avatarImg.src = char.avatar_url;
                avatarImg.style.display = "block";
                avatarFallback.style.display = "none";
                
                avatarImg.onerror = () => {
                    avatarImg.style.display = "none";
                    avatarFallback.style.display = "grid";
                    avatarFallback.textContent = initial;
                };
            } else {
                avatarImg.style.display = "none";
                avatarFallback.style.display = "grid";
                avatarFallback.textContent = initial;
            }

            // 2. Identidade
            setContent("viewCharName", char.name, "Herói Sem Nome");
            setContent("viewCharRace", char.race, "Desconhecido");
            setContent("viewCharClass", char.class, "Aventureiro");
            setContent("viewCharLevel", char.level, "1");
            
            // 3. Status Vitais
            setContent("viewCharHpMax", char.hp_max, "0");
            setContent("viewCharManaMax", char.mana_max, "0");

            // 4. Atributos
            const attrs = char.attributes || char;
            setContent("viewAttrForca", attrs.forca, "0");
            setContent("viewAttrAgilidade", attrs.agilidade, "0");
            setContent("viewAttrVigor", attrs.vigor, "0");
            setContent("viewAttrIntelecto", attrs.intelecto, "0");
            setContent("viewAttrPercepcao", attrs.percepcao, "0");
            setContent("viewAttrPresenca", attrs.presenca, "0");
            setContent("viewAttrPrecisao", attrs.precisao, "0");
            setContent("viewAttrControle", attrs.controle, "0");

            // 5. Blocos de Texto
            setContent("viewCharSkills", char.skills, "Nenhum poder ou técnica registrado.");
            setContent("viewCharInventory", char.inventory, "A mochila está vazia.");
            setContent("viewCharHistory", char.history, "As crônicas ainda não registraram a história deste herói...");

        } catch (err) {
            console.error("Erro ao carregar visualização:", err);
            showMessage("Erro ao decifrar o grimório do personagem.", true);
        }
    }

    // =========================================================
    // 3. AÇÕES
    // =========================================================
    document.getElementById("editCharacterBtn")?.addEventListener("click", () => {
        // O currentCharacterId já está no localStorage
        window.location.href = "ficha.html";
    });

    loadCharacterView();
});
