"""Login do administrador pelo Supabase Auth.

A senha não é gravada no MongoDB nem no Redis. Quem confere é o Supabase.
"""

from supabase import create_client
from supabase_auth.errors import AuthError

from banco.erros import BancoIndisponivel, CredenciaisInvalidas
from config import SUPABASE_KEY, SUPABASE_URL


def entrar(email: str, senha: str) -> str:
    """Devolve o e-mail autenticado ou levanta erro de login."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise BancoIndisponivel(
            "Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_KEY no .env."
        )

    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
        resposta = cliente.auth.sign_in_with_password(
            {"email": email, "password": senha}
        )
    except AuthError as erro:
        raise CredenciaisInvalidas from erro
    except Exception as erro:
        raise BancoIndisponivel(
            "Não consegui falar com o Supabase. Confira a URL e a chave."
        ) from erro

    usuario = resposta.user
    if usuario is None or not usuario.email:
        raise CredenciaisInvalidas

    return usuario.email
