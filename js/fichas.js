document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // ELEMENTOS DA PÁGINA
    // =====================================================

    const lista =
        document.getElementById("charactersList");

    const loading =
        document.getElementById("loadingCharacters");

    const empty =
        document.getElementById("emptyCharacters");

    const novo =
        document.getElementById("newCharacterButton");

    const emptyNovo =
        document.getElementById(
            "emptyNewCharacterButton"
        );

    const backButton =
        document.getElementById("backButton");

    const userEmail =
        document.getElementById("userEmail");


    // =====================================================
    // VERIFICAR ELEMENTOS
    // =====================================================

    if (!lista) {

        console.error(
            "❌ Elemento #charactersList não encontrado."
        );

        return;

    }


    // =====================================================
    // VERIFICAR SUPABASE
    // =====================================================

    if (!window.supabaseClient) {

        console.error(
            "❌ Supabase não encontrado."
        );

        mostrarErro(
            "Erro ao conectar ao banco de dados."
        );

        return;

    }


    const supabaseClient =
        window.supabaseClient;


    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    let session;

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "❌ Erro ao obter sessão:",
                error
            );

            mostrarErro(
                "Não foi possível verificar sua sessão."
            );

            return;

        }


        session =
            data?.session;


    } catch (error) {

        console.error(
            "❌ Erro inesperado ao verificar sessão:",
            error
        );

        mostrarErro(
            "Erro ao verificar sua conta."
        );

        return;

    }


    // =====================================================
    // USUÁRIO NÃO LOGADO
    // =====================================================

    if (!session) {

        console.warn(
            "⚠️ Nenhum usuário logado."
        );

        window.location.href =
            "index.html";

        return;

    }


    // =====================================================
    // USUÁRIO LOGADO
    // =====================================================

    const user =
        session.user;


    console.log(
        "👤 Usuário logado:",
        user
    );


    console.log(
        "🆔 ID do usuário:",
        user.id
    );


    if (userEmail) {

        userEmail.textContent =
            user.email || "Usuário";

    }


    // =====================================================
    // FUNÇÃO ESCAPAR HTML
    // =====================================================

    function escapeHTML(value) {

        return String(value ?? "")

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =====================================================
    // MOSTRAR CARREGAMENTO
    // =====================================================

    function mostrarCarregando() {

        if (loading) {

            loading.style.display =
                "block";

        }

        if (empty) {

            empty.style.display =
                "none";

        }

        lista.innerHTML =
            "";

    }


    // =====================================================
    // MOSTRAR LISTA
    // =====================================================

    function mostrarLista() {

        if (loading) {

            loading.style.display =
                "none";

        }

        if (empty) {

            empty.style.display =
                "none";

        }

    }


    // =====================================================
    // MOSTRAR ESTADO VAZIO
    // =====================================================

    function mostrarVazio() {

        if (loading) {

            loading.style.display =
                "none";

        }

        lista.innerHTML =
            "";

        if (empty) {

            empty.style.display =
                "block";

        }

    }


    // =====================================================
    // MOSTRAR ERRO
    // =====================================================

    function mostrarErro(mensagem) {

        if (loading) {

            loading.style.display =
                "none";

        }

        if (empty) {

            empty.style.display =
                "none";

        }

        if (lista) {

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


            const retryButton =
                document.getElementById(
                    "retryCharactersButton"
                );


            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    carregarFichas
                );

            }

        }

    }


    // =====================================================
    // CARREGAR FICHAS
    // =====================================================

    async function carregarFichas() {

        console.log(
            "🔎 Carregando fichas..."
        );


        mostrarCarregando();


        try {

            console.log(
                "🔎 Procurando fichas com user_id:",
                user.id
            );


            const {
                data,
                error
            } =
                await supabaseClient

                    .from("characters")

                    .select(
                        "id,name,age,race,class,power,updated_at,created_at"
                    )

                    .eq(
                        "user_id",
                        user.id
                    )

                    .order(
                        "updated_at",
                        {
                            ascending: false
                        }
                    );


            console.log(
                "📦 Fichas retornadas:",
                data
            );


            console.log(
                "❌ Erro retornado:",
                error
            );


            // =============================================
            // ERRO DO SUPABASE
            // =============================================

            if (error) {

                console.error(
                    "❌ Erro ao carregar fichas:",
                    error
                );


                mostrarErro(
                    error.message ||
                    "Erro ao consultar suas fichas."
                );


                return;

            }


            // =============================================
            // NENHUMA FICHA
            // =============================================

            if (
                !data ||
                data.length === 0
            ) {

                console.log(
                    "📭 Nenhuma ficha encontrada."
                );


                mostrarVazio();


                return;

            }


            // =============================================
            // TEM FICHAS
            // =============================================

            console.log(
                `✅ ${data.length} ficha(s) encontrada(s).`
            );


            mostrarLista();


            lista.innerHTML =
                "";


            data.forEach(
                (ficha) => {

                    const card =
                        document.createElement(
                            "article"
                        );


                    card.className =
                        "character-card";


                    const nome =
                        escapeHTML(
                            ficha.name ||
                            "Sem nome"
                        );


                    const race =
                        escapeHTML(
                            ficha.race ||
                            "Sem raça"
                        );


                    const classe =
                        escapeHTML(
                            ficha.class ||
                            "Sem classe"
                        );


                    const poder =
                        escapeHTML(
                            ficha.power ||
                            "Sem poder"
                        );


                    let dataAtualizacao =
                        "Data desconhecida";


                    if (
                        ficha.updated_at
                    ) {

                        const dataObj =
                            new Date(
                                ficha.updated_at
                            );


                        if (
                            !Number.isNaN(
                                dataObj.getTime()
                            )
                        ) {

                            dataAtualizacao =
                                dataObj.toLocaleDateString(
                                    "pt-BR",
                                    {
                                        day:
                                            "2-digit",

                                        month:
                                            "2-digit",

                                        year:
                                            "numeric"
                                    }
                                );

                        }

                    }


                    card.innerHTML = `

                        <div class="character-card-content">

                            <div class="character-card-header">

                                <h3>
                                    ${nome}
                                </h3>

                            </div>


                            <div class="character-card-info">

                                <p>
                                    <strong>Raça:</strong>
                                    ${race}
                                </p>

                                <p>
                                    <strong>Classe:</strong>
                                    ${classe}
                                </p>

                                <p>
                                    <strong>Poder:</strong>
                                    ${poder}
                                </p>

                            </div>


                            <small>
                                Atualizada em
                                ${dataAtualizacao}
                            </small>

                        </div>

                        <div class="character-card-action">

                            <span>
                                Editar →
                            </span>

                        </div>

                    `;


                    // =====================================
                    // ABRIR FICHA
                    // =====================================

                    card.addEventListener(
                        "click",
                        () => {

                            console.log(
                                "📜 Abrindo ficha:",
                                ficha.id
                            );


                            // Guardar ID da ficha
                            localStorage.setItem(
                                "aerion_character_id",
                                ficha.id
                            );


                            // Não deixar rascunho
                            // antigo interferir
                            localStorage.removeItem(
                                "aerion_character_draft"
                            );


                            window.location.href =
                                "ficha.html";

                        }
                    );


                    // =====================================
                    // ACESSIBILIDADE
                    // =====================================

                    card.setAttribute(
                        "role",
                        "button"
                    );


                    card.setAttribute(
                        "tabindex",
                        "0"
                    );


                    card.addEventListener(
                        "keydown",
                        (event) => {

                            if (
                                event.key ===
                                    "Enter" ||
                                event.key ===
                                    " "
                            ) {

                                event.preventDefault();

                                card.click();

                            }

                        }
                    );


                    lista.appendChild(
                        card
                    );

                }
            );


        } catch (error) {

            console.error(
                "❌ Erro inesperado ao carregar fichas:",
                error
            );


            mostrarErro(
                "Ocorreu um erro inesperado ao carregar suas fichas."
            );

        }

    }


    // =====================================================
    // NOVA FICHA
    // =====================================================

    function criarNovaFicha() {

        console.log(
            "➕ Criando nova ficha."
        );


        // Remover ID de ficha existente
        localStorage.removeItem(
            "aerion_character_id"
        );


        // Remover rascunho antigo
        localStorage.removeItem(
            "aerion_character_draft"
        );


        window.location.href =
            "ficha.html";

    }


    // =====================================================
    // BOTÃO NOVA FICHA
    // =====================================================

    if (novo) {

        novo.addEventListener(
            "click",
            criarNovaFicha
        );

    }


    // =====================================================
    // BOTÃO CRIAR PRIMEIRA FICHA
    // =====================================================

    if (emptyNovo) {

        emptyNovo.addEventListener(
            "click",
            criarNovaFicha
        );

    }


    // =====================================================
    // BOTÃO VOLTAR
    // =====================================================

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "index.html";

            }
        );

    }


    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    await carregarFichas();

});