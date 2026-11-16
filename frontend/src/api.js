export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

export async function api(caminho, opcoes = {}) {
  const corpo = opcoes.body;
  const envioJson = corpo !== undefined && !(corpo instanceof FormData);
  const resposta = await fetch(caminho, {
    method: opcoes.method || "GET",
    body: envioJson ? JSON.stringify(corpo) : corpo,
    credentials: "same-origin",
    cache: "no-store",
    headers: envioJson ? { "Content-Type": "application/json" } : undefined,
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new ErroApi(dados.erro || "Não foi possível completar a ação.", resposta.status);
  }
  return dados;
}

export function partesPreco(valor) {
  const centavosTotal = Math.round(Number(valor) * 100);
  const reais = Math.trunc(centavosTotal / 100);
  const centavos = Math.abs(centavosTotal % 100);
  return {
    reais: reais.toLocaleString("pt-BR"),
    centavos: String(centavos).padStart(2, "0"),
  };
}

export function reais(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
