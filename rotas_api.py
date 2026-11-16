"""JSON usado pela interface em React.

A tela não fala com o Mongo, o Redis nem o Supabase direto.
"""

import hmac
from functools import wraps

from flask import Blueprint, jsonify, request, session

from banco.erros import BancoIndisponivel, CredenciaisInvalidas
from banco.mongo_produtos import (
    buscar_produto,
    criar_produto,
    excluir_produto,
    listar_produtos,
)
from banco.supabase_auth import entrar
from config import ADMIN_EMAIL, ADMIN_SENHA
from imagens import apagar_imagem_local
from loja import (
    ErroLoja,
    adicionar_item,
    definir_quantidade,
    filtrar_produtos,
    ler_produto_do_formulario,
    finalizar_pagamento,
    montar_carrinho,
    produtos_recentes,
    quantidade_no_carrinho,
    quantidade_total,
    registrar_no_redis,
    remover_item,
)
from validacao import ler_estoque

api = Blueprint("api", __name__, url_prefix="/api")


def falha(mensagem: str, codigo: int):
    return jsonify(erro=mensagem), codigo


def exigir_admin(funcao):
    @wraps(funcao)
    def protegida(*args, **kwargs):
        if not session.get("admin"):
            return falha("Entre com a conta de administrador.", 401)
        return funcao(*args, **kwargs)

    return protegida


def _json_pedido():
    dados = request.get_json(silent=True) or {}
    if not isinstance(dados, dict):
        raise ErroLoja("Pedido inválido.")
    return dados


@api.get("/sessao")
def sessao_atual():
    return jsonify(admin=bool(session.get("admin")), quantidade_carrinho=quantidade_total())


@api.get("/produtos")
def produtos():
    aviso = None
    lista = []
    try:
        lista = listar_produtos()
    except BancoIndisponivel as erro:
        aviso = erro.mensagem

    termo = request.args.get("q", "").strip()
    recentes, aviso_redis = produtos_recentes()
    return jsonify(
        produtos=filtrar_produtos(lista, termo),
        recentes=recentes,
        aviso=aviso,
        aviso_redis=aviso_redis,
        termo=termo,
    )


@api.get("/produtos/<produto_id>")
def produto(produto_id: str):
    try:
        item = buscar_produto(produto_id)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    if item is None:
        return falha("Produto não encontrado.", 404)

    aviso_redis = registrar_no_redis(produto_id)
    recentes, aviso_lista = produtos_recentes(ignorar_id=produto_id)
    return jsonify(
        produto=item,
        recentes=recentes,
        aviso_redis=aviso_redis or aviso_lista,
        no_carrinho=quantidade_no_carrinho(produto_id),
    )


@api.post("/carrinho/<produto_id>")
def adicionar(produto_id: str):
    try:
        dados = _json_pedido()
        quantidade = int(dados.get("quantidade", 1))
        nome = adicionar_item(produto_id, quantidade)
    except (ErroLoja, ValueError) as erro:
        codigo = erro.codigo if isinstance(erro, ErroLoja) else 400
        mensagem = erro.mensagem if isinstance(erro, ErroLoja) else "Quantidade inválida."
        return falha(mensagem, codigo)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    return jsonify(mensagem=f"{nome} entrou no carrinho.", quantidade_carrinho=quantidade_total())


@api.put("/carrinho/<produto_id>")
def atualizar(produto_id: str):
    try:
        dados = _json_pedido()
        quantidade = ler_estoque(str(dados.get("quantidade", "")))
        definir_quantidade(produto_id, quantidade)
    except ErroLoja as erro:
        return falha(erro.mensagem, erro.codigo)
    except ValueError as erro:
        return falha(str(erro), 400)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    return jsonify(mensagem="Carrinho atualizado.", quantidade_carrinho=quantidade_total())


@api.delete("/carrinho/<produto_id>")
def remover(produto_id: str):
    remover_item(produto_id)
    return jsonify(mensagem="Item removido do carrinho.", quantidade_carrinho=quantidade_total())


@api.get("/carrinho")
def carrinho():
    try:
        itens, total = montar_carrinho()
    except BancoIndisponivel as erro:
        return jsonify(
            itens=[],
            total=0,
            aviso=erro.mensagem,
            quantidade_carrinho=quantidade_total(),
        )

    return jsonify(
        itens=itens,
        total=total,
        aviso=None,
        quantidade_carrinho=quantidade_total(),
    )


@api.post("/pagamento")
def pagamento():
    try:
        dados = _json_pedido()
        resultado = finalizar_pagamento(str(dados.get("metodo", "")).strip().lower())
    except ErroLoja as erro:
        return falha(erro.mensagem, erro.codigo)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    return jsonify(
        mensagem="Pagamento simulado aprovado.",
        protocolo=resultado["protocolo"],
        total=resultado["total"],
        quantidade_carrinho=0,
    )


@api.post("/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = str(dados.get("email", "")).strip().lower()
    senha = str(dados.get("senha", ""))

    if not ADMIN_EMAIL:
        return falha("Defina ADMIN_EMAIL no arquivo .env antes de entrar.", 400)

    if not email or not senha or email != ADMIN_EMAIL:
        return falha("E-mail ou senha inválidos.", 401)

    if ADMIN_SENHA and hmac.compare_digest(senha, ADMIN_SENHA):
        session["admin"] = email
        return jsonify(mensagem="Login de demonstração.", admin=True)

    try:
        email_autenticado = entrar(email, senha)
    except CredenciaisInvalidas:
        return falha("E-mail ou senha inválidos.", 401)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    session["admin"] = email_autenticado
    return jsonify(mensagem="Login feito no Supabase.", admin=True)


@api.post("/sair")
def sair():
    session.pop("admin", None)
    return jsonify(mensagem="Você saiu da área administrativa.", admin=False)


@api.get("/admin/produtos")
@exigir_admin
def painel():
    try:
        produtos = listar_produtos()
    except BancoIndisponivel as erro:
        return jsonify(produtos=[], aviso=erro.mensagem)
    return jsonify(produtos=produtos, aviso=None)


@api.post("/admin/produtos")
@exigir_admin
def criar():
    try:
        dados = ler_produto_do_formulario()
        produto_id = criar_produto(dados)
    except ValueError as erro:
        return falha(str(erro), 400)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    return jsonify(
        mensagem="Produto cadastrado no MongoDB. Ele já aparece no catálogo.",
        id=produto_id,
    )


@api.delete("/admin/produtos/<produto_id>")
@exigir_admin
def excluir(produto_id: str):
    try:
        produto = excluir_produto(produto_id)
    except BancoIndisponivel as erro:
        return falha(erro.mensagem, 503)

    if produto is None:
        return falha("Produto não encontrado.", 404)

    apagar_imagem_local(produto["imagem"])
    remover_item(produto_id)
    return jsonify(mensagem="Produto excluído.", quantidade_carrinho=quantidade_total())
