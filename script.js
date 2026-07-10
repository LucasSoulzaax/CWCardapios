const STORAGE_KEY = "cardapios_assistentes_v1";

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let registros = loadData();

const el = id => document.getElementById(id);

function badgeTipo(tipo){
  const map = {manual:"Manual", importavel:"Importável", alteracao:"Alteração"};
  return `<span class="badge ${tipo}">${map[tipo] || tipo}</span>`;
}
function badgeCrisp(crisp){
  return `<span class="badge crisp-${crisp}">${crisp === "sim" ? "Sim" : "Não"}</span>`;
}
function formatDate(d){
  if(!d) return "-";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function getFiltered(){
  const nome = el("filterNome").value.trim().toLowerCase();
  const ini = el("filterDataIni").value;
  const fim = el("filterDataFim").value;

  return registros.filter(r => {
    let ok = true;
    if(nome) ok = ok && r.nome.toLowerCase().includes(nome);
    if(ini) ok = ok && r.dataCriacao >= ini;
    if(fim) ok = ok && r.dataCriacao <= fim;
    return ok;
  });
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

function renderTable(){
  const list = getFiltered().sort((a,b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
  renderStats(list);

  const tbody = el("tbody");
  tbody.innerHTML = "";
  el("emptyMsg").style.display = list.length ? "none" : "block";

  list.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${formatDate(r.dataCriacao)}</td>
      <td>${badgeCrisp(r.crisp)}</td>
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

function clearForm(){
  el("editId").value = "";
  el("nome").value = "";
  el("dataCriacao").value = "";
  el("crisp").value = "sim";
  el("portal").value = "";
  el("tipoCardapio").value = "manual";
  el("alteracao").value = "";
  el("form-title").textContent = "Novo Registro";
}

function saveRegistro(){
  const nome = el("nome").value.trim();
  const dataCriacao = el("dataCriacao").value;

  if(!nome || !dataCriacao){
    alert("Preencha ao menos Nome do assistente e Data de criação.");
    return;
  }

  const editId = el("editId").value;
  const registro = {
    id: editId || Date.now().toString(),
    nome,
    dataCriacao,
    crisp: el("crisp").value,
    portal: el("portal").value.trim(),
    tipoCardapio: el("tipoCardapio").value,
    alteracao: el("alteracao").value.trim()
  };

  if(editId){
    const idx = registros.findIndex(r => r.id === editId);
    if(idx > -1) registros[idx] = registro;
  } else {
    registros.push(registro);
  }

  saveData(registros);
  clearForm();
  renderTable();
}

function editRegistro(id){
  const r = registros.find(x => x.id === id);
  if(!r) return;
  el("editId").value = r.id;
  el("nome").value = r.nome;
  el("dataCriacao").value = r.dataCriacao;
  el("crisp").value = r.crisp;
  el("portal").value = r.portal;
  el("tipoCardapio").value = r.tipoCardapio;
  el("alteracao").value = r.alteracao;
  el("form-title").textContent = "Editar Registro";
  window.scrollTo({top:0, behavior:"smooth"});
}

function deleteRegistro(id){
  if(!confirm("Excluir este registro?")) return;
  registros = registros.filter(r => r.id !== id);
  saveData(registros);
  renderTable();
}

el("saveBtn").addEventListener("click", saveRegistro);
el("clearBtn").addEventListener("click", clearForm);
el("filterNome").addEventListener("input", renderTable);
el("filterDataIni").addEventListener("change", renderTable);
el("filterDataFim").addEventListener("change", renderTable);
el("clearFilters").addEventListener("click", () => {
  el("filterNome").value = "";
  el("filterDataIni").value = "";
  el("filterDataFim").value = "";
  renderTable();
});

renderTable();
