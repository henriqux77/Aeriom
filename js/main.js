document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // BOTÕES EXISTENTES
    // =========================

    const menuButton =
        document.getElementById("menuButton");

    const profileButton =
        document.getElementById("profileButton");

    const createAccountButton =
        document.getElementById("createAccountButton");

    const loginButton =
        document.getElementById("loginButton");


    // =========================
    // ELEMENTOS DO PERFIL
    // =========================

    const profilePanel =
        document.getElementById("profilePanel");

    const closeProfile =
        document.getElementById("closeProfile");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const logoutButton =
        document.getElementById("logoutButton");

    const editProfileButton =
        document.getElementById("editProfileButton");


    // =========================
    // ESCONDER PERFIL
    // =========================

    if (profilePanel) {
        profilePanel.style.display = "none";
    }


    // =========================
    // RECUPERAR SESSÃO
    // =========================

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {

        console.error(
            "Erro ao recuperar sessão:",
            sessionError
        );

    } else if (session) {

        console.log(
            "Sessão recuperada com sucesso:",
            session.user.email
        );

    } else {

        console.log(
            "Nenhuma sessão encontrada."
        );

    }


    // =========================
    // BUSCAR PERFIL
    // =========================

    async function loadUserProfile(user) {

        if (!user) {
            return null;
        }


        const {
            data: profile,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Erro ao buscar perfil:",
                error
            );

            return null;
        }


        const googleName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Aventureiro";


        const googleAvatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            "assets/aerion-logo.png";


        return {

            name:
                profile?.display_name ||
                googleName,

            email:
                user.email ||
                "",

            avatar:
                profile?.avatar_url ||
                googleAvatar

        };

    }


    // =========================
    // BOTÃO DE PERFIL
    // =========================

    if (profileButton) {

        profileButton.addEventListener(
            "click",
            async () => {

                const {
                    data: { session },
                    error
                } = await supabaseClient.auth.getSession();


                if (error) {

                    console.error(
                        "Erro ao verificar sessão:",
                        error
                    );

                    return;
                }


                if (!session) {

                    console.log(
                        "Nenhum usuário está logado."
                    );

                    return;
                }


                const profile =
                    await loadUserProfile(session.user);


                if (!profile) {
                    return;
                }


                if (profileName) {

                    profileName.textContent =
                        profile.name;

                }


                if (profileEmail) {

                    profileEmail.textContent =
                        profile.email;

                }


                if (profileAvatar) {

                    profileAvatar.src =
                        profile.avatar;

                }


                if (profilePanel) {

                    profilePanel.style.display =
                        "flex";

                }

            }
        );

    }


    // =========================
    // FECHAR PERFIL
    // =========================

    if (closeProfile) {

        closeProfile.addEventListener(
            "click",
            () => {

                if (profilePanel) {

                    profilePanel.style.display =
                        "none";

                }

            }
        );

    }


    // =========================
    // SAIR DA CONTA
    // =========================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                const { error } =
                    await supabaseClient.auth.signOut();


                if (error) {

                    console.error(
                        "Erro ao sair da conta:",
                        error
                    );

                    return;
                }


                if (profilePanel) {

                    profilePanel.style.display =
                        "none";

                }


                console.log(
                    "Usuário saiu da conta."
                );

            }
        );

    }


    // =========================
    // EDITAR PERFIL
    // =========================

    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            () => {

                console.log(
                    "Editar perfil será implementado em breve."
                );

            }
        );

    }


   // =========================
// AUTENTICAÇÃO
// =========================

const authModal =
    document.getElementById("authModal");

const closeAuth =
    document.getElementById("closeAuth");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const discordLoginButton =
    document.getElementById("discordLoginButton");

const discordRegisterButton =
    document.getElementById("discordRegisterButton");

const emailLoginButton =
    document.getElementById("emailLoginButton");

const registerButton =
    document.getElementById("registerButton");

const showRegisterButton =
    document.getElementById("showRegisterButton");

const showLoginButton =
    document.getElementById("showLoginButton");

const authMessage =
    document.getElementById("authMessage");


// =========================
// ABRIR AUTENTICAÇÃO
// =========================

function openAuth() {

    if (authModal) {

        authModal.style.display = "flex";

    }

}


// =========================
// FECHAR AUTENTICAÇÃO
// =========================

function closeAuthModal() {

    if (authModal) {

        authModal.style.display = "none";

    }

}


if (closeAuth) {

    closeAuth.addEventListener(
        "click",
        closeAuthModal
    );

}


// =========================
// BOTÃO ENTRAR DA HOME
// =========================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        () => {

            loginForm.style.display = "block";
            registerForm.style.display = "none";

            authMessage.textContent = "";

            openAuth();

        }
    );

}


// =========================
// BOTÃO CRIAR CONTA DA HOME
// =========================

if (createAccountButton) {

    createAccountButton.addEventListener(
        "click",
        () => {

            loginForm.style.display = "none";
            registerForm.style.display = "block";

            authMessage.textContent = "";

            openAuth();

        }
    );

}


// =========================
// IR PARA CADASTRO
// =========================

if (showRegisterButton) {

    showRegisterButton.addEventListener(
        "click",
        () => {

            loginForm.style.display = "none";
            registerForm.style.display = "block";

            authMessage.textContent = "";

        }
    );

}


// =========================
// VOLTAR PARA LOGIN
// =========================

if (showLoginButton) {

    showLoginButton.addEventListener(
        "click",
        () => {

            registerForm.style.display = "none";
            loginForm.style.display = "block";

            authMessage.textContent = "";

        }
    );

}


// =========================
// DISCORD — LOGIN
// =========================

if (discordLoginButton) {

    discordLoginButton.addEventListener(
        "click",
        async () => {

            authMessage.textContent =
                "Conectando ao Discord...";


            const { error } =
                await supabaseClient
                    .auth
                    .signInWithOAuth({

                        provider: "discord",

                        options: {

                            redirectTo:
                                window.location.origin

                        }

                    });


            if (error) {

                console.error(
                    "Erro no Discord:",
                    error
                );

                authMessage.textContent =
                    "Não foi possível entrar com o Discord.";

            }

        }
    );

}


// =========================
// DISCORD — CADASTRO
// =========================

if (discordRegisterButton) {

    discordRegisterButton.addEventListener(
        "click",
        async () => {

            authMessage.textContent =
                "Conectando ao Discord...";


            const { error } =
                await supabaseClient
                    .auth
                    .signInWithOAuth({

                        provider: "discord",

                        options: {

                            redirectTo:
                                window.location.origin

                        }

                    });


            if (error) {

                console.error(
                    "Erro no Discord:",
                    error
                );

                authMessage.textContent =
                    "Não foi possível criar a conta com Discord.";

            }

        }
    );

}


// =========================
// LOGIN COM E-MAIL
// =========================

if (emailLoginButton) {

    emailLoginButton.addEventListener(
        "click",
        async () => {

            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            if (!email || !password) {

                authMessage.textContent =
                    "Preencha o e-mail e a senha.";

                return;

            }


            authMessage.textContent =
                "Entrando...";


            const {
                data,
                error
            } = await supabaseClient.auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


            if (error) {

                console.error(
                    "Erro no login:",
                    error
                );

                authMessage.textContent =
                    "E-mail ou senha incorretos.";

                return;

            }


            console.log(
                "Login realizado:",
                data.user.email
            );


            authMessage.textContent =
                "Login realizado com sucesso!";


            closeAuthModal();

        }
    );

}


// =========================
// CRIAR CONTA COM E-MAIL
// =========================

if (registerButton) {

    registerButton.addEventListener(
        "click",
        async () => {

            const email =
                document
                    .getElementById("registerEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("registerPassword")
                    .value;

            const confirmPassword =
                document
                    .getElementById("registerPasswordConfirm")
                    .value;


            if (!email ||
                !password ||
                !confirmPassword) {

                authMessage.textContent =
                    "Preencha todos os campos.";

                return;

            }


            if (password !== confirmPassword) {

                authMessage.textContent =
                    "As senhas não são iguais.";

                return;

            }


            if (password.length < 6) {

                authMessage.textContent =
                    "A senha precisa ter pelo menos 6 caracteres.";

                return;

            }


            authMessage.textContent =
                "Criando sua conta...";


            const {
                data,
                error
            } = await supabaseClient.auth
                .signUp({

                    email: email,

                    password: password

                });


            if (error) {

                console.error(
                    "Erro ao criar conta:",
                    error
                );

                authMessage.textContent =
                    error.message;

                return;

            }


            console.log(
                "Conta criada:",
                data
            );


            if (data.session) {

                authMessage.textContent =
                    "Conta criada com sucesso!";

                closeAuthModal();

            } else {

                authMessage.textContent =
                    "Conta criada! Verifique seu e-mail para confirmar.";

            }

        }
    );

}

    // =========================
    // MENU
    // =========================

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            () => {

                console.log(
                    "Menu do Aerion"
                );

            }
        );

    }


    // =========================
    // ALTERAÇÕES DE AUTENTICAÇÃO
    // =========================

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Evento de autenticação:",
                event
            );


            if (session) {

                console.log(
                    "Usuário autenticado:",
                    session.user.email
                );

            } else {

                console.log(
                    "Usuário não autenticado."
                );

            }

        }
    );

});
const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
        emailRedirectTo: window.location.origin
    }
});

if (error) {
    console.error("Erro ao criar conta:", error);
    alert(error.message);
    return;
}

console.log("Conta criada:", data);

if (data.user && !data.session) {
    alert("Conta criada! Verifique seu e-mail para confirmar a conta.");
}