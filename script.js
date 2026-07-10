const API_URL = "/api/registros";

const el = id => document.getElementById(id);

async function fetchRegistros(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.nome) params.append("nome", filtros.nome);
  if (filtros.dataIni) params.append("dataIni", filtros.dataIni);
  if (filtros.dataFim) params.append("dataFim", filtros.dataFim);

  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Erro ao buscar registros");
  return res.json();
}

async function criarRegistro(registro) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registro)
  });
  if (!res.ok) throw new Error("Erro ao criar registro");
  return res.json();
}

async function atualizarRegistro(id, registro) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registro)
  });
  if (!res.ok) throw new Error("Erro ao atualizar registro");
  return res.json();
}

async function excluirRegistro(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao excluir registro");
  return res.json();
}

function badgeTipo(tipo){
  const map = {manual:"Manual", importavel:"Importável", alteracao:"Alteração"};
  return `<span class="badge ${tipo}">${map[tipo] || tipo}</span>`;
}

function formatDate(d){
  if(!d) return "-";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function crispCell(crisp){
  if(!crisp) return "-";
  if (crisp.startsWith("http")) {
    return `<a href="${crisp}" target="_blank" rel="noopener" title="${crisp}">🔗 Abrir link</a>`;
  }
  return crisp.length > 30 ? crisp.slice(0,30) + "..." : crisp;
}

function renderStats(list){
  const counts = {manual:0, importavel:0, alteracao:0};
  list.forEach(r => { if(counts[r.tipoCardapio] !== undefined) counts[r.tipoCardapio]++; });
  el("stats").innerHTML = `
    <div class="stat manual"><div class="num" style="color:var(--accent)">${counts.manual}</div><div class="label">Manual</div></div>
    <div class="stat importavel"><div class="num" style="color:var(--success)">${counts.importavel}</div><div class="label">Importável</div></div>
    <div class="stat alteracao"><div class="num" style="color:var(--warning)">${counts.alteracao}</div><div class="label">Alteração</div></div>
  `;
}

function renderTable(list){
  renderStats(list);
  const tbody = el("tbody");
  tbody.innerHTML = "";
  el("emptyMsg").style.display = list.length ? "none" : "block";

  list.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${formatDate(r.dataCriacao)}</td>
      <td>${crispCell(r.crisp)}</td>
      <td>${r.portal || "-"}</td>
      <td>${badgeTipo(r.tipoCardapio)}</td>
      <td>${r.alteracao || "-"}</td>
      <td class="actions">
        <button class="edit" onclick="editRegistro('${r.id}')">Editar</button>
        <button class="del" onclick="deleteRegistro('${r.id}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let registrosAtuais = [];

async function carregarTabela(){
  const filtros = {
    nome: el("filterNome").value.trim(),
    dataIni: el("filterDataIni").value,
    dataFim: el("filterDataFim").value
  };
  try {
    registrosAtuais = await fetchRegistros(filtros);
    renderTable(registrosAtuais);
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar registros.");
  }
}

function clearForm(){
  el("editId").value = "";
  el("nome").value = "";
  el("dataCriacao").value = "";
  el("crisp").value = "";
  el("portal").value = "";
  el("tipoCardapio").value = "manual";
  el("alteracao").value = "";
  el("form-title").textContent = "Novo Registro";
}

async function saveRegistro(){
  const nome = el("nome").value.trim();
  const dataCriacao = el("dataCriacao").value;

  if(!nome || !dataCriacao){
    alert("Preencha ao menos Nome do assistente e Data de criação.");
    return;
  }

  const editId = el("editId").value;
  const registro = {
    nome,
    dataCriacao,
    crisp: el("crisp").value.trim(),
    portal: el("portal").value.trim(),
    tipoCardapio: el("tipoCardapio").value,
    alteracao: el("alteracao").value.trim()
  };

  try {
    if(editId){
      await atualizarRegistro(editId, registro);
    } else {
      await criarRegistro(registro);
    }
    clearForm();
    await carregarTabela();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar registro.");
  }
}

function editRegistro(id){
  const r = registrosAtuais.find(x => x.id === id);
  if(!r) return;
  el("editId").value = r.id;
  el("nome").value = r.nome;
  el("dataCriacao").value = r.dataCriacao;
  el("crisp").value = r.crisp || "";
  el("portal").value = r.portal || "";
  el("tipoCardapio").value = r.tipoCardapio;
  el("alteracao").value = r.alteracao || "";
  el("form-title").textContent = "Editar Registro";
  window.scrollTo({top:0, behavior:"smooth"});
}

async function deleteRegistro(id){
  if(!confirm("Excluir este registro?")) return;
  try {
    await excluirRegistro(id);
    await carregarTabela();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir registro.");
  }
}

el("saveBtn").addEventListener("click", saveRegistro);
el("clearBtn").addEventListener("click", clearForm);
el("filterNome").addEventListener("input", carregarTabela);
el("filterDataIni").addEventListener("change", carregarTabela);
el("filterDataFim").addEventListener("change", carregarTabela);
el("clearFilters").addEventListener("click", () => {
  el("filterNome").value = "";
  el("filterDataIni").value = "";
  el("filterDataFim").value = "";
  carregarTabela();
});

carregarTabela();
