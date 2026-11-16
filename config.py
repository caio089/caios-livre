"""Lê as configurações do arquivo .env."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)


def _ler(nome: str, padrao: str = "") -> str:
    return os.getenv(nome, padrao).strip()


SUPABASE_URL = _ler("SUPABASE_URL")
SUPABASE_KEY = _ler("SUPABASE_KEY")
MONGODB_URI = _ler("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = _ler("MONGODB_DB", "polistore")
REDIS_URL = _ler("REDIS_URL", "redis://localhost:6379/0")
ADMIN_EMAIL = _ler("ADMIN_EMAIL").lower()
ADMIN_SENHA = _ler("ADMIN_SENHA")
WHATSAPP_NUMERO = "".join(caractere for caractere in _ler("WHATSAPP_NUMERO") if caractere.isdigit())
SECRET_KEY = _ler("SECRET_KEY", "troque-essa-chave-antes-de-entregar")
