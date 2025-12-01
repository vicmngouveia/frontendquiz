// App QuizMaster — Material Design Edition
// Depende do Parse SDK, styles.css e Bootstrap para funcionar.

// ===============================================
// 1. INICIALIZAÇÃO DO PARSE SDK (BACK4APP)
// CONEXÃO COM O BACK-END
// ===============================================

// Chaves do seu Back4App (Mantidas por estarem corretas)
Parse.initialize(
    "D09nGo04noZxLGi4hzNVrnv26cPJL8JJnW5KgDn1", // Seu Application ID
    "xDPoYuJAun9bHW1J3cvfizSWzT9JWLS4EcgXCDd3"  // Sua JavaScript Key
);
Parse.serverURL = 'https://parseapi.back4app.com/';

// ===============================================
// 2. VARIÁVEIS GLOBAIS DE ESTADO E DATA
// ===============================================

const app = document.getElementById("app");
let quizzesPorCategoria = {};
let currentQuiz = [];
let currentIndex = 0;
let score = 0;
let isLoading = true; // Novo estado para saber se os dados carregaram

// ===============================================
// 3. FUNÇÃO PARA BUSCAR AS PERGUNTAS DA CLASSE "Pergunta"
// ===============================================

async function buscarPerguntas() {
    isLoading = true; // Indica carregamento
    
    // Mostra um estado de carregamento enquanto busca
    app.innerHTML = `<div class="page-container text-center"><div class="card-custom"><h2 class="fw-bold">Carregando Perguntas...</h2><div class="spinner-border text-info mt-3" role="status"></div></div></div>`;

    try {
        const PerguntaClasse = Parse.Object.extend("Pergunta");
        const query = new Parse.Query(PerguntaClasse);
        
        // Fetch data
        const resultados = await query.find();
        console.log("SUCESSO: Perguntas carregadas do Back4App:", resultados);
        
        // Loga a estrutura do primeiro objeto para debug (ajustado para os nomes reais)
        if (resultados.length > 0) {
            console.log("ESTRUTURA DA PERGUNTA (NOMES REAIS):", {
                texto: resultados[0].get("texto"),
                opcoes: resultados[0].get("opcoes"),
                correta: resultados[0].get("correta"),
                tema: resultados[0].get("tema")
            });
        }

        // Organiza as perguntas por categoria usando a coluna 'tema'
        quizzesPorCategoria = resultados.reduce((acc, pergunta) => {
            // USANDO O NOME DA SUA COLUNA: 'tema'
            const categoria = pergunta.get("tema") || "Geral"; 
            if (!acc[categoria]) {
                acc[categoria] = [];
            }
            acc[categoria].push(pergunta);
            return acc;
        }, {});

        isLoading = false; // Carregamento concluído
        renderLogin(); // Renderiza a tela de login AGORA que os dados estão prontos

    } catch (error) {
        console.error("FALHA: Erro ao carregar perguntas do Back4App: ", error);
        isLoading = false;
        app.innerHTML = `<div class="page-container text-center"><div class="card-custom"><h2 class="fw-bold text-danger">Erro de Conexão</h2><p>Não foi possível carregar o quiz. Verifique as permissões da classe "Pergunta" no Back4App.</p><p class="text-muted">Detalhes do Erro: ${error.message}</p></div></div>`;
    }
}


// ===============================================
// 4. LÓGICA DE RENDERIZAÇÃO E DO QUIZ (AJUSTADA AOS SEUS DADOS)
// ===============================================

function materialHeader(title) {
    return `<h2 class="fw-bold text-center mb-4">${title}</h2>`;
}

function renderLogin(message = '') {
    app.innerHTML = `
        <div class="page-container">
            <div class="card-custom">
                ${materialHeader("QuizMaster")}
                ${message ? `<div class="alert alert-danger p-2 mb-3 text-center">${message}</div>` : ''}
                <input id="loginUser" class="form-control mb-2" placeholder="Usuário" />
                <input id="loginPass" type="password" class="form-control mb-3" placeholder="Senha" />
                <button class="btn btn-main w-100 mb-3" onclick="login()">Entrar</button>
                <p class="text-center">Não tem conta? 
                    <span class="text-info" onclick="renderRegister()" style="cursor:pointer;">Registrar</span>
                </p>
            </div>
        </div>
    `;
}

function renderRegister() {
    // ... (sua função renderRegister() não precisa de modificações)
    app.innerHTML = `
        <div class="page-container">
            <div class="card-custom">
                ${materialHeader("Criar Conta")}
                <input id="regUser" class="form-control mb-2" placeholder="Usuário" />
                <input id="regPass" type="password" class="form-control mb-3" placeholder="Senha" />
                <button class="btn btn-main w-100 mb-3" onclick="register()">Registrar</button>
                <p class="text-center">Já tem conta?
                    <span class="text-info" onclick="renderLogin()" style="cursor:pointer;">Entrar</span>
                </p>
            </div>
        </div>
    `;
}

function renderHome() {
    // Verifica se os dados carregaram. Se não, mostra o loading.
    if (isLoading) {
        // Se ainda estiver carregando, chama o buscador novamente para esperar a conclusão
        buscarPerguntas(); 
        return; 
    }

    // Cria os botões dinamicamente a partir das categorias carregadas
    const categoryButtons = Object.keys(quizzesPorCategoria).map(category => `
        <button class="btn btn-main w-100 mb-2" onclick="startQuiz('${category}')">${category.charAt(0).toUpperCase() + category.slice(1)}</button>
    `).join('');

    app.innerHTML = `
        <div class="page-container">
            <div class="card-custom">
                ${materialHeader("Escolha o Quiz")}
                ${categoryButtons}
                <button class="btn btn-secondary w-100 mt-3" onclick="logout()">Sair</button>
            </div>
        </div>
    `;
}

function startQuiz(category) {
    currentQuiz = quizzesPorCategoria[category] || [];
    
    // CORREÇÃO: Tratamento de categoria vazia
    if (currentQuiz.length === 0) {
        app.innerHTML = `
            <div class="page-container text-center">
                <div class="card-custom">
                    <h2 class="fw-bold text-warning">Atenção!</h2>
                    <p>Nenhuma pergunta encontrada para a categoria <strong>${category}</strong>.</p>
                    <p class="text-muted">Verifique se a coluna 'tema' na sua classe 'Pergunta' no Back4App está preenchida corretamente para esta categoria.</p>
                    <button class="btn btn-main mt-3 w-100" onclick="renderHome()">Voltar</button>
                </div>
            </div>
        `;
        return; // Interrompe a função aqui
    }
    
    currentIndex = 0;
    score = 0;
    renderQuestion();
}

function renderQuestion() {
    if (currentIndex >= currentQuiz.length) return showScore();

    const q = currentQuiz[currentIndex];

    // USANDO OS NOMES REAIS DAS SUAS COLUNAS: 'texto', 'opcoes', 'correta'
    const questionText = q.get('texto') || 'Texto da pergunta não encontrado.'; 
    const optionsArray = q.get('opcoes') || [];
    
    // VERIFICADOR DE DADOS: Se a array de opções estiver vazia, mostra erro.
    if (!optionsArray || optionsArray.length === 0) {
        app.innerHTML = `
            <div class="page-container text-center">
                <div class="card-custom">
                    <h2 class="fw-bold text-danger">Erro de DADOS (opções)!</h2>
                    <p>A pergunta "${questionText.substring(0, 30)}..." não possui opções de resposta válidas.</p>
                    <p class="text-muted">Verifique a coluna <strong>opcoes</strong> no Back4App para esta linha e certifique-se de que é uma Array de Strings.</p>
                    <button class="btn btn-main mt-3 w-100" onclick="renderHome()">Voltar ao Início</button>
                </div>
            </div>
        `;
        console.error("ERRO DE DADOS: A array 'opcoes' está vazia ou não é uma array para a pergunta:", q.get('texto'));
        return;
    }


    const optionsHtml = optionsArray.map((option, index) => {
        // Chamamos a função answer com o índice da opção clicada
        return `<div class="quiz-option" onclick="answer(${index})">${option}</div>`;
    }).join('');


    app.innerHTML = `
        <div class="page-container">
            <div class="card-custom">
                <p class="text-muted text-end">Pergunta ${currentIndex + 1} / ${currentQuiz.length}</p>
                <h4 class="mb-4">${questionText}</h4>
                ${optionsHtml}
            </div>
        </div>
    `;
}

// CORRIGIDA a função answer para usar o valor da string 'correta'
function answer(selectedIndex) {
    const q = currentQuiz[currentIndex];
    const optionsArray = q.get('opcoes');

    // USANDO O NOME DA SUA COLUNA: 'correta'
    // O valor 'correta' (String) é a resposta final (ex: "Thriller", "Argentina")
    const correctValue = q.get('correta'); 
    
    // Pegamos a opção que o usuário clicou (ex: "Thriller")
    const selectedValue = optionsArray[selectedIndex];

    // Compara o valor clicado com a resposta correta
    if (selectedValue === correctValue) {
        score++;
    }
    
    currentIndex++;
    renderQuestion();
}

function showScore() {
    // ... (sua função showScore() não precisa de modificações)
    app.innerHTML = `
        <div class="page-container">
            <div class="card-custom text-center">
                ${materialHeader("Resultado")}
                <h3 class="mb-4">Você fez <span class="text-info">${score}</span> pontos!</h3>
                <button class="btn btn-main w-100" onclick="renderHome()">Voltar ao início</button>
            </div>
        </div>
    `;
}

// Função de Logout (apenas limpa o local storage e volta ao login)
async function logout() {
    await Parse.User.logOut();
    renderLogin();
}


// AUTENTICAÇÃO SIMPLIFICADA (SUBSTITUINDO ALERT)
// A ideal seria usar Parse.User.signUp e Parse.User.logIn

async function register() {
     const username = document.getElementById("regUser").value;
    const password = document.getElementById("regPass").value;

    if (!username || !password) {
        renderRegister("Preencha todos os campos.");
        return;
    }

    const user = new Parse.User();
    user.set("username", username);
    user.set("password", password);

    try {
        await user.signUp();
        renderLogin("Conta criada com sucesso! Faça o login.");
    } catch (err) {
        renderRegister("Erro: " + err.message);
    }
}

async function login() {
     const username = document.getElementById("loginUser").value;
    const password = document.getElementById("loginPass").value;

    try {
        await Parse.User.logIn(username, password);
        renderHome();
    } catch (err) {
        renderLogin("Usuário ou senha incorretos!");
    }
}

// ===============================================
// 5. INÍCIO DA APLICAÇÃO
// ===============================================

// 1. Inicia o processo de busca das perguntas em segundo plano.
// O renderLogin() será chamado DENTRO do buscarPerguntas() após o sucesso.
buscarPerguntas();

// 2. Garante que, se o loading for rápido, o login ainda apareça.
// Se o carregamento for lento, a tela de loading já está no DOM.
if (!isLoading) {
    renderLogin();
}
