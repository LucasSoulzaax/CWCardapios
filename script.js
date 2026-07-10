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

function abrirApp() {
  el("loginScreen").classList.add("hidden");
  el("appScreen").classList.remove("hidden");
  el("loggedUserName").textContent = currentUser.nome;
  el("autoUserDisplay").textContent = currentUser.nome;
}

function fecharApp() {
  currentUser = null;
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
    const users = await apiGet(API_USERS_URL);
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      showToast("Usuário ou senha inválidos.", "error");
      return;
    }

    currentUser = user;
    abrirApp();
    carregarTabela();
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

function formatDate(d) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
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
  if (!tipo) return list;
  return list.filter(r => r.tipoCardapio === tipo);
}

function renderStats(list) {
  const counts = { manual: 0, importavel: 0, alteracao: 0 };
  list.forEach(r => {
    if (counts[r.tipoCardapio] !== undefined) counts[r.tipoCardapio]++;
  });
  el("stats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${list.length}</div></div>
    <div class="stat-card"><div class="stat-label">Manual</div><div class="stat-value">${counts.manual}</div></div>
    <div class="stat-card"><div class="stat-label">Importável</div><div class="stat-value">${counts.importavel}</div></div>
    <div class="stat-card"><div class="stat-label">Alteração</div><div class="stat-value">${counts.alteracao}</div></div>
  `;
}

function renderTable(list) {
  const tbody = el("tbody");
  tbody.innerHTML = "";
  el("resultsCount").textContent = list.length;
  el("emptyMsg").style.display = list.length ? "none" : "block";
  renderStats(list);

  list.forEach(r => {
    const dono = currentUser && (r.nome || "").toLowerCase() === currentUser.nome.toLowerCase();
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

async function carregarTabela() {
  const params = new URLSearchParams();
  const nome = el("filterNome").value.trim();
  const dataIni = el("filterDataIni").value;
  const dataFim = el("filterDataFim").value;
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
  el("alteracao").value = "";
  el("form-title").textContent = "Novo Registro";
  if (currentUser) el("autoUserDisplay").textContent = currentUser.nome;
}

async function saveRegistro() {
  const dataCriacao = el("dataCriacao").value;
  if (!currentUser) return showToast("Faça login para continuar.", "error");
  if (!dataCriacao) return showToast("Preencha a data de criação.", "error");

  const editId = el("editId").value;
  const registro = {
    nome: currentUser.nome,
    username: currentUser.username,
    dataCriacao,
    crisp: el("crisp").value.trim(),
    portal: el("portal").value.trim(),
    tipoCardapio: el("tipoCardapio").value,
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
  el("alteracao").value = r.alteracao || "";
  el("autoUserDisplay").textContent = r.nome;
  el("form-title").textContent = "Editar Registro";
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
el("filterDataIni").addEventListener("change", carregarTabela);
el("filterDataFim").addEventListener("change", carregarTabela);
el("clearFilters").addEventListener("click", () => {
  el("filterNome").value = "";
  el("filterTipo").value = "";
  el("filterDataIni").value = "";
  el("filterDataFim").value = "";
  carregarTabela();
});
