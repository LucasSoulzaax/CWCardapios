const API_USERS_URL = "/api/users";
const API_REGISTROS_URL = "/api/registros";

let currentUser = null;
let registrosAtuais = [];
let pendingDeleteId = null;

const el = (id) => document.getElementById(id);

function showToast(message, type = "success") {
  const toast = el("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function setAuthTab(mode) {
  const isLogin = mode === "login";
  el("tabLogin").classList.toggle("active", isLogin);
  el("tabRegister").classList.toggle("active", !isLogin);
  el("loginForm").classList.toggle("hidden", !isLogin);
  el("registerForm").classList.toggle("hidden", isLogin);
}

function toggleIsmField() {
  const checked = el("sos").checked;
  el("ismFieldWrap").classList.toggle("hidden", !checked);
  if (!checked) el("ismResponsavel").value = "";
}

function abrirApp() {
  clearForm();
  el("loginScreen").classList.add("hidden");
  el("appScreen").classList.remove("hidden");
  el("loggedUserName").textContent = currentUser.nome;
  el("autoUserDisplay").textContent = currentUser.nome;
}

function fecharApp() {
  currentUser = null;
  registrosAtuais = [];
  pendingDeleteId = null;
  clearForm();
  el("loginScreen").classList.remove("hidden");
  el("appScreen").classList.add("hidden");
  el("loginForm").reset();
  el("registerForm").reset();
  setAuthTab("login");
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro na requisição");
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

async function apiDelete(url) {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

el("tabLogin").addEventListener("click", () => setAuthTab("login"));
el("tabRegister").addEventListener("click", () => setAuthTab("register"));
el("sos").addEventListener("change", toggleIsmField);

el("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = el("registerNome").value.trim();
  const username = el("registerUsername").value.trim().toLowerCase();
  const password = el("registerPassword").value.trim();

  if (!nome || !username || !password) {
    showToast("Preencha todos os campos do cadastro.", "error");
    return;
  }

  try {
    await apiPost(API_USERS_URL, { nome, username, password });
    await carregarUsuarios();
    showToast("Conta criada com sucesso.");
    el("registerForm").reset();
    setAuthTab("login");
    el("loginUsername").value = username;
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao criar conta.", "error");
  }
});

el("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = el("loginUsername").value.trim().toLowerCase();
  const password = el("loginPassword").value.trim();

  try {
    const user = await apiPost("/api/login", { username, password });

    currentUser = user;
    abrirApp();
    carregarTabela();
    carregarUsuarios();
    showToast(`Bem-vindo, ${user.nome}!`);
  } catch (err) {
    console.error(err);
    showToast("Erro ao realizar login.", "error");
  }
});

el("logoutBtn").addEventListener("click", () => {
  fecharApp();
  showToast("Sessão encerrada.");
});

function badgeTipo(tipo) {
  const map = { manual: "Manual", importavel: "Importável", alteracao: "Alteração" };
  return `<span class="badge ${tipo}">${map[tipo] || tipo}</span>`;
}

function badgeSos(sos) {
  if (!sos) return '<span class="badge neutral">Não</span>';
  return '<span class="badge sos">SOS</span>';
}

function formatDate(d) {
  if (!d) return "-";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;

  const date = new Date(d);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, day] = match;
    return `${day}/${m}/${y}`;
  }

  return String(d);
}

function getTodayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function shouldUseTodayDefaultFilter() {
  return !el("filterNome").value.trim() &&
    !el("filterDataIni").value &&
    !el("filterDataFim").value;
}

function crispCell(crisp) {
  if (!crisp) return "-";
  if (crisp.startsWith("http")) {
    return `<a class="link-crisp" href="${crisp}" target="_blank" rel="noopener noreferrer">Abrir link</a>`;
  }
  return crisp.length > 40 ? crisp.slice(0, 40) + "..." : crisp;
}

function getFilteredClient(list) {
  const tipo = el("filterTipo").value;
  const sos = el("filterSos").value;
  let result = list;

  if (tipo) result = result.filter(r => r.tipoCardapio === tipo);
  if (sos === 'sim') result = result.filter(r => r.sos === true);
  if (sos === 'nao') result = result.filter(r => !r.sos);

  return result;
}

function renderStats(list) {
  const counts = { manual: 0, importavel: 0, alteracao: 0, sos: 0 };
  list.forEach(r => {
    if (counts[r.tipoCardapio] !== undefined) counts[r.tipoCardapio]++;
    if (r.sos) counts.sos++;
  });
  el("stats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${list.length}</div></div>
    <div class="stat-card"><div class="stat-label">Manual</div><div class="stat-value">${counts.manual}</div></div>
    <div class="stat-card"><div class="stat-label">Importável</div><div class="stat-value">${counts.importavel}</div></div>
    <div class="stat-card"><div class="stat-label">SOS</div><div class="stat-value danger-text">${counts.sos}</div></div>
  `;
}

function renderTable(list) {
  const tbody = el("tbody");
  tbody.innerHTML = "";
  el("resultsCount").textContent = list.length;
  el("emptyMsg").style.display = list.length ? "none" : "block";
  renderStats(list);

  list.forEach(r => {
    const dono = currentUser && r.username === currentUser.username;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div><strong>${r.nome}</strong></div>
        <div class="owner-tag">Responsável pelo cardápio</div>
      </td>
      <td>${formatDate(r.dataCriacao)}</td>
      <td>${crispCell(r.crisp)}</td>
      <td>${r.portal || "-"}</td>
      <td>${badgeTipo(r.tipoCardapio)}</td>
      <td>${badgeSos(r.sos)}</td>
      <td>${r.ismResponsavel || '-'}</td>
      <td>${r.alteracao || "-"}</td>
      <td>
        ${dono ? `
          <div class="action-buttons">
            <button class="btn btn-secondary small" onclick="editRegistro('${r.id}')">Editar</button>
            <button class="btn btn-danger small" onclick="askDelete('${r.id}')">Excluir</button>
          </div>
        ` : `<span class="owner-tag">Sem permissão</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportToXlsx() {
  const rows = registrosAtuais.map(r => ({
    Assistente: r.nome,
    Username: r.username,
    'Data de criação': formatDate(r.dataCriacao),
    Crisp: r.crisp || '',
    Portal: r.portal || '',
    'Tipo de cardápio': r.tipoCardapio || '',
    SOS: r.sos ? 'Sim' : 'Não',
    'ISM responsável': r.ismResponsavel || '',
    Alteração: r.alteracao || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: 'Nenhum registro para exportar' }]);
  XLSX.utils.book_append_sheet(wb, ws, 'Cardapios');
  XLSX.writeFile(wb, 'cardapios.xlsx');
}

async function carregarTabela() {
  const params = new URLSearchParams();
  const nome = el("filterNome").value.trim();
  let dataIni = el("filterDataIni").value;
  let dataFim = el("filterDataFim").value;

  if (shouldUseTodayDefaultFilter()) {
    const hoje = getTodayISO();
    dataIni = hoje;
    dataFim = hoje;
  }

  if (nome) params.append("nome", nome);
  if (dataIni) params.append("dataIni", dataIni);
  if (dataFim) params.append("dataFim", dataFim);

  try {
    let dados = await apiGet(`${API_REGISTROS_URL}?${params.toString()}`);
    dados = getFilteredClient(dados);
    registrosAtuais = dados;
    renderTable(dados);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar registros.", "error");
  }
}

function clearForm() {
  el("editId").value = "";
  el("dataCriacao").value = "";
  el("crisp").value = "";
  el("portal").value = "";
  el("tipoCardapio").value = "manual";
  el("sos").checked = false;
  el("ismResponsavel").value = "";
  el("alteracao").value = "";
  el("form-title").textContent = "Novo Registro";
  if (currentUser) el("autoUserDisplay").textContent = currentUser.nome;
  toggleIsmField();
}

async function saveRegistro() {
  const dataCriacao = el("dataCriacao").value;
  const sos = el("sos").checked;
  const ismResponsavel = el("ismResponsavel").value.trim();

  if (!currentUser) return showToast("Faça login para continuar.", "error");
  if (!dataCriacao) return showToast("Preencha a data de criação.", "error");
  if (sos && !ismResponsavel) return showToast("Informe o ISM responsável para registros SOS.", "error");

  const editId = el("editId").value;
  const registro = {
    nome: currentUser.nome,
    username: currentUser.username,
    dataCriacao,
    crisp: el("crisp").value.trim(),
    portal: el("portal").value.trim(),
    tipoCardapio: el("tipoCardapio").value,
    sos,
    ismResponsavel: sos ? ismResponsavel : '',
    alteracao: el("alteracao").value.trim()
  };

  try {
    if (editId) {
      await apiPut(`${API_REGISTROS_URL}/${editId}`, registro);
      showToast("Registro atualizado com sucesso.");
    } else {
      await apiPost(API_REGISTROS_URL, registro);
      showToast("Registro salvo com sucesso.");
    }
    clearForm();
    carregarTabela();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao salvar registro.", "error");
  }
}

window.editRegistro = function(id) {
  const r = registrosAtuais.find(x => x.id === id);
  if (!r) return;
  if (!currentUser || r.username !== currentUser.username) {
    return showToast("Você só pode editar seus próprios registros.", "error");
  }

  el("editId").value = r.id;
  el("dataCriacao").value = r.dataCriacao;
  el("crisp").value = r.crisp || "";
  el("portal").value = r.portal || "";
  el("tipoCardapio").value = r.tipoCardapio;
  el("sos").checked = !!r.sos;
  el("ismResponsavel").value = r.ismResponsavel || '';
  el("alteracao").value = r.alteracao || "";
  el("autoUserDisplay").textContent = r.nome;
  el("form-title").textContent = "Editar Registro";
  toggleIsmField();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.askDelete = function(id) {
  const r = registrosAtuais.find(x => x.id === id);
  if (!r) return;
  if (!currentUser || r.username !== currentUser.username) {
    return showToast("Você só pode excluir seus próprios registros.", "error");
  }
  pendingDeleteId = id;
  el("confirmModal").classList.remove("hidden");
};

el("cancelDeleteBtn").addEventListener("click", () => {
  pendingDeleteId = null;
  el("confirmModal").classList.add("hidden");
});

el("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await apiDelete(`${API_REGISTROS_URL}/${pendingDeleteId}`);
    pendingDeleteId = null;
    el("confirmModal").classList.add("hidden");
    showToast("Registro excluído com sucesso.");
    clearForm();
    carregarTabela();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao excluir registro.", "error");
  }
});

el("saveBtn").addEventListener("click", saveRegistro);
el("clearBtn").addEventListener("click", clearForm);
el("filterNome").addEventListener("input", carregarTabela);
el("filterTipo").addEventListener("change", carregarTabela);
el("filterSos").addEventListener("change", carregarTabela);
el("filterDataIni").addEventListener("change", carregarTabela);
el("filterDataFim").addEventListener("change", carregarTabela);
el("clearFilters").addEventListener("click", () => {
  el("filterNome").value = "";
  el("filterTipo").value = "";
  el("filterSos").value = "";
  el("filterDataIni").value = "";
  el("filterDataFim").value = "";
  carregarTabela();
});
el("exportXlsxBtn").addEventListener("click", exportToXlsx);


function renderUsersList(users) {
  const list = el("usersList");
  if (!list) return;
  if (!users.length) {
    list.innerHTML = '<div class="empty-users">Nenhum usuário cadastrado ainda.</div>';
    return;
  }

  list.innerHTML = users.map(user => `
    <div class="user-card">
      <div>
        <strong>${user.nome}</strong>
        <p>@${user.username}</p>
      </div>
      <span class="owner-tag">ID ${user.id}</span>
    </div>
  `).join('');
}

async function carregarUsuarios() {
  try {
    const users = await apiGet(API_USERS_URL);
    renderUsersList(users);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar usuários.", "error");
  }
}

if (el("refreshUsersBtn")) el("refreshUsersBtn").addEventListener("click", carregarUsuarios);
