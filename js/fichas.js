document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // =========================================================
    // ELEMENTOS DA PÁGINA
    // =========================================================

    const lista = document.getElementById("charactersList");
    const loading = document.getElementById("loadingCharacters");
    const empty = document.getElementById("emptyCharacters");

    const novo = document.getElementById("newCharacterButton");
    const emptyNovo = document.getElementById("emptyNewCharacterButton");

    const backButton = document.getElementById("backButton");
    const userEmail = document.getElementById("userEmail");


    // =========================================================
    // VERIFICAÇÃO DA PÁGINA
    // =========================================================

    if (!lista) {
        console.error(
            "Aerion: #charactersList não foi encontrado."
        );

        return;
    }


    // =========================================================
    // VERIFICAÇÃO DO SUPABASE
    // =========================================================

    if (!window.supabaseClient) {
        console.error(
            "Aerion: supabaseClient não está disponível."
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


    // =========================================================
    // ESTADOS DA INTERFACE
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


    function mostrarLista() {
        if (loading) {
            loading.style.display = "none";
        }

        if (empty) {
            empty.style.display = "none";
        }
    }


    function mostrarVazio() {
        if (loading) {
            loading.style.display = "none";
        }

        lista.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }
    }


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
                "Aerion: ID da ficha não informado."
            );

            return;
        }

        // Guarda somente a ficha que o usuário escolheu.
        localStorage.setItem(
            "aerion_character_id",
            characterId
        );

        // Remove qualquer rascunho de criação que possa
        // interferir na abertura da ficha existente.
        localStorage.removeItem(
            "aerion_character_draft"
        );

        // Ficha existente NÃO deve abrir ficha.html.
        // Ela abre a visualização/edição da ficha.
        window.location.href = "ficha-view.html";
    }


    // =========================================================
    // NOVA FICHA
    // =========================================================

    function novaFicha() {
        // Uma nova ficha não possui ID.
        localStorage.removeItem(
            "aerion_character_id"
        );

        // Também removemos qualquer rascunho antigo.
        localStorage.removeItem(
            "aerion_character_draft"
        );

        window.location.href = "ficha.html";
    }


    // =========================================================
    // CRIAR CARD DA FICHA
    // =========================================================

    function criarCard(ficha) {
        const card = document.createElement("article");

        card.className = "character-card";

        const nome = escapeHTML(
            ficha.name || "Sem nome"
        );

        const race = escapeHTML(
            ficha.race || "Sem raça"
        );

        const classe = escapeHTML(
            ficha.class || "Sem classe"
        );

        const poder = escapeHTML(
            ficha.power || ""
        );

        const id = escapeHTML(
            ficha.id
        );

        const dataAtualizacao = formatDate(
            ficha.updated_at
        );


        // =====================================================
        // CONTEÚDO DO CARD
        // =====================================================

        card.innerHTML = `
            <div class="character-card-main">

                <div class="character-card-avatar">
                    A
                </div>

                <div class="character-card-info">

                    <h3>
                        ${nome}
                    </h3>

                    <p>
                        ${race}
                        <span>•</span>
                        ${classe}
                    </p>

                    ${
                        poder
                            ? `
                                <small>
                                    ${poder}
                                </small>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="character-card-footer">

                <small>
                    Atualizada em ${dataAtualizacao}
                </small>

                <div class="character-card-actions">

                    <button
                        type="button"
                        class="character-edit"
                        data-id="${id}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="character-delete"
                        data-id="${id}"
                    >
                        Excluir
                    </button>

                </div>

            </div>
        `;


        // =====================================================
        // BOTÃO EDITAR
        // =====================================================

        const editar = card.querySelector(
            ".character-edit"
        );

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

        const excluir = card.querySelector(
            ".character-delete"
        );

        if (excluir) {
            excluir.addEventListener(
                "click",
                async (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    await excluirFicha(ficha);
                }
            );
        }


        // =====================================================
        // CLIQUE NO CARD
        // =====================================================

        card.addEventListener("click", (event) => {
            // Se clicou em um botão, o botão já cuida da ação.
            if (
                event.target.closest(
                    ".character-card-actions"
                )
            ) {
                return;
            }

            abrirFicha(ficha.id);
        });


        return card;
    }


    // =========================================================
    // EXCLUIR FICHA
    // =========================================================

    async function excluirFicha(ficha) {
        const nome = ficha.name || "Sem nome";

        const confirmado = window.confirm(
            `Excluir a ficha "${nome}"?\n\nEssa ação não pode ser desfeita.`
        );

        if (!confirmado) {
            return;
        }


        // Desabilita temporariamente os botões para evitar
        // múltiplos cliques durante a exclusão.
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
                    "Aerion: erro ao excluir ficha:",
                    error
                );

                window.alert(
                    "Não foi possível excluir a ficha."
                );

                return;
            }


            // Se a ficha excluída era a ficha atualmente
            // armazenada no navegador, removemos o ID.
            const fichaAtual = localStorage.getItem(
                "aerion_character_id"
            );

            if (fichaAtual === ficha.id) {
                localStorage.removeItem(
                    "aerion_character_id"
                );
            }


            // Atualiza a lista.
            await carregarFichas();

        } catch (error) {
            console.error(
                "Aerion: erro inesperado ao excluir ficha:",
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
    // CARREGAR FICHAS DO USUÁRIO
    // =========================================================

    async function carregarFichas() {
        mostrarCarregando();

        try {
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
                    updated_at,
                    created_at
                `)
                .eq(
                    "user_id",
                    currentUser.id
                )
                .order(
                    "updated_at",
                    {
                        ascending: false
                    }
                );


            if (error) {
                console.error(
                    "Aerion: erro ao carregar fichas:",
                    error
                );

                mostrarErro(
                    error.message ||
                    "Erro ao consultar suas fichas."
                );

                return;
            }


            if (!Array.isArray(data) || data.length === 0) {
                mostrarVazio();
                return;
            }


            // =================================================
            // RENDERIZAR
            // =================================================

            lista.innerHTML = "";

            mostrarLista();


            data.forEach((ficha) => {
                const card = criarCard(ficha);

                lista.appendChild(card);
            });


            console.log(
                `Aerion: ${data.length} ficha(s) carregada(s).`
            );

        } catch (error) {
            console.error(
                "Aerion: erro inesperado ao carregar fichas:",
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

    let currentUser = null;

    try {
        const {
            data,
            error
        } = await client.auth.getSession();


        if (error) {
            console.error(
                "Aerion: erro ao verificar sessão:",
                error
            );

            mostrarErro(
                "Não foi possível verificar sua sessão."
            );

            return;
        }


        const session = data?.session;


        if (!session || !session.user) {
            window.location.href = "index.html";
            return;
        }


        currentUser = session.user;


        // Mostra o e-mail no cabeçalho.
        if (userEmail) {
            userEmail.textContent =
                currentUser.email || "Usuário";
        }


        console.log(
            "Aerion: usuário autenticado:",
            currentUser.id
        );

    } catch (error) {
        console.error(
            "Aerion: erro inesperado ao verificar sessão:",
            error
        );

        mostrarErro(
            "Erro ao verificar sua conta."
        );

        return;
    }


    // =========================================================
    // BOTÃO VOLTAR
    // =========================================================

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => {
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
            novaFicha
        );
    }


    if (emptyNovo) {
        emptyNovo.addEventListener(
            "click",
            novaFicha
        );
    }


    // =========================================================
    // PRIMEIRO CARREGAMENTO
    // =========================================================

    await carregarFichas();
});