const cepForm = document.getElementById('cepForm');
const enderecoForm = document.getElementById('enderecoForm');
const cepInput = document.getElementById('cepInput');
const ruaInput = document.getElementById('ruaInput');
const cidadeInput = document.getElementById('cidadeInput');
const ufInput = document.getElementById('ufInput');
const resultado = document.getElementById('resultado');
const historicoList = document.getElementById('historico');
const mapaContainer = document.getElementById('mapa-container');
const mapaDiv = document.getElementById('mapa');
const tabBtns = document.querySelectorAll('.tab-btn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

let mapa = null;
let marcador = null;

// Alternar entre tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    
    tabBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    document.querySelectorAll('.form-container').forEach(form => {
      form.style.display = 'none';
    });
    
    if (tab === 'cep') {
      cepForm.style.display = 'flex';
    } else {
      enderecoForm.style.display = 'flex';
    }
    
    limparResultados();
  });
});

// Busca por CEP
cepForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cep = cepInput.value.replace(/\D/g, '');
  
  if (cep.length !== 8) {
    alert('CEP inválido. Deve conter 8 dígitos.');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      resultado.innerHTML = `<p>CEP não encontrado.</p>`;
    } else {
      exibirResultado(data);
      exibirMapa(data);
      salvarHistorico(data);
    }

    cepInput.value = '';
  } catch (error) {
    resultado.innerHTML = `<p>Erro ao buscar o CEP.</p>`;
  }
});

// Busca por endereço
enderecoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const rua = ruaInput.value.trim();
  const cidade = cidadeInput.value.trim();
  const uf = ufInput.value.trim();
  
  if (!rua || !cidade || !uf) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${uf}/${cidade}/${rua}/json/`);
    const data = await response.json();

    if (!data || data.length === 0) {
      resultado.innerHTML = `<p>Endereço não encontrado.</p>`;
    } else {
      let html = '<h4>Endereços encontrados:</h4>';
      data.forEach(item => {
        html += `
          <div class="endereco-item">
            <p><strong>CEP:</strong> ${item.cep}</p>
            <p><strong>Logradouro:</strong> ${item.logradouro}</p>
            <p><strong>Bairro:</strong> ${item.bairro}</p>
            <p><strong>Cidade:</strong> ${item.localidade} - ${item.uf}</p>
            <button onclick="selecionarEndereco('${item.cep}')">Ver no mapa</button>
          </div>
        `;
      });
      resultado.innerHTML = html;
    }

    ruaInput.value = '';
    cidadeInput.value = '';
    ufInput.value = '';
  } catch (error) {
    resultado.innerHTML = `<p>Erro ao buscar endereço.</p>`;
  }
});

// Selecionar endereço e mostrar no mapa
window.selecionarEndereco = async function(cep) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    
    if (!data.erro) {
      exibirResultado(data);
      exibirMapa(data);
      salvarHistorico(data);
    }
  } catch (error) {
    console.error('Erro ao selecionar endereço:', error);
  }
};

// Exibir resultado da busca no HTML
function exibirResultado(data) {
  const html = `
    <p><strong>CEP:</strong> ${data.cep}</p>
    <p><strong>Logradouro:</strong> ${data.logradouro}</p>
    <p><strong>Bairro:</strong> ${data.bairro}</p>
    <p><strong>Cidade:</strong> ${data.localidade} - ${data.uf}</p>
  `;
  resultado.innerHTML = html;
}

// Exibir mapa com localização usando Leaflet e OpenStreetMap
function exibirMapa(data) {
  const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
  
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}`)
    .then(response => response.json())
    .then(geoData => {
      if (geoData && geoData.length > 0) {
        const { lat, lon } = geoData[0];
        
        if (!mapa) {
          mapa = L.map('mapa').setView([lat, lon], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapa);
        } else {
          mapa.setView([lat, lon], 16);
        }
        
        if (marcador) {
          mapa.removeLayer(marcador);
        }
        
        marcador = L.marker([lat, lon]).addTo(mapa);
        marcador.bindPopup(`${data.logradouro}, ${data.localidade}`).openPopup();
        
        mapaContainer.style.display = 'block';
      }
    });
}

// Salvar histórico de buscas no localStorage
function salvarHistorico(data) {
  const item = `${data.cep} - ${data.localidade}/${data.uf}`;
  let historico = JSON.parse(localStorage.getItem('historicoCEP')) || [];
  
  if (!historico.includes(item)) {
    historico.unshift(item);
    if (historico.length > 5) historico.pop();
    localStorage.setItem('historicoCEP', JSON.stringify(historico));
  }
  
  renderizarHistorico();
}

// Limpar resultados e esconder mapa
function limparResultados() {
  resultado.innerHTML = '';
  mapaContainer.style.display = 'none';
}

// Renderizar histórico de buscas na lista HTML
function renderizarHistorico() {
  const historico = JSON.parse(localStorage.getItem('historicoCEP')) || [];
  historicoList.innerHTML = '';
  historico.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    historicoList.appendChild(li);
  });
}

// Inicializar histórico ao carregar a página
renderizarHistorico();

// Sistema de temas

// Inicializa o tema com a preferência salva ou padrão claro
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

// Aplica o tema e atualiza o ícone do botão
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Atualizar ícone do botão de tema
  if (theme === 'dark') {
    themeIcon.textContent = '☀️'; // Ícone de sol para tema escuro
  } else {
    themeIcon.textContent = '🌙'; // Ícone de lua para tema claro
  }
}

// Alterna entre tema claro e escuro
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

// Adiciona evento de clique ao botão de tema
themeToggle.addEventListener('click', toggleTheme);

// Inicializa o tema ao carregar a página
initTheme();
