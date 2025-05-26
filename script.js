// Database Helper para IndexedDB
const DB_NAME = 'FormGeneratorDB';
const DB_VERSION = 1;
const FORMS_STORE = 'forms';
const SUBMISSIONS_STORE = 'submissions';

let db;

// Abre ou cria o banco de dados IndexedDB
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Cria a object store 'forms' se não existir
            if (!db.objectStoreNames.contains(FORMS_STORE)) {
                db.createObjectStore(FORMS_STORE, { keyPath: 'id', autoIncrement: true });
                console.log(`${FORMS_STORE} object store created.`);
            }
            // Cria a object store 'submissions' se não existir
            if (!db.objectStoreNames.contains(SUBMISSIONS_STORE)) {
                db.createObjectStore(SUBMISSIONS_STORE, { keyPath: 'id', autoIncrement: true });
                console.log(`${SUBMISSIONS_STORE} object store created.`);
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Adiciona um novo dado a uma object store
async function addData(storeName, data) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtém todos os dados de uma object store
async function getAllData(storeName) {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Deleta um dado por ID de uma object store
async function deleteData(storeName, id) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
            console.log(`Item com ID ${id} deletado de ${storeName}`);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}


// --- Funções Auxiliares ---

// Gera uma senha forte aleatória
function generateStrongPassword(length = 12) {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
    const allChars = lower + upper + digits + special;

    let password = '';
    // Garante pelo menos um de cada tipo
    password += lower[Math.floor(Math.random() * lower.length)];
    password += upper[Math.floor(Math.random() * upper.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Preenche o restante com caracteres aleatórios
    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralha a senha para maior aleatoriedade
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    return password;
}

// Simula integração com API externa (CEP/CNPJ)
async function simulateApiCall(fieldName, inputValue) {
    if (fieldName === 'cep' && inputValue.length === 8) {
        console.log(`Simulando busca de CEP para: ${inputValue}`);
        // Em um app real, você faria uma requisição fetch para uma API de CEP, ex:
        // const response = await fetch(`https://viacep.com.br/ws/${inputValue}/json/`);
        // const data = await response.json();
        // if (!data.erro) { /* preencher campos como bairro, cidade, estado */ }
        alert(`Simulando busca de CEP para ${inputValue}... (API real não conectada)`);
    } else if (fieldName === 'cnpj' && inputValue.length === 14) {
        console.log(`Simulando busca de CNPJ para: ${inputValue}`);
        // Similarmente para CNPJ, usar uma API pública
        alert(`Simulando busca de CNPJ para ${inputValue}... (API real não conectada)`);
    }
}

// --- Lógica de UI ---

const formFieldsContainer = document.getElementById('form-fields-container');
const addFieldBtn = document.getElementById('addFieldBtn');
const saveFormDefinitionBtn = document.getElementById('saveFormDefinitionBtn');
const formSelector = document.getElementById('formSelector');
const dynamicForm = document.getElementById('dynamicForm');
const submissionList = document.getElementById('submissionList');
const managedFormList = document.getElementById('managedFormList'); // Referência ao elemento da lista de gerenciamento

let currentFormDefinition = []; // Armazena a definição do formulário atualmente selecionado para preenchimento

// Adiciona um novo campo ao construtor de formulários na seção "Criar Novo Formulário"
addFieldBtn.addEventListener('click', () => {
    const fieldId = `field-${Date.now()}`;
    const fieldDiv = document.createElement('div');
    fieldDiv.classList.add('form-field-item');
    fieldDiv.innerHTML = `
        <label for="${fieldId}-name">Nome:</label>
        <input type="text" id="${fieldId}-name" placeholder="Nome do Campo (ex: email)" data-type="name" required>
        <label for="${fieldId}-label">Rótulo:</label>
        <input type="text" id="${fieldId}-label" placeholder="Rótulo (ex: Endereço de Email)" data-type="label" required>
        <label for="${fieldId}-type">Tipo:</label>
        <select id="${fieldId}-type" data-type="type">
            <option value="text">Texto</option>
            <option value="email">Email</option>
            <option value="password">Senha</option>
            <option value="number">Número</option>
            <option value="cep">CEP (com API)</option>
            <option value="cnpj">CNPJ (com API)</option>
        </select>
        <label for="${fieldId}-required">Obrigatório?</label>
        <input type="checkbox" id="${fieldId}-required" data-type="required">
        <button class="removeFieldBtn" title="Remover Campo">X</button>
    `;
    formFieldsContainer.appendChild(fieldDiv);

    // Adiciona listener para o botão de remover o campo do construtor
    fieldDiv.querySelector('.removeFieldBtn').addEventListener('click', () => {
        fieldDiv.remove();
    });
});

// Salva a definição do formulário no IndexedDB
saveFormDefinitionBtn.addEventListener('click', async () => {
    const formName = prompt("Qual o nome deste formulário?");
    if (!formName) {
        alert("Nome do formulário é obrigatório!");
        return;
    }

    const fields = [];
    document.querySelectorAll('.form-field-item').forEach(item => {
        const name = item.querySelector('[data-type="name"]').value;
        const label = item.querySelector('[data-type="label"]').value;
        const type = item.querySelector('[data-type="type"]').value;
        const required = item.querySelector('[data-type="required"]').checked;

        if (name && label && type) {
            fields.push({ name, label, type, required });
        }
    });

    if (fields.length === 0) {
        alert("Adicione pelo menos um campo ao formulário.");
        return;
    }

    const formDefinition = {
        name: formName,
        fields: fields
    };

    try {
        await addData(FORMS_STORE, formDefinition);
        alert('Definição do formulário salva com sucesso!');
        loadFormsIntoSelector(); // Atualiza o dropdown de seleção de formulários
        renderManagedForms();   // Atualiza a lista de gerenciamento de formulários
    } catch (e) {
        alert('Erro ao salvar definição do formulário: ' + e);
        console.error('Error saving form definition:', e);
    }
});


// Carrega os formulários salvos no seletor de "Preencher Formulário"
async function loadFormsIntoSelector() {
    formSelector.innerHTML = '<option value="">Selecione um formulário</option>'; // Limpa opções existentes
    try {
        const forms = await getAllData(FORMS_STORE);
        forms.forEach(form => {
            const option = document.createElement('option');
            option.value = form.id;
            option.textContent = form.name;
            formSelector.appendChild(option);
        });
    } catch (e) {
        console.error('Error loading forms into selector:', e);
    }
}

// Renderiza a lista de formulários para gerenciamento (exclusão) na seção "Gerenciar Formulários Existentes"
async function renderManagedForms() {
    managedFormList.innerHTML = ''; // Limpa a lista existente
    try {
        const forms = await getAllData(FORMS_STORE);
        if (forms.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum formulário criado ainda.';
            managedFormList.appendChild(li);
            return;
        }

        forms.forEach(form => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${form.name}</span>
                <button class="delete-form-btn" data-form-id="${form.id}">Apagar</button>
            `;
            managedFormList.appendChild(li);
        });

        // Adiciona listeners aos botões de exclusão de formulário
        document.querySelectorAll('.delete-form-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const formId = parseInt(event.target.dataset.formId);
                // Confirmação antes de apagar
                if (confirm(`Tem certeza que deseja apagar o formulário "${event.target.previousElementSibling.textContent}"? Isso também apagará TODAS as submissões associadas a ele.`)) {
                    try {
                        // Apaga todas as submissões associadas a este formulário primeiro
                        const allSubmissions = await getAllData(SUBMISSIONS_STORE);
                        const submissionsToDelete = allSubmissions.filter(s => s.formId === formId);
                        for (const sub of submissionsToDelete) {
                            await deleteData(SUBMISSIONS_STORE, sub.id);
                        }

                        // Agora apaga a definição do formulário
                        await deleteData(FORMS_STORE, formId);
                        alert('Formulário e suas submissões apagados com sucesso!');

                        // Atualiza todas as UIs afetadas
                        loadFormsIntoSelector();
                        renderManagedForms();
                        
                        // Se o formulário excluído era o que estava selecionado para preencher, limpa essa seção
                        if (formSelector.value == formId) {
                            formSelector.value = ''; // Desseleciona o formulário
                            dynamicForm.innerHTML = '<button type="submit">Submeter</button>'; // Limpa o formulário de preenchimento
                            submissionList.innerHTML = ''; // Limpa as submissões exibidas
                        }
                    } catch (e) {
                        alert('Erro ao apagar formulário: ' + e);
                        console.error('Error deleting form:', e);
                    }
                }
            });
        });

    } catch (e) {
        console.error('Error rendering managed forms:', e);
    }
}


// Lida com a seleção de um formulário no dropdown e o renderiza para preenchimento
formSelector.addEventListener('change', async (event) => {
    const formId = event.target.value;
    dynamicForm.innerHTML = '<button type="submit">Submeter</button>'; // Limpa o formulário anterior e mantém o botão de submit

    if (!formId) {
        submissionList.innerHTML = ''; // Limpa submissões se nenhum formulário estiver selecionado
        return;
    }

    try {
        const forms = await getAllData(FORMS_STORE);
        const selectedForm = forms.find(f => f.id == formId); // Compara ID numérico com string (ID do select)

        if (selectedForm) {
            currentFormDefinition = selectedForm.fields; // Armazena a definição do formulário selecionado
            selectedForm.fields.forEach(field => {
                const fieldDiv = document.createElement('div');
                fieldDiv.classList.add('dynamic-form-field');
                let inputHtml = '';
                if (field.type === 'password') {
                    inputHtml = `
                        <input type="password" id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                        <button type="button" class="generate-password-btn" title="Gerar Senha">🔑</button>
                    `;
                } else {
                    inputHtml = `
                        <input type="${field.type}" id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                    `;
                    // Adiciona funcionalidade de API para CEP/CNPJ
                    if (field.type === 'cep' || field.type === 'cnpj') {
                        inputHtml += `
                            <button type="button" class="api-autocomplete-btn" data-field-name="${field.name}" title="Buscar Dados">🔎</button>
                        `;
                    }
                }
                fieldDiv.innerHTML = `
                    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}:</label>
                    ${inputHtml}
                `;
                // Insere o campo antes do botão de submit do formulário dinâmico
                dynamicForm.insertBefore(fieldDiv, dynamicForm.querySelector('button[type="submit"]'));
            });

            // Adiciona listeners para os botões de gerar senha nos campos de senha
            document.querySelectorAll('.generate-password-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const inputField = e.target.previousElementSibling;
                    if (inputField) {
                        inputField.value = generateStrongPassword();
                        alert('Senha forte gerada!');
                    }
                });
            });

            // Adiciona listeners para os botões de autocomplete de API (CEP/CNPJ)
            document.querySelectorAll('.api-autocomplete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const fieldName = e.target.dataset.fieldName;
                    const inputField = e.target.previousElementSibling;
                    if (inputField && fieldName) {
                        simulateApiCall(fieldName, inputField.value);
                    }
                });
            });

        }
    } catch (e) {
        console.error('Error rendering form:', e);
    }
    loadSubmissions(); // Carrega as submissões para o formulário recém-selecionado
});


// Lida com a submissão de um formulário preenchido
dynamicForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário (que recarregaria a página)

    const formData = {};
    let isValid = true;

    // Coleta e valida os dados dos campos do formulário
    currentFormDefinition.forEach(field => {
        const inputElement = document.getElementById(field.name);
        if (inputElement) {
            const value = inputElement.value;
            // Validação básica de front-end
            if (field.required && !value) {
                alert(`O campo "${field.label}" é obrigatório.`);
                isValid = false;
                return; // Sai deste forEach se houver um erro de validação
            }
            if (field.type === 'email' && value && !value.includes('@')) {
                alert(`Por favor, insira um e-mail válido para "${field.label}".`);
                isValid = false;
                return;
            }
            formData[field.name] = value;
        }
    });

    if (!isValid) return; // Se a validação falhou, não prossegue

    const selectedFormId = formSelector.value;
    if (!selectedFormId) {
        alert("Selecione um formulário para submeter.");
        return;
    }

    // Cria o objeto de submissão para ser salvo
    const submission = {
        formId: parseInt(selectedFormId), // Associa a submissão ao ID do formulário
        data: formData,
        submittedAt: new Date().toISOString() // Data e hora da submissão
    };

    try {
        await addData(SUBMISSIONS_STORE, submission);
        alert('Submissão salva com sucesso no IndexedDB!');
        dynamicForm.reset(); // Limpa os campos do formulário após a submissão
        loadSubmissions(); // Recarrega a lista de submissões para exibir a nova
    } catch (e) {
        alert('Erro ao salvar submissão: ' + e);
        console.error('Error saving submission:', e);
    }
});

// Carrega e exibe as submissões para o formulário selecionado
async function loadSubmissions() {
    submissionList.innerHTML = ''; // Limpa a lista de submissões existente
    const selectedFormId = formSelector.value;
    if (!selectedFormId) return; // Não faz nada se nenhum formulário estiver selecionado

    try {
        const allSubmissions = await getAllData(SUBMISSIONS_STORE);
        // Filtra as submissões para mostrar apenas as do formulário atualmente selecionado
        const filteredSubmissions = allSubmissions.filter(s => s.formId == selectedFormId);

        if (filteredSubmissions.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhuma submissão para este formulário.';
            submissionList.appendChild(li);
            return;
        }

        // Renderiza cada submissão com um botão de exclusão
        filteredSubmissions.forEach(sub => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>Submissão ID:</strong> ${sub.id}<br>
                <strong>Data:</strong> ${new Date(sub.submittedAt).toLocaleString()}<br>
                <strong>Dados:</strong> ${JSON.stringify(sub.data, null, 2)}
                <button class="delete-submission-btn" data-submission-id="${sub.id}">Apagar Submissão</button>
            `;
            submissionList.appendChild(li);
        });

        // Adiciona listeners para os botões de exclusão de submissão
        document.querySelectorAll('.delete-submission-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const submissionId = parseInt(event.target.dataset.submissionId);
                // Confirmação antes de apagar
                if (confirm(`Tem certeza que deseja apagar esta submissão (ID: ${submissionId})?`)) {
                    try {
                        await deleteData(SUBMISSIONS_STORE, submissionId);
                        alert('Submissão apagada com sucesso!');
                        loadSubmissions(); // Recarrega a lista para remover a submissão deletada
                    } catch (e) {
                        alert('Erro ao apagar submissão: ' + e);
                        console.error('Error deleting submission:', e);
                    }
                }
            });
        });

    } catch (e) {
        console.error('Error loading submissions:', e);
    }
}

// Inicializa o banco de dados e carrega as UIs relevantes ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    await openDb(); // Garante que o IndexedDB está aberto
    loadFormsIntoSelector(); // Popula o dropdown de seleção de formulários
    renderManagedForms(); // Popula a lista de gerenciamento de formulários
});
