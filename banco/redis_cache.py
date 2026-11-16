"""Cache dos produtos selecionados recentemente.

A lista mora no Redis e expira em 7 dias. Ela não substitui o MongoDB:
se o Redis for limpo, o catálogo continua inteiro.
"""

import redis
from redis.exceptions import RedisError

from banco.erros import BancoIndisponivel
from config import REDIS_URL

_cliente: redis.Redis | None = None
_LIMITE = 8
_EXPIRACAO_SEGUNDOS = 7 * 24 * 60 * 60


def _conexao() -> redis.Redis:
    global _cliente
    if _cliente is None:
        _cliente = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    return _cliente


def _chave(visitante_id: str) -> str:
    return f"vistos:{visitante_id}"


def registrar_selecionado(visitante_id: str, produto_id: str) -> None:
    """Coloca o produto no topo da lista e remove a cópia antiga, se existir."""
    try:
        cliente = _conexao()
        chave = _chave(visitante_id)
        cliente.lrem(chave, 0, produto_id)
        cliente.lpush(chave, produto_id)
        cliente.ltrim(chave, 0, _LIMITE - 1)
        cliente.expire(chave, _EXPIRACAO_SEGUNDOS)
    except RedisError as erro:
        raise BancoIndisponivel(
            "Não conectei no Redis. Confira se ele está ligado e se REDIS_URL está certo no .env."
        ) from erro


def listar_selecionados(visitante_id: str) -> list[str]:
    try:
        return list(_conexao().lrange(_chave(visitante_id), 0, _LIMITE - 1))
    except RedisError as erro:
        raise BancoIndisponivel(
            "Não conectei no Redis. Confira se ele está ligado e se REDIS_URL está certo no .env."
        ) from erro
