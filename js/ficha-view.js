/* =========================================================
   AERIOM — VISUALIZAÇÃO DE FICHA (js/ficha-view.js)
   Fase 4: Grimório Seguro, Parsers V4 e Tokens de Dados
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
    // 1. UTILITÁRIOS SEGUROS
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!msgBox) return;
        msgBox.textContent = msg;
        msgBox.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
    }

    function setContent(id, text, fallback = "—") {
        const el = document.getElementById(id);
        if (el) el.textContent = (text !== null && text !== undefined && text !== '') ? text : fallback;
    }

    // Cria o Token de Dado Visual (V4.0) em vez de apenas texto solto
    function renderDieToken(value, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ''; // Limpeza segura antes do append

        if (!value || value === 0 || value === "0") {
            const empty = document.createElement("span");
            empty.textContent = "—";
            empty.style.color = "var(--color-text-disabled)";
            empty.style.fontWeight = "600";
            container.appendChild(empty);
            return;
        }

        const die = document.createElement("div");
        die.className = "die-token";
        die.setAttribute("data-type", `D${value}`);
        die.textContent = `D${value}`;
        
        // Remove interatividade (Pois é modo leitura)
        die.style.cursor = "default";
        die.style.boxShadow = "none";
        die.style.transform = "none";
        // Ajuste de tamanho para o modo de leitura
        die.style.width = "48px";
        die.style.height = "48px";
        die.style.fontSize = "1.1rem";
        
        container.appendChild(die);
    }

    // =========================================================
    // 2. BUSCA, PARSER E INJEÇÃO DOS DADOS
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
                showMessage("Os registos deste herói não foram encontrados.", true);
                return;
            }

            if (viewContainer) viewContainer.style.display = 'flex';

            // 1. Avatar Seguro com Fallback
            const avatarImg = document.getElementById("viewCharAvatar") || document.querySelector(".view-avatar-img");
            const avatarFallback = document.getElementById("viewCharAvatarFallback") || document.querySelector(".view-avatar-fallback");
            const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';

            if (char.avatar_url && char.avatar_url.trim() !== '') {
                if (avatarImg) {
                    avatarImg.src = char.avatar_url;
                    avatarImg.style.display = "block";
                    avatarImg.onerror = () => {
                        avatarImg.style.display = "none";
                        if (avatarFallback) {
                            avatarFallback.style.display = "grid";
                            avatarFallback.textContent = initial;
                        }
                    };
                }
                if (avatarFallback) avatarFallback.style.display = "none";
            } else {
                if (avatarImg) avatarImg.style.display = "none";
                if (avatarFallback) {
                    avatarFallback.style.display = "grid";
                    avatarFallback.textContent = initial;
                }
            }

            // 2. Identidade Básica
            setContent("viewCharName", char.name, "Herói Sem Nome");
            setContent("viewCharRace", char.race, "Desconhecido");
            setContent("viewCharClass", char.class, "Aventureiro");
            setContent("viewCharLevel", char.level, "1");
            
            // 3. Status Vitais Base
            setContent("viewCharHpMax", char.hp_max, "0");
            setContent("viewCharManaMax", char.mana_max, "0");

            // 4. Parser Inteligente das Estatísticas Secundárias (V4.0)
            // Extrai a Defesa, Iniciativa e Deslocamento que foram salvas em formato de texto no "history"
            let historyText = char.history || "";
            let power = "Nenhum", def = "0", init = "0", speed = "0";
            
            const statsMarker = "=== ESTATÍSTICAS SECUNDÁRIAS ===";
            const statsIndex = historyText.indexOf(statsMarker);
            
            if (statsIndex !== -1) {
                const statsBlock = historyText.substring(statsIndex);
                // Limpa a história para exibir apenas a narrativa ao jogador
                historyText = historyText.substring(0, statsIndex).trim(); 
                
                const powerMatch = statsBlock.match(/Elemento:\s*(.+)/);
                if (powerMatch) power = powerMatch[1];
                
                const defMatch = statsBlock.match(/Defesa:\s*(\d+)/);
                if (defMatch) def = defMatch[1];
                
                const initMatch = statsBlock.match(/Iniciativa:\s*(\d+)/);
                if (initMatch) init = initMatch[1];
                
                const speedMatch = statsBlock.match(/Deslocamento:\s*(\d+)/);
                if (speedMatch) speed = speedMatch[1];
            }

            // Preenche os campos táticos se existirem no HTML
            setContent("viewCharPower", power, "Nenhum");
            setContent("viewCharDefense", def, "0");
            setContent("viewCharInitiative", init, "0");
            setContent("viewCharSpeed", speed, "0");

            // 5. Atributos Visuais (Renderiza os Tokens D4, D6, D20...)
            const attrs = char.attributes || char;
            renderDieToken(attrs.forca, "viewAttrForca");
            renderDieToken(attrs.agilidade, "viewAttrAgilidade");
            renderDieToken(attrs.vigor, "viewAttrVigor");
            renderDieToken(attrs.intelecto, "viewAttrIntelecto");
            renderDieToken(attrs.percepcao, "viewAttrPercepcao");
            renderDieToken(attrs.presenca, "viewAttrPresenca");
            renderDieToken(attrs.precisao, "viewAttrPrecisao");
            renderDieToken(attrs.controle, "viewAttrControle");

            // 6. Blocos de Texto Resilientes
            setContent("viewCharSkills", char.skills, "Nenhum poder ou técnica registado.");
            setContent("viewCharInventory", char.inventory, "A mochila está vazia.");
            setContent("viewCharHistory", historyText, "As crónicas ainda não registaram a história deste herói...");

        } catch (err) {
            console.error("Erro ao carregar visualização:", err);
            showMessage("Erro ao decifrar o grimório do personagem.", true);
        }
    }

    // =========================================================
    // 3. AÇÕES
    // =========================================================
    document.getElementById("editCharacterBtn")?.addEventListener("click", () => {
        // Redireciona para o Creator, que buscará o ID no localStorage para carregar os dados
        window.location.href = "ficha.html";
    });

    loadCharacterView();
});
