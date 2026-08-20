document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // =========================================================
    // AERIOM - FICHAS
    // =========================================================

    const lista = document.getElementById("charactersList");
    const loading = document.getElementById("loadingCharacters");
    const empty = document.getElementById("emptyCharacters");

    const novo = document.getElementById("newCharacterButton");
    const emptyNovo = document.getElementById("emptyNewCharacterButton");

    const backButton = document.getElementById("backButton");

    let currentUser = null;


    // =========================================================
    // VERIFICAÇÃO DOS ELEMENTOS
    // =========================================================

    if (!lista) {
        console.error(
            "Aeriom: #charactersList não foi encontrado."
        );

        return;
    }


    // =========================================================
    // VERIFICAÇÃO DO SUPABASE
    // =========================================================

    if (!window.supabaseClient) {
        console.error(
            "Aeriom: supabaseClient não está disponível."
        );

        mostrarErro(
            "Não foi possível conectar ao banco de dados."
        );

        return;
    }

    const client = window.supabaseClient;


    // =========================================================
    // FUNÇÕES AUXILIARES
    // =========================================================

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatDate(value) {
        if (!value) {
            return "Sem atualização";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Sem atualização";
        }

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }


    function getCharacterInitial(name) {
        const texto = String(name ?? "").trim();

        if (!texto) {
            return "A";
        }

        return texto.charAt(0).toUpperCase();
    }


    // =========================================================
    // ESTADO: CARREGANDO
    // =========================================================

    function mostrarCarregando() {
        if (loading) {
            loading.style.display = "block";
        }

        if (empty) {
            empty.style.display = "none";
        }

        lista.innerHTML = "";
    }


    // =========================================================
    // ESTADO: LISTA
    // =========================================================

    function mostrarLista() {
        if (loading) {
            loading.style.display = "none";
        }

        if (empty) {
            empty.style.display = "none";
        }
    }


    // =========================================================
    // ESTADO: VAZIO
    // =========================================================

    function mostrarVazio() {
        if (loading) {
            loading.style.display = "none";
        }

        lista.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }
    }


    // =========================================================
    // ESTADO: ERRO
    // =========================================================

    function mostrarErro(mensagem) {
        if (loading) {
            loading.style.display = "none";
        }

        if (empty) {
            empty.style.display = "none";
        }

        lista.innerHTML = `
            <div class="characters-message">

                <h3>
                    Não foi possível carregar suas fichas.
                </h3>

                <p>
                    ${escapeHTML(mensagem)}
                </p>

                <button
                    id="retryCharactersButton"
                    class="primary-button"
                    type="button"
                >
                    Tentar novamente
                </button>

            </div>
        `;

        const retryButton = document.getElementById(
            "retryCharactersButton"
        );

        if (retryButton) {
            retryButton.addEventListener(
                "click",
                carregarFichas
            );
        }
    }


    // =========================================================
    // ABRIR FICHA EXISTENTE
    // =========================================================

    function abrirFicha(characterId) {
        if (!characterId) {
            console.error(
                "Aeriom: não foi possível abrir a ficha. ID ausente."
            );

            return;
        }

        // Guarda o ID da ficha que será aberta.
        localStorage.setItem(
            "aerion_character_id",
            String(characterId)
        );

        // Evita que um rascunho antigo interfira.
        localStorage.removeItem(
            "aerion_character_draft"
        );

        // Ficha EXISTENTE -> tela de visualização/edição.
        window.location.href = "ficha-view.html";
    }


    // =========================================================
    // CRIAR NOVA FICHA
    // =========================================================

    function novaFicha() {
        // Nova ficha não possui ID.
        localStorage.removeItem(
            "aerion_character_id"
        );

        // Limpa rascunho anterior.
        localStorage.removeItem(
            "aerion_character_draft"
        );

        // Nova ficha -> formulário de criação.
        window.location.href = "ficha.html";
    }


    // =========================================================
    // EXCLUIR FICHA
    // =========================================================

    async function excluirFicha(ficha) {
        if (!currentUser) {
            console.error(
                "Aeriom: usuário não autenticado."
            );

            return;
        }

        if (!ficha || !ficha.id) {
            console.error(
                "Aeriom: ficha inválida para exclusão."
            );

            return;
        }

        const nome = ficha.name || "Sem nome";

        const confirmado = window.confirm(
            `Excluir a ficha "${nome}"?\n\nEssa ação não pode ser desfeita.`
        );

        if (!confirmado) {
            return;
        }


        const botoes = lista.querySelectorAll(
            ".character-edit, .character-delete"
        );

        botoes.forEach((botao) => {
            botao.disabled = true;
        });


        try {
            const { error } = await client
                .from("characters")
                .delete()
                .eq("id", ficha.id)
                .eq("user_id", currentUser.id);


            if (error) {
                console.error(
                    "Aeriom: erro ao excluir ficha:",
                    error
                );

                window.alert(
                    error.message
                        ? `Não foi possível excluir a ficha.\n\n${error.message}`
                        : "Não foi possível excluir a ficha."
                );

                return;
            }


            // Se essa era a ficha atualmente armazenada, remove o ID.
            const fichaAtual = localStorage.getItem(
                "aerion_character_id"
            );

            if (
                fichaAtual &&
                String(fichaAtual) === String(ficha.id)
            ) {
                localStorage.removeItem(
                    "aerion_character_id"
                );
            }


            // Recarrega a lista.
            await carregarFichas();

        } catch (error) {
            console.error(
                "Aeriom: erro inesperado ao excluir ficha:",
                error
            );

            window.alert(
                "Ocorreu um erro ao excluir a ficha."
            );

        } finally {
            botoes.forEach((botao) => {
                botao.disabled = false;
            });
        }
    }


    // =========================================================
    // CRIAR CARD
    // =========================================================

    function criarCard(ficha) {
        const card = document.createElement("article");

        card.className = "character-card";

        const nome = ficha.name || "Sem nome";
        const race = ficha.race || "Sem raça";
        const classe = ficha.class || "Sem classe";
        const poder = ficha.power || "Nenhum";

        const nomeHTML = escapeHTML(nome);
        const raceHTML = escapeHTML(race);
        const classeHTML = escapeHTML(classe);
        const poderHTML = escapeHTML(poder);

        const inicial = escapeHTML(
            getCharacterInitial(nome)
        );

        const dataAtualizacao = escapeHTML(
            formatDate(ficha.updated_at)
        );

        // Tratamento do Avatar (Imagem ou Letra Inicial)
        const avatarHTML = ficha.avatar_url
            ? `<img src="${escapeHTML(ficha.avatar_url)}" alt="${nomeHTML}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.outerHTML='${inicial}'">`
            : inicial;


        // =====================================================
        // CONTEÚDO DO CARD (Sincronizado com style.css)
        // =====================================================

        card.innerHTML = `
            <div class="character-card-header">
                <div class="character-avatar">
                    ${avatarHTML}
                </div>
                <div class="character-card-title">
                    <h3>${nomeHTML}</h3>
                    <span>${raceHTML} • ${classeHTML}</span>
                </div>
            </div>

            <div class="character-card-info">
                <div class="character-info-item">
                    <span>Atualização</span>
                    <strong>${dataAtualizacao}</strong>
                </div>
                <div class="character-info-item">
                    <span>Poder</span>
                    <strong>${poderHTML}</strong>
                </div>
            </div>

            <div class="character-card-actions">
                <button type="button" class="secondary-button character-edit" aria-label="Editar ${nomeHTML}">
                    Editar
                </button>
                <button type="button" class="secondary-button character-delete" aria-label="Excluir ${nomeHTML}" style="border-color: rgba(180, 40, 10, 0.4); color: #d46a4a;">
                    Excluir
                </button>
            </div>
        `;


        // =====================================================
        // BOTÃO EDITAR
        // =====================================================

        const editar = card.querySelector(".character-edit");

        if (editar) {
            editar.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                abrirFicha(ficha.id);
            });
        }


        // =====================================================
        // BOTÃO EXCLUIR
        // =====================================================

        const excluir = card.querySelector(".character-delete");

        if (excluir) {
            excluir.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await excluirFicha(ficha);
            });
        }


        // =====================================================
        // CLIQUE NO CARD (Abre a ficha)
        // =====================================================

        card.addEventListener("click", (event) => {
            const clicouEmBotao = event.target.closest(".character-card-actions");

            if (clicouEmBotao) {
                return;
            }

            abrirFicha(ficha.id);
        });

        return card;
    }


    // =========================================================
    // CARREGAR FICHAS
    // =========================================================

    async function carregarFichas() {
        if (!currentUser) {
            console.error(
                "Aeriom: não é possível carregar fichas sem usuário."
            );

            return;
        }

        mostrarCarregando();


        try {
            // Adicionado 'avatar_url' ao select
            const {
                data,
                error
            } = await client
                .from("characters")
                .select(`
                    id,
                    user_id,
                    name,
                    age,
                    race,
                    class,
                    power,
                    avatar_url,
                    updated_at,
                    created_at
                `)
                .eq("user_id", currentUser.id)
                .order("updated_at", { ascending: false });


            // =================================================
            // ERRO DO SUPABASE
            // =================================================

            if (error) {
                console.error(
                    "Aeriom: erro ao carregar fichas:",
                    error
                );

                mostrarErro(
                    error.message ||
                    "Erro ao consultar suas fichas."
                );

                return;
            }


            // =================================================
            // NENHUMA FICHA
            // =================================================

            if (!Array.isArray(data) || data.length === 0) {
                mostrarVazio();

                console.log(
                    "Aeriom: nenhuma ficha encontrada."
                );

                return;
            }


            // =================================================
            // RENDERIZAR LISTA
            // =================================================

            lista.innerHTML = "";

            data.forEach((ficha) => {
                const card = criarCard(ficha);
                lista.appendChild(card);
            });

            mostrarLista();


            console.log(
                `Aeriom: ${data.length} ficha(s) carregada(s).`
            );

        } catch (error) {
            console.error(
                "Aeriom: erro inesperado ao carregar fichas:",
                error
            );

            mostrarErro(
                "Ocorreu um erro ao carregar suas fichas."
            );
        }
    }


    // =========================================================
    // VERIFICAR SESSÃO
    // =========================================================

    async function verificarSessao() {
        try {
            const {
                data,
                error
            } = await client.auth.getSession();


            if (error) {
                console.error(
                    "Aeriom: erro ao verificar sessão:",
                    error
                );

                mostrarErro(
                    "Não foi possível verificar sua sessão."
                );

                return false;
            }


            const session = data?.session;


            if (!session || !session.user) {
                console.warn(
                    "Aeriom: usuário não autenticado."
                );

                window.location.href = "index.html";

                return false;
            }


            currentUser = session.user;

            console.log(
                "Aeriom: usuário autenticado:",
                currentUser.id
            );

            return true;

        } catch (error) {
            console.error(
                "Aeriom: erro inesperado ao verificar sessão:",
                error
            );

            mostrarErro(
                "Erro ao verificar sua conta."
            );

            return false;
        }
    }


    // =========================================================
    // BOTÃO VOLTAR
    // =========================================================

    if (backButton) {
        backButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                window.location.href = "index.html";
            }
        );
    }


    // =========================================================
    // BOTÃO NOVA FICHA
    // =========================================================

    if (novo) {
        novo.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                novaFicha();
            }
        );
    }


    // =========================================================
    // BOTÃO NOVA FICHA DO ESTADO VAZIO
    // =========================================================

    if (emptyNovo) {
        emptyNovo.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                novaFicha();
            }
        );
    }


    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    const autenticado = await verificarSessao();

    if (!autenticado) {
        return;
    }

    await carregarFichas();

});
