"""Salva a foto enviada pelo administrador na pasta static/uploads."""

import os
from pathlib import Path
from uuid import uuid4

from config import BASE_DIR

PASTA_UPLOADS = BASE_DIR / "static" / "uploads"
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
TAMANHO_MAXIMO = 2 * 1024 * 1024


def salvar_imagem(arquivo) -> str:
    nome_original = (arquivo.filename or "").strip()
    extensao = Path(nome_original).suffix.lower()
    if extensao not in EXTENSOES:
        raise ValueError("Envie uma imagem JPG, PNG, WEBP ou GIF.")

    arquivo.seek(0, os.SEEK_END)
    tamanho = arquivo.tell()
    arquivo.seek(0)
    if tamanho == 0:
        raise ValueError("O arquivo da imagem está vazio.")
    if tamanho > TAMANHO_MAXIMO:
        raise ValueError("A imagem precisa ter no máximo 2 MB.")

    PASTA_UPLOADS.mkdir(parents=True, exist_ok=True)
    nome_salvo = f"{uuid4().hex}{extensao}"
    arquivo.save(PASTA_UPLOADS / nome_salvo)
    return f"/static/uploads/{nome_salvo}"


def apagar_imagem_local(caminho: str) -> None:
    """Remove só arquivos que esta loja gravou. Links externos são ignorados."""
    prefixo = "/static/uploads/"
    if not caminho.startswith(prefixo):
        return

    nome = Path(caminho).name
    if not nome or nome != Path(nome).name:
        return

    arquivo = PASTA_UPLOADS / nome
    if arquivo.is_file():
        arquivo.unlink()
