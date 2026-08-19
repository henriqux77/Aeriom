"js/fichas.js"

// ========================================
// AERION - LISTA DE FICHAS
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // ========================================
        // ELEMENTOS
        // ========================================

        const charactersList =
            document.getElementById(
                "charactersList"
            );

        const loadingCharacters =
            document.getElementById(
                "loadingCharacters"
            );

        const emptyCharacters =
            document.getElementById(
                "emptyCharacters"
            );

        const userEmail =
            document.getElementById(
                "userEmail"
            );

        const newCharacterButton =
            document.getElementById(
                "newCharacterButton"
            );

        const emptyNewCharacterButton =
            document.getElementById(
                "emptyNewCharacterButton"
            );

        const backButton =
            document.getElementById(
                "backButton"
            );


        // ========================================
        // VERIFICAR SUPABASE
        // ========================================

        if (!window.supabaseClient) {

            console.error(
                "❌ Supabase não encontrado."
            );

            if (loadingCharacters) {

                loadingCharacters.textContent =
                    "Erro ao conectar ao servidor.";

            }

            return;

        }


        // ========================================
        // VERIFICAR USUÁRIO
        // ========================================

        const {
            data: { user },
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (userError) {

            console.error(
                "❌ Erro ao verificar usuário:",
                userError
            );

            window.location.href =
                "index.html";

            return;

        }


        if (!user) {

            console.log(
                "Nenhum usuário conectado."
            );

            window.location.href =
                "index.html";

            return;

        }


        // ========================================
        // MOSTRAR E-MAIL
        // ========================================

        if (userEmail) {

            userEmail.textContent =
                user.email || "Usuário";

        }


        // ========================================
        // BUSCAR FICHAS
        // ========================================

        async function carregarFichas() {

            if (loadingCharacters) {

                loadingCharacters.style.display =
                    "block";

                loadingCharacters.textContent =
                    "Carregando suas fichas...";

            }


            if (charactersList) {

                charactersList.innerHTML = "";

            }


            if (emptyCharacters) {

                emptyCharacters.style.display =
                    "none";

            }


            const {
                data: characters,
                error
            } =
                await supabaseClient
                    .from("characters")
                    .select("*")
                    .eq("user_id", user.id)
                    .order(
                        "updated_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {

                console.error(
                    "❌ Erro ao buscar fichas:",
                    error
                );


                if (loadingCharacters) {

                    loadingCharacters.textContent =
                        "Não foi possível carregar suas fichas.";

                }

                return;

            }


            if (loadingCharacters) {

                loadingCharacters.style.display =
                    "none";

            }


            // ========================================
            // NENHUMA FICHA
            // ========================================

            if (
                !characters ||
                characters.length === 0
            ) {

                if (emptyCharacters) {

                    emptyCharacters.style.display =
                        "block";

                }

                return;

            }


            // ========================================
            // RENDERIZAR FICHAS
            // ========================================

            characters.forEach(
                (character) => {

                    criarCard(character);

                }
            );

        }


        // ========================================
        // CRIAR CARD
        // ========================================

        function criarCard(character) {

            if (!charactersList) {

                return;

            }


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "character-card";


            const updatedDate =
                formatarData(
                    character.updated_at
                );


            card.innerHTML = `

                <div class="character-card-header">

                    <div class="character-avatar">

                        ${escapeHTML(
                            obterInicial(
                                character.name
                            )
                        )}

                    </div>


                    <div class="character-card-title">

                        <h3>
                            ${escapeHTML(
                                character.name ||
                                "Sem nome"
                            )}
                        </h3>

                        <span>
                            Última atualização:
                            ${escapeHTML(
                                updatedDate
                            )}
                        </span>

                    </div>

                </div>


                <div class="character-card-info">

                    <div class="character-info-item">

                        <span>Raça</span>

                        <strong>
                            ${escapeHTML(
                                character.race ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div class="character-info-item">

                        <span>Classe</span>

                        <strong>
                            ${escapeHTML(
                                character.class ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div class="character-info-item">

                        <span>Poder</span>

                        <strong>
                            ${escapeHTML(
                                character.power ||
                                "—"
                            )}
                        </strong>

                    </div>


                    <div class="character-info-item">

                        <span>Mana</span>

                        <strong>
                            ${escapeHTML(
                                obterMana(
                                    character.mana
                                )
                            )}
                        </strong>

                    </div>

                </div>


                <div class="character-card-actions">

                    <button
                        type="button"
                        class="primary-button"
                        data-open-character="${escapeHTML(
                            character.id
                        )}"
                    >
                        Abrir ficha
                    </button>


                    <button
                        type="button"
                        class="secondary-button"
                        data-delete-character="${escapeHTML(
                            character.id
                        )}"
                    >
                        Excluir
                    </button>

                </div>

            `;


            charactersList.appendChild(
                card
            );


            // ========================================
            // ABRIR FICHA
            // ========================================

            const openButton =
                card.querySelector(
                    "[data-open-character]"
                );


            if (openButton) {

                openButton.addEventListener(
                    "click",
                    () => {

                        const characterId =
                            openButton.dataset
                                .openCharacter;


                        abrirFicha(
                            characterId
                        );

                    }
                );

            }


            // ========================================
            // EXCLUIR FICHA
            // ========================================

            const deleteButton =
                card.querySelector(
                    "[data-delete-character]"
                );


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    async () => {

                        const characterId =
                            deleteButton.dataset
                                .deleteCharacter;


                        await excluirFicha(
                            characterId
                        );

                    }
                );

            }

        }


        // ========================================
        // ABRIR FICHA
        // ========================================

        function abrirFicha(characterId) {

            if (!characterId) {

                return;

            }


            /*
                Guardamos o ID para que a ficha.html
                saiba qual personagem carregar.
            */

            localStorage.setItem(
                "aerion_character_id",
                characterId
            );


            window.location.href =
                "ficha.html";

        }


        // ========================================
        // EXCLUIR FICHA
        // ========================================

        async function excluirFicha(characterId) {

            if (!characterId) {

                return;

            }


            const confirmed =
                confirm(
                    "Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
                );


            if (!confirmed) {

                return;

            }


            const {
                error
            } =
                await supabaseClient
                    .from("characters")
                    .delete()
                    .eq("id", characterId)
                    .eq("user_id", user.id);


            if (error) {

                console.error(
                    "❌ Erro ao excluir ficha:",
                    error
                );


                alert(
                    "Não foi possível excluir a ficha."
                );

                return;

            }


            console.log(
                "🗑️ Ficha excluída:",
                characterId
            );


            await carregarFichas();

        }


        // ========================================
        // NOVA FICHA
        // ========================================

        function novaFicha() {

            localStorage.removeItem(
                "aerion_character_id"
            );


            localStorage.removeItem(
                "aerion_character_draft"
            );


            window.location.href =
                "ficha.html";

        }


        if (newCharacterButton) {

            newCharacterButton.addEventListener(
                "click",
                novaFicha
            );

        }


        if (emptyNewCharacterButton) {

            emptyNewCharacterButton.addEventListener(
                "click",
                novaFicha
            );

        }


        // ========================================
        // VOLTAR
        // ========================================

        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "index.html";

                }
            );

        }


        // ========================================
        // UTILITÁRIOS
        // ========================================

        function obterInicial(name) {

            if (!name) {

                return "?";

            }


            return name
                .trim()
                .charAt(0)
                .toUpperCase();

        }


        function obterMana(mana) {

            if (!mana) {

                return "—";

            }


            if (
                typeof mana === "string"
            ) {

                return mana;

            }


            return mana.color || "—";

        }


        function formatarData(date) {

            if (!date) {

                return "—";

            }


            const parsed =
                new Date(date);


            if (
                Number.isNaN(
                    parsed.getTime()
                )
            ) {

                return "—";

            }


            return parsed.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

        }


        function escapeHTML(value) {

            return String(value)

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


        // ========================================
        // INICIAR
        // ========================================

        await carregarFichas();


        console.log(
            "🚀 fichas.js carregado corretamente."
        );

    }
);