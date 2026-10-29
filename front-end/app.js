// Pokédex: front-end que consome a API Restful do projeto pokedex (PokemonResource).
// Depois do deploy no Render, troque API_URL pela URL publicada, ex.: https://seu-servico.onrender.com/pokedex
const API_URL = "http://localhost:8080/pokedex";

// Os sprites são só ilustração e vêm da PokeAPI (pokeapi.co).
// Se o nome não for de um pokémon conhecido (ou se estiver sem internet), aparece a silhueta.
const ESPECIES_URL = "https://pokeapi.co/api/v2/pokemon-species?limit=2000";
const SPRITES_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const CHAVE_ESPECIES = "pokedex.especies";

const DICA = "Escolha um pokémon na lista (↑ ↓) ou registre um novo pelo formulário.";

const estado = {
  pokemons: [],
  falhou: false,     // a última listagem falhou (API fora do ar ou erro no banco)
  selecionado: null, // código do pokémon mostrado na ficha
  editando: null,    // código do pokémon carregado no formulário
  ocupado: false,
  especies: new Map(), // nome -> número na Pokédex nacional (usado só para achar o sprite)
};

const $ = (seletor) => document.querySelector(seletor);

const lista = $("#lista");
const aviso = $("#aviso");
const avisoTexto = $("#aviso-texto");
const botaoTentar = $("#tentar");
const mensagem = $("#mensagem");
const statusApi = $("#status-api");
const contagem = $("#contagem");
const botaoEditar = $("#editar");
const botaoExcluir = $("#excluir");
const form = $("#formulario");
const tituloForm = $("#titulo-form");
const botaoEnviar = $("#enviar");
const botaoCancelar = $("#cancelar");
const ficha = {
  sprite: $("#sprite"),
  silhueta: $("#silhueta"),
  numero: $("#ficha-numero"),
  nome: $("#ficha-nome"),
  categoria: $("#ficha-categoria"),
  altura: $("#ficha-altura"),
  peso: $("#ficha-peso"),
  captura: $("#ficha-captura"),
};

// ---------- formatação ----------

const formatarNumero = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const formatarData = (iso) => iso.split("-").reverse().join("/");
const formatarCodigo = (codigo) => "No." + String(codigo).padStart(3, "0");

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- comunicação com a API ----------

function definirStatus(tipo, texto) {
  document.body.dataset.api = tipo;
  statusApi.textContent = texto;
}

// Acende no painel "Chamadas à API" a linha do endpoint chamado e mostra o status HTTP devolvido
function marcarChamada(metodo, caminho) {
  const rota = { GET: caminho ? "buscar" : "listar", POST: "registrar", PUT: "salvar", DELETE: "excluir" }[metodo];
  const linha = document.querySelector(`.chamada[data-rota="${rota}"]`);
  document.querySelectorAll(".chamada.ultima").forEach((l) => l.classList.remove("ultima"));
  linha.classList.add("ativa", "ultima");
  linha.querySelector(".caminho").textContent = "/pokedex" + caminho;
  linha.querySelector(".resultado").textContent = "···";
  return (resultado) => {
    linha.classList.remove("ativa");
    linha.querySelector(".resultado").textContent = resultado;
    linha.dataset.falha = String(!(resultado >= 200 && resultado < 300));
  };
}

async function chamarApi(metodo, caminho = "", corpo) {
  definirStatus("carregando", "Conectando à API…");
  const concluir = marcarChamada(metodo, caminho);
  try {
    const resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers: corpo ? { "Content-Type": "application/json" } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    concluir(resposta.status);
    if (resposta.status >= 500) definirStatus("erro", "Erro na API");
    else definirStatus("ok", "API conectada");
    return resposta;
  } catch (erro) {
    concluir("ERR");
    definirStatus("erro", "API fora do ar");
    throw erro;
  }
}

async function explicarRecusa(resposta, acao) {
  const tipo = resposta.headers.get("Content-Type") || "";
  const textoApi = tipo.startsWith("text/plain") ? await resposta.text() : "";
  if (resposta.status === 400 && !textoApi) {
    return "A API recusou os dados (400). Nome e categoria são obrigatórios, altura e peso precisam ser maiores que zero e a data da captura não pode ser futura.";
  }
  return `Não foi possível ${acao} (${resposta.status}${textoApi ? ": " + textoApi : ""}). Veja o erro no console da API.`;
}

const semResposta = () => `Sem resposta da API em ${API_URL}. Confira se o PokedexApplication está rodando.`;

// GET /pokedex  ->  findAll()
async function carregar(destaque) {
  let resposta;
  try {
    resposta = await chamarApi("GET");
  } catch {
    mostrarFalha(semResposta());
    return;
  }
  if (!resposta.ok) {
    definirStatus("erro", "Erro na API");
    mostrarFalha(`A API respondeu ${resposta.status} ao listar os pokémons. Veja o erro no console da API: costuma ser a conexão com o Oracle (DB_URL, DB_USER, DB_PASSWORD) ou a tabela DDD_POKEMONS.`);
    return;
  }
  estado.pokemons = await resposta.json();
  if (estado.falhou) {
    estado.falhou = false;
    avisar(DICA);
  }
  if (destaque === "ultimo" && estado.pokemons.length) {
    destaque = Math.max(...estado.pokemons.map((p) => p.codigo));
  }
  desenharLista();
  selecionar(destaque ?? estado.selecionado);
}

// ---------- tela ----------

function mostrarFalha(texto) {
  estado.falhou = true;
  estado.pokemons = [];
  lista.hidden = true;
  aviso.hidden = false;
  avisoTexto.textContent = "Lista indisponível.";
  botaoTentar.hidden = false;
  avisar(texto, "erro");
  contagem.textContent = "Registrados ---";
  selecionar(null);
}

function desenharLista() {
  const itens = estado.pokemons.map((pokemon) => {
    const numero = document.createElement("span");
    numero.className = "item-numero";
    numero.textContent = formatarCodigo(pokemon.codigo);

    const nome = document.createElement("span");
    nome.className = "item-nome";
    nome.textContent = pokemon.nome;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.codigo = pokemon.codigo;
    botao.append(numero, nome);
    botao.addEventListener("click", () => selecionar(pokemon.codigo));

    const item = document.createElement("li");
    item.append(botao);
    return item;
  });
  lista.replaceChildren(...itens);
  contagem.textContent = "Registrados " + String(estado.pokemons.length).padStart(3, "0");

  const vazia = estado.pokemons.length === 0;
  lista.hidden = vazia;
  aviso.hidden = !vazia;
  botaoTentar.hidden = true;
  avisoTexto.textContent = "Nenhum pokémon registrado ainda.";
}

const pokemonSelecionado = () => estado.pokemons.find((p) => p.codigo === estado.selecionado);

function selecionar(codigo, focar = false) {
  const existe = estado.pokemons.some((p) => p.codigo === codigo);
  estado.selecionado = existe ? codigo : (estado.pokemons[0]?.codigo ?? null);
  cancelarConfirmacao();
  for (const botao of lista.querySelectorAll("button")) {
    const atual = Number(botao.dataset.codigo) === estado.selecionado;
    botao.setAttribute("aria-current", atual ? "true" : "false");
    if (atual) {
      rolarListaAte(botao);
      if (focar) botao.focus({ preventScroll: true });
    }
  }
  desenharFicha();
}

// rola só a lista da tela (nunca a página) até o item selecionado ficar visível
function rolarListaAte(botao) {
  const item = botao.getBoundingClientRect();
  const caixa = lista.getBoundingClientRect();
  if (item.top < caixa.top) lista.scrollTop -= caixa.top - item.top;
  else if (item.bottom > caixa.bottom) lista.scrollTop += item.bottom - caixa.bottom;
}

function desenharFicha() {
  const pokemon = pokemonSelecionado();
  botaoEditar.disabled = !pokemon;
  botaoExcluir.disabled = !pokemon;
  if (!pokemon) {
    ficha.numero.textContent = "No.---";
    ficha.nome.textContent = "-----";
    ficha.categoria.textContent = "";
    ficha.altura.textContent = ficha.peso.textContent = ficha.captura.textContent = "--";
    mostrarSprite(null);
    return;
  }
  ficha.numero.textContent = formatarCodigo(pokemon.codigo);
  ficha.nome.textContent = pokemon.nome;
  ficha.categoria.textContent = pokemon.categoria;
  ficha.altura.textContent = formatarNumero(pokemon.altura) + " m";
  ficha.peso.textContent = formatarNumero(pokemon.peso) + " kg";
  ficha.captura.textContent = formatarData(pokemon.dataDaCaptura);
  mostrarSprite(pokemon.nome);
}

function avisar(texto, tipo = "info") {
  mensagem.textContent = texto;
  mensagem.dataset.tipo = tipo;
}

// ---------- sprites (PokeAPI) ----------

function normalizarNome(nome) {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/♀/g, "-f").replace(/♂/g, "-m")
    .replace(/['’.:]/g, "")
    .replace(/\s+/g, "-");
}

function urlDoSprite(nome) {
  const numero = estado.especies.get(normalizarNome(nome));
  if (!numero) return null;
  // 1ª geração com o sprite original do Game Boy; as demais com o sprite padrão
  return numero <= 151
    ? `${SPRITES_URL}/versions/generation-i/yellow/transparent/${numero}.png`
    : `${SPRITES_URL}/${numero}.png`;
}

function mostrarSprite(nome) {
  const url = nome ? urlDoSprite(nome) : null;
  if (url && ficha.sprite.getAttribute("src") !== url) ficha.sprite.src = url;
  ficha.sprite.hidden = !url;
  ficha.silhueta.toggleAttribute("hidden", Boolean(url)); // em <svg> a propriedade .hidden não existe
}

ficha.sprite.addEventListener("error", () => {
  ficha.sprite.hidden = true;
  ficha.silhueta.removeAttribute("hidden");
});

async function carregarEspecies() {
  try {
    const salvo = localStorage.getItem(CHAVE_ESPECIES);
    if (salvo) {
      estado.especies = new Map(JSON.parse(salvo));
      desenharFicha();
      return;
    }
  } catch {
    // sem localStorage: busca na PokeAPI
  }
  try {
    const dados = await (await fetch(ESPECIES_URL)).json();
    const pares = dados.results.map((e) => [e.name, Number(e.url.split("/").filter(Boolean).pop())]);
    estado.especies = new Map(pares);
    try { localStorage.setItem(CHAVE_ESPECIES, JSON.stringify(pares)); } catch { /* segue sem cache */ }
    desenharFicha();
  } catch {
    // sem internet: a Pokédex continua funcionando, só sem sprites
  }
}

// ---------- formulário: POST /pokedex (save) e PUT /pokedex/{codigo} (update) ----------

function lerFormulario() {
  const campos = form.elements;
  return {
    nome: campos.nome.value.trim(),
    categoria: campos.categoria.value.trim(),
    altura: Number(campos.altura.value),
    peso: Number(campos.peso.value),
    dataDaCaptura: campos.data.value,
  };
}

function entrarNaEdicao(pokemon) {
  const campos = form.elements;
  estado.editando = pokemon.codigo;
  campos.nome.value = pokemon.nome;
  campos.categoria.value = pokemon.categoria;
  campos.altura.value = pokemon.altura;
  campos.peso.value = pokemon.peso;
  campos.data.value = pokemon.dataDaCaptura;
  tituloForm.textContent = "Editar " + formatarCodigo(pokemon.codigo);
  botaoEnviar.textContent = "Salvar alterações";
  botaoCancelar.hidden = false;
  campos.nome.focus();
}

function sairDaEdicao() {
  estado.editando = null;
  form.reset();
  tituloForm.textContent = "Registrar pokémon";
  botaoEnviar.textContent = "Registrar";
  botaoCancelar.hidden = true;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (estado.ocupado) return;
  const dados = lerFormulario();
  const codigo = estado.editando;
  estado.ocupado = true;
  botaoEnviar.disabled = true;
  try {
    const resposta = codigo === null
      ? await chamarApi("POST", "", dados)
      : await chamarApi("PUT", "/" + codigo, dados);
    if (resposta.status === 201) {
      avisar(codigo === null ? `${dados.nome} registrado na Pokédex.` : `Alterações em ${dados.nome} salvas.`);
      sairDaEdicao();
      await carregar(codigo ?? "ultimo");
    } else {
      avisar(await explicarRecusa(resposta, codigo === null ? "registrar" : "salvar as alterações"), "erro");
    }
  } catch {
    avisar(semResposta(), "erro");
  } finally {
    estado.ocupado = false;
    botaoEnviar.disabled = false;
  }
});

botaoCancelar.addEventListener("click", sairDaEdicao);

// GET /pokedex/{codigo} (findByCodigo): edita sempre a versão atual que está no banco
botaoEditar.addEventListener("click", async () => {
  const pokemon = pokemonSelecionado();
  if (!pokemon || estado.ocupado) return;
  estado.ocupado = true;
  try {
    const resposta = await chamarApi("GET", "/" + pokemon.codigo);
    if (resposta.ok) {
      entrarNaEdicao(await resposta.json());
    } else if (resposta.status === 404) {
      avisar(`${pokemon.nome} já não estava na Pokédex.`, "erro");
      await carregar();
    } else {
      avisar(await explicarRecusa(resposta, "abrir a ficha"), "erro");
    }
  } catch {
    avisar(semResposta(), "erro");
  } finally {
    estado.ocupado = false;
  }
});

// ---------- exclusão: DELETE /pokedex/{codigo} (pede confirmação com um segundo clique) ----------

let temporizadorExclusao;

function cancelarConfirmacao() {
  clearTimeout(temporizadorExclusao);
  botaoExcluir.classList.remove("confirmando");
  botaoExcluir.textContent = "Excluir";
}

botaoExcluir.addEventListener("click", async () => {
  const pokemon = pokemonSelecionado();
  if (!pokemon || estado.ocupado) return;
  if (!botaoExcluir.classList.contains("confirmando")) {
    botaoExcluir.classList.add("confirmando");
    botaoExcluir.textContent = "Confirmar exclusão";
    temporizadorExclusao = setTimeout(cancelarConfirmacao, 4000);
    return;
  }
  cancelarConfirmacao();
  const indice = estado.pokemons.indexOf(pokemon);
  const vizinho = (estado.pokemons[indice + 1] ?? estado.pokemons[indice - 1])?.codigo;
  estado.ocupado = true;
  try {
    const resposta = await chamarApi("DELETE", "/" + pokemon.codigo);
    if (resposta.status === 204) avisar(`${pokemon.nome} excluído da Pokédex.`);
    else if (resposta.status === 404) avisar(`${pokemon.nome} já não estava na Pokédex.`, "erro");
    else avisar(await explicarRecusa(resposta, "excluir"), "erro");
    if (estado.editando === pokemon.codigo) sairDaEdicao();
    await carregar(vizinho);
  } catch {
    avisar(semResposta(), "erro");
  } finally {
    estado.ocupado = false;
  }
});

// ---------- navegação pelo teclado na lista ----------

lista.addEventListener("keydown", (evento) => {
  const teclas = ["ArrowDown", "ArrowUp", "Home", "End"];
  if (!teclas.includes(evento.key) || estado.pokemons.length === 0) return;
  evento.preventDefault();
  const atual = estado.pokemons.findIndex((p) => p.codigo === estado.selecionado);
  const ultimo = estado.pokemons.length - 1;
  const destino = {
    ArrowDown: Math.min(atual + 1, ultimo),
    ArrowUp: Math.max(atual - 1, 0),
    Home: 0,
    End: ultimo,
  }[evento.key];
  selecionar(estado.pokemons[destino].codigo, true);
});

botaoTentar.addEventListener("click", () => carregar());

// ---------- início ----------

form.elements.data.max = hoje();
form.elements.data.defaultValue = hoje();
$("#url-api").textContent = API_URL;
carregar();
carregarEspecies();
