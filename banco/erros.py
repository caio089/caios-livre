"""Erros usados pelos módulos de banco."""


class BancoIndisponivel(Exception):
    """O banco não está configurado ou não respondeu."""

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class CredenciaisInvalidas(Exception):
    """O Supabase recusou o e-mail ou a senha."""
