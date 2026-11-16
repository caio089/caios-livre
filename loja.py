"""Regras da loja que não dependem da tela.

O carrinho fica na sessão do Flask. O Redis só guarda o que foi visto,
e o MongoDB continua sendo a fonte dos produtos.
"""

from uuid import uuid4

from flask import request, session

from banco.erros import BancoIndisponivel
from banco.mongo_produtos import baixar_estoque, buscar_produto, buscar_varios, devolver_estoque
from banco.redis_cache import listar_selecionados, registrar_selecionado
from imagens import salvar_imagem
from validacao import ler_estoque, ler_preco, texto_obrigatorio, url_de_imagem


class ErroLoja(Exception):
    """Erro que a tela pode mostrar para a pessoa, com o código HTTP."""

    def __init__(self, mensagem: str, codigo: int = 400) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def id_visitante() -> str:
    if not session.get("visitante_id"):
        session["visitante_id"] = uuid4().hex
    return session["visitante_id"]


def salvar_carrinho(carrinho: dict) -> None:
    session["carrinho"] = carrinho
    session.modified = True


def quantidade_total() -> int:
    return sum(int(valor) for valor in session.get("carrinho", {}).values())


def registrar_no_redis(produto_id: str) -> str | None:
    """Grava o item selecionado. Se o Redis cair, a loja continua."""
    try:
        registrar_selecionado(id_visitante(), produto_id)
    except BancoIndisponivel as erro:
        return erro.mensagem
    return None


def produtos_recentes(ignorar_id: str | None = None) -> tuple[list[dict], str | None]:
    try:
        ids = listar_selecionados(id_visitante())
    except BancoIndisponivel as erro:
        return [], erro.mensagem

    if ignorar_id:
        ids = [produto_id for produto_id in ids if produto_id != ignorar_id]

    try:
        return buscar_varios(ids), None
    except BancoIndisponivel as erro:
        return [], erro.mensagem


def filtrar_produtos(produtos: list[dict], termo: str) -> list[dict]:
    chave = termo.casefold()
    if not chave:
        return produtos
    return [
        produto
        for produto in produtos
        if chave in produto["nome"].casefold()
        or chave in produto["categoria"].casefold()
        or chave in produto["descricao"].casefold()
    ]


def montar_carrinho() -> tuple[list[dict], float]:
    bruto = dict(session.get("carrinho", {}))
    itens = []
    total = 0.0
    ids_validos = set()

    for produto_id, quantidade in bruto.items():
        produto = buscar_produto(produto_id)
        if produto is None:
            continue
        quantidade = int(quantidade)
        if quantidade < 1:
            continue
        subtotal = round(produto["preco"] * quantidade, 2)
        total += subtotal
        ids_validos.add(produto_id)
        itens.append({**produto, "quantidade": quantidade, "subtotal": subtotal})

    if set(bruto) != ids_validos:
        salvar_carrinho({produto_id: bruto[produto_id] for produto_id in ids_validos})

    return itens, round(total, 2)


def finalizar_pagamento(metodo: str) -> dict:
    """Baixa o estoque e esvazia o carrinho. Não guarda dados de cartão."""
    if metodo not in {"cartao", "pix"}:
        raise ErroLoja("Escolha cartão ou Pix.")

    itens, total = montar_carrinho()
    if not itens:
        raise ErroLoja("O carrinho está vazio.")

    baixados = []
    try:
        for item in itens:
            if not baixar_estoque(item["id"], item["quantidade"]):
                raise ErroLoja(f"Sem estoque suficiente de {item['nome']}.", 409)
            baixados.append(item)
    except Exception:
        for item in baixados:
            devolver_estoque(item["id"], item["quantidade"])
        raise

    salvar_carrinho({})
    return {
        "protocolo": f"CL-{uuid4().hex[:6].upper()}",
        "total": total,
    }


def ler_produto_do_formulario() -> dict:
    nome = texto_obrigatorio(request.form.get("nome", ""), "o nome", 80)
    descricao = texto_obrigatorio(request.form.get("descricao", ""), "a descrição", 500)
    categoria = texto_obrigatorio(request.form.get("categoria", ""), "a categoria", 40)
    preco = ler_preco(request.form.get("preco", ""))
    estoque = ler_estoque(request.form.get("estoque", ""))

    arquivo = request.files.get("arquivo")
    link = request.form.get("imagem", "").strip()
    if arquivo is not None and arquivo.filename:
        imagem = salvar_imagem(arquivo)
    elif link:
        imagem = url_de_imagem(link)
    else:
        raise ValueError("Envie uma imagem ou cole o link dela.")

    return {
        "nome": nome,
        "descricao": descricao,
        "preco": preco,
        "imagem": imagem,
        "categoria": categoria,
        "estoque": estoque,
    }


def quantidade_no_carrinho(produto_id: str) -> int:
    return int(session.get("carrinho", {}).get(produto_id, 0))


def adicionar_item(produto_id: str, quantidade: int) -> str:
    if quantidade < 1:
        raise ErroLoja("Quantidade inválida.")

    item = buscar_produto(produto_id)
    if item is None:
        raise ErroLoja("Produto não encontrado.", 404)

    carrinho = dict(session.get("carrinho", {}))
    nova = int(carrinho.get(produto_id, 0)) + quantidade
    if nova > item["estoque"]:
        raise ErroLoja("Não há estoque suficiente desse produto.", 409)

    carrinho[produto_id] = nova
    salvar_carrinho(carrinho)
    registrar_no_redis(produto_id)
    return item["nome"]


def definir_quantidade(produto_id: str, quantidade: int) -> None:
    item = buscar_produto(produto_id)
    carrinho = dict(session.get("carrinho", {}))

    if item is None:
        carrinho.pop(produto_id, None)
        salvar_carrinho(carrinho)
        return

    if quantidade == 0:
        carrinho.pop(produto_id, None)
    elif quantidade > item["estoque"]:
        raise ErroLoja(f"Só há {item['estoque']} em estoque.", 409)
    else:
        carrinho[produto_id] = quantidade

    salvar_carrinho(carrinho)


def remover_item(produto_id: str) -> None:
    carrinho = dict(session.get("carrinho", {}))
    carrinho.pop(produto_id, None)
    salvar_carrinho(carrinho)
