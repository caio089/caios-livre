"""Conversão e validação dos campos digitados no formulário."""

from urllib.parse import urlparse


def ler_preco(texto: str) -> float:
    """Aceita 19.90 e também 19,90."""
    limpo = texto.strip().replace("R$", "").replace(" ", "")
    if not limpo:
        raise ValueError("Informe o preço do produto.")

    if "," in limpo and "." in limpo:
        limpo = limpo.replace(".", "").replace(",", ".")
    else:
        limpo = limpo.replace(",", ".")

    try:
        valor = float(limpo)
    except ValueError as erro:
        raise ValueError("Preço inválido. Exemplo: 19,90.") from erro

    if valor <= 0:
        raise ValueError("O preço precisa ser maior que zero.")
    if valor > 1_000_000:
        raise ValueError("Preço alto demais.")
    return round(valor, 2)


def ler_estoque(texto: str) -> int:
    limpo = texto.strip()
    if not limpo:
        raise ValueError("Informe o estoque.")
    try:
        valor = int(limpo)
    except ValueError as erro:
        raise ValueError("O estoque precisa ser um número inteiro.") from erro
    if valor < 0 or valor > 100_000:
        raise ValueError("Estoque inválido.")
    return valor


def texto_obrigatorio(valor: str, nome_campo: str, limite: int) -> str:
    limpo = " ".join(valor.split())
    if not limpo:
        raise ValueError(f"Informe {nome_campo}.")
    if len(limpo) > limite:
        raise ValueError(f"{nome_campo.capitalize()} pode ter no máximo {limite} caracteres.")
    return limpo


def url_de_imagem(url: str) -> str:
    analisada = urlparse(url.strip())
    if analisada.scheme not in {"http", "https"} or not analisada.netloc:
        raise ValueError("O link da imagem precisa começar com http:// ou https://.")
    if len(url) > 500:
        raise ValueError("O link da imagem está longo demais.")
    return url.strip()
