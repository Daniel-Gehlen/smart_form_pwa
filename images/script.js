// Database Helper para IndexedDB (Simplificado)
const DB_NAME = 'FormGeneratorDB';
const DB_VERSION = 1;
const FORMS_STORE = 'forms';
const SUBMISSIONS_STORE = 'submissions';

let db;

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(FORMS_STORE)) {
                db.createObjectStore(FORMS_STORE, { keyPath: 'id', autoIncrement: true });
                console.log(`${FORMS_STORE} object store created.`);
            }
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

async function addData(storeName, data) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllData(storeName) {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
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

// Simula integração com API (CEP/CNPJ)
async function simulateApiCall(fieldName, inputValue) {
    if (fieldName === 'cep' && inputValue.length === 8) {
        console.log(`Simulando busca de CEP para: ${inputValue}`);
        // Em um app real, você faria:
        // const response = await fetch(`https://viacep.com.br/ws/${inputValue}/json/`);
        // const data = await response.json();
        // console.log('Dados do CEP:', data);
        // Preencher outros campos se houver (ex: 'logradouro', 'bairro', 'localidade', 'uf')
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

let currentFormDefinition = []; // Array para guardar a definição dos campos do formulário atual

// Adiciona um novo campo ao construtor de formulários
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

    // Adiciona listener para o botão de remover
    fieldDiv.querySelector('.removeFieldBtn').addEventListener('click', () => {
        fieldDiv.remove();
    });
});

// Salva a definição do formulário
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
        loadFormsIntoSelector(); // Recarrega os formulários no seletor
    } catch (e) {
        alert('Erro ao salvar definição do formulário: ' + e);
        console.error('Error saving form definition:', e);
    }
});


// Carrega os formulários salvos no seletor
async function loadFormsIntoSelector() {
    formSelector.innerHTML = '<option value="">Selecione um formulário</option>'; // Limpa opções
    try {
        const forms = await getAllData(FORMS_STORE);
        forms.forEach(form => {
            const option = document.createElement('option');
            option.value = form.id;
            option.textContent = form.name;
            formSelector.appendChild(option);
        });
    } catch (e) {
        console.error('Error loading forms:', e);
    }
}

// Renderiza o formulário dinâmico baseado na seleção
formSelector.addEventListener('change', async (event) => {
    const formId = event.target.value;
    dynamicForm.innerHTML = '<button type="submit">Submeter</button>'; // Limpa e adiciona o botão de submissão

    if (!formId) return;

    try {
        const forms = await getAllData(FORMS_STORE);
        const selectedForm = forms.find(f => f.id == formId); // Usar == para comparar número e string

        if (selectedForm) {
            currentFormDefinition = selectedForm.fields; // Salva a definição para uso posterior
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
                // Insere antes do botão de submit
                dynamicForm.insertBefore(fieldDiv, dynamicForm.querySelector('button[type="submit"]'));
            });

            // Adiciona listeners para os botões de gerar senha
            document.querySelectorAll('.generate-password-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const inputField = e.target.previousElementSibling; // O input está antes do botão
                    if (inputField) {
                        inputField.value = generateStrongPassword();
                        alert('Senha forte gerada!');
                    }
                });
            });

            // Adiciona listeners para os botões de autocomplete de API
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
    loadSubmissions(); // Carrega as submissões para o formulário selecionado
});


// Lida com a submissão do formulário dinâmico
dynamicForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário

    const formData = {};
    let isValid = true;

    currentFormDefinition.forEach(field => {
        const inputElement = document.getElementById(field.name);
        if (inputElement) {
            const value = inputElement.value;
            // Validação simples de front-end
            if (field.required && !value) {
                alert(`O campo "${field.label}" é obrigatório.`);
                isValid = false;
                return;
            }
            if (field.type === 'email' && value && !value.includes('@')) {
                alert(`Por favor, insira um e-mail válido para "${field.label}".`);
                isValid = false;
                return;
            }
            formData[field.name] = value;
        }
    });

    if (!isValid) return;

    const selectedFormId = formSelector.value;
    if (!selectedFormId) {
        alert("Selecione um formulário para submeter.");
        return;
    }

    const submission = {
        formId: parseInt(selectedFormId),
        data: formData,
        submittedAt: new Date().toISOString()
    };

    try {
        await addData(SUBMISSIONS_STORE, submission);
        alert('Submissão salva com sucesso no IndexedDB!');
        dynamicForm.reset(); // Limpa o formulário
        loadSubmissions(); // Recarrega a lista de submissões
    } catch (e) {
        alert('Erro ao salvar submissão: ' + e);
        console.error('Error saving submission:', e);
    }
});

// Carrega e exibe as submissões
async function loadSubmissions() {
    submissionList.innerHTML = ''; // Limpa a lista
    const selectedFormId = formSelector.value;
    if (!selectedFormId) return;

    try {
        const allSubmissions = await getAllData(SUBMISSIONS_STORE);
        const filteredSubmissions = allSubmissions.filter(s => s.formId == selectedFormId);

        if (filteredSubmissions.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhuma submissão para este formulário.';
            submissionList.appendChild(li);
            return;
        }

        filteredSubmissions.forEach(sub => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>Submissão ID:</strong> ${sub.id}<br>
                <strong>Data:</strong> ${new Date(sub.submittedAt).toLocaleString()}<br>
                <strong>Dados:</strong> ${JSON.stringify(sub.data, null, 2)}
            `;
            submissionList.appendChild(li);
        });
    } catch (e) {
        console.error('Error loading submissions:', e);
    }
}

// Inicializa o banco de dados e carrega formulários ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    await openDb();
    loadFormsIntoSelector();
    // Você pode adicionar um formulário padrão inicial aqui se quiser.
    // Ex: await addData(FORMS_STORE, {name: 'Formulário Inicial', fields: [{name: 'name', label: 'Seu Nome', type: 'text', required: true}]});
    // loadFormsIntoSelector();
});
