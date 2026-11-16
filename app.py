"""Caio's livre: API em Flask e interface em React.

Os produtos ficam no MongoDB, o login no Supabase e os itens vistos no Redis.
A pasta frontend/dist é a tela. Sem esse build, a API continua no ar.
"""

from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from config import BASE_DIR, SECRET_KEY
from rotas_api import api

DIST = BASE_DIR / "frontend" / "dist"

app = Flask(__name__, static_folder=str(BASE_DIR / "static"))
app.config["SECRET_KEY"] = SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.json.ensure_ascii = False
app.register_blueprint(api)


def _arquivo_publicado(caminho: str) -> Path | None:
    """Aceita só arquivos que estão dentro do build do React."""
    if not caminho or ".." in caminho.split("/"):
        return None
    destino = (DIST / caminho).resolve()
    try:
        destino.relative_to(DIST.resolve())
    except ValueError:
        return None
    if destino.is_file():
        return destino
    return None


@app.get("/", defaults={"caminho": ""})
@app.get("/<path:caminho>")
def aplicacao(caminho: str):
    if caminho.startswith("api"):
        return jsonify(erro="Não encontrado."), 404

    arquivo = _arquivo_publicado(caminho)
    if arquivo is not None:
        return send_from_directory(arquivo.parent, arquivo.name)

    indice = DIST / "index.html"
    if not indice.is_file():
        return (
            "<!doctype html><meta charset='utf-8'><title>Caio's livre</title>"
            "<p>A interface ainda não foi gerada. Na pasta <code>frontend</code>, "
            "rode <code>npm install</code> e <code>npm run build</code>.</p>"
        ), 503
    return send_from_directory(DIST, "index.html")


@app.errorhandler(413)
def arquivo_grande(_erro):
    if request.path.startswith("/api"):
        return jsonify(erro="A imagem precisa ter no máximo 2 MB."), 413
    return "A imagem precisa ter no máximo 2 MB.", 413


if __name__ == "__main__":
    app.run(debug=True, port=8080)
