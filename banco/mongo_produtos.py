"""Produtos ficam no MongoDB.

O catálogo lê direto da coleção, sem cache. Por isso um produto cadastrado
no painel aparece na hora na vitrine do cliente.
"""

from datetime import datetime

from bson.errors import InvalidId
from bson.objectid import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from banco.erros import BancoIndisponivel
from config import MONGODB_DB, MONGODB_URI

_cliente: MongoClient | None = None


def _colecao():
    global _cliente
    if _cliente is None:
        _cliente = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    return _cliente[MONGODB_DB]["produtos"]


def _traduzir_erro(erro: Exception) -> BancoIndisponivel:
    return BancoIndisponivel(
        "Não conectei no MongoDB. Confira se ele está ligado e se MONGODB_URI está certo no .env."
    )


def _formatar(documento: dict) -> dict:
    criado_em = documento.get("criado_em")
    if isinstance(criado_em, datetime):
        data_texto = criado_em.strftime("%d/%m/%Y %H:%M")
    else:
        data_texto = ""

    return {
        "id": str(documento["_id"]),
        "nome": documento.get("nome", ""),
        "descricao": documento.get("descricao", ""),
        "preco": float(documento.get("preco", 0)),
        "imagem": documento.get("imagem", ""),
        "categoria": documento.get("categoria") or "Geral",
        "estoque": int(documento.get("estoque", 0)),
        "criado_em": data_texto,
    }


def listar_produtos() -> list[dict]:
    try:
        cursor = _colecao().find().sort("criado_em", -1)
        return [_formatar(documento) for documento in cursor]
    except PyMongoError as erro:
        raise _traduzir_erro(erro) from erro


def buscar_produto(produto_id: str) -> dict | None:
    try:
        objeto_id = ObjectId(produto_id)
    except (InvalidId, TypeError):
        return None

    try:
        documento = _colecao().find_one({"_id": objeto_id})
    except PyMongoError as erro:
        raise _traduzir_erro(erro) from erro

    if documento is None:
        return None
    return _formatar(documento)


def buscar_varios(ids: list[str]) -> list[dict]:
    """Mantém a ordem recebida (a do Redis, do mais recente para o mais antigo)."""
    produtos = []
    for produto_id in ids:
        produto = buscar_produto(produto_id)
        if produto is not None:
            produtos.append(produto)
    return produtos


def criar_produto(dados: dict) -> str:
    documento = {
        "nome": dados["nome"],
        "descricao": dados["descricao"],
        "preco": dados["preco"],
        "imagem": dados["imagem"],
        "categoria": dados["categoria"],
        "estoque": dados["estoque"],
        "criado_em": datetime.now(),
    }
    try:
        resultado = _colecao().insert_one(documento)
    except PyMongoError as erro:
        raise _traduzir_erro(erro) from erro
    return str(resultado.inserted_id)


def baixar_estoque(produto_id: str, quantidade: int) -> bool:
    """Tira do estoque só se ainda houver unidades suficientes."""
    try:
        objeto_id = ObjectId(produto_id)
    except (InvalidId, TypeError):
        return False

    try:
        resultado = _colecao().update_one(
            {"_id": objeto_id, "estoque": {"$gte": quantidade}},
            {"$inc": {"estoque": -quantidade}},
        )
    except PyMongoError as erro:
        raise _traduzir_erro(erro) from erro
    return resultado.modified_count == 1


def devolver_estoque(produto_id: str, quantidade: int) -> None:
    """Devolve unidades se o pagamento falhar no meio."""
    try:
        _colecao().update_one(
            {"_id": ObjectId(produto_id)},
            {"$inc": {"estoque": quantidade}},
        )
    except (InvalidId, TypeError, PyMongoError) as erro:
        raise _traduzir_erro(erro) from erro


def excluir_produto(produto_id: str) -> dict | None:
    produto = buscar_produto(produto_id)
    if produto is None:
        return None

    try:
        _colecao().delete_one({"_id": ObjectId(produto_id)})
    except PyMongoError as erro:
        raise _traduzir_erro(erro) from erro
    return produto
