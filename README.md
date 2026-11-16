# Caio's livre

Loja web feita para a 3ª avaliação de Banco de Dados. A ideia é mostrar um sistema que usa mais de um banco, cada um no trabalho em que ele é mais adequado, com uma interface de verdade: catálogo, carrinho, pedido pelo WhatsApp e painel de administrador.

Na tela a marca é **Caio's livre**. A pasta do projeto e o banco do MongoDB continuam com o nome técnico `polistore`. Isso não muda o que o visitante vê.

Demonstração gravada: [Caio's livre no YouTube](https://youtu.be/VDAvhVXa3So)

## O que o sistema faz

O visitante entra no catálogo, busca um produto, abre a página dele, coloca no carrinho e muda a quantidade. Ao finalizar, a loja monta a mensagem do carrinho e abre o WhatsApp com esse texto já escrito.

O administrador entra com o login de demonstração, publica um produto e ele aparece na hora na vitrine. Também pode excluir um anúncio. O código ainda sabe falar com o Supabase, mas a senha da demonstração não chama esse serviço.

## Arquitetura

O navegador fala só com o Flask. O Flask é quem conversa com os três bancos. A tela em React não guarda senha de banco e não acessa o Mongo, o Redis nem o Supabase direto.

```text
Navegador (React)
        |
        |  HTTP, cookie de sessão
        v
   Flask (API + arquivos da tela)
     |            |            |
     v            v            v
 Supabase      MongoDB        Redis
 login admin   produtos     vistos há pouco
```

| Peça | Onde fica | Por que está ali |
|---|---|---|
| Login do administrador | Senha mocada na demonstração. O Supabase continua no código para um usuário real. | A tela de login existe. Na gravação entra com `admin@caioslivre.com`. |
| Produtos | MongoDB, coleção `produtos` | Cada anúncio é um documento: nome, descrição, preço, imagem, categoria e estoque. |
| Vistos recentemente | Redis | Lista curta por visitante, com expiração. Não substitui o catálogo. |
| Carrinho | Sessão do Flask | Some quando a sessão acaba. O total é calculado lendo o preço atual no MongoDB. |

O catálogo **não** é cacheado no Redis. Por isso um produto cadastrado no painel aparece na busca imediatamente. O Redis só lembra quais produtos aquele visitante abriu ou colocou no carrinho.

## Telas

| Endereço | Quem usa | O que acontece |
|---|---|---|
| `/` | Visitante | Lista os produtos do MongoDB e filtra por nome, categoria ou descrição. |
| `/produto/<id>` | Visitante | Mostra o anúncio e grava o id no Redis. |
| `/carrinho` | Visitante | Soma o total, altera quantidade e abre o WhatsApp com a mensagem pronta. |
| `/admin/login` | Administrador | Entra com o login de demonstração. |
| `/admin` | Administrador | Cria e exclui produtos no MongoDB. |

A faixa **Você viu recentemente** lê a lista do Redis e busca esses produtos no MongoDB, na ordem em que foram vistos.

## Finalizar no WhatsApp

O botão **Finalizar no WhatsApp** mostra a mensagem do carrinho e abre a conversa. O texto sai assim:

```text
Olá, gostaria de pedir:
1x Caderno universitário
2x Kit de canetas
Total: R$ 61,90
```

O preço é lido de novo no MongoDB na hora de montar o total. Se `WHATSAPP_NUMERO` estiver preenchido, o link abre o chat desse número. Sem o número, o WhatsApp abre com a mesma mensagem para a pessoa escolher o contato.

## Como rodar

Na pasta `polistore`, com Python 3:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Preencha o `.env` com a URL do Supabase, a chave **publishable** (a chave pública), a URI do MongoDB e a URL do Redis. Não coloque a chave secreta `service_role` no projeto.

Gere a tela e suba a API:

```bash
cd frontend
npm install
npm run build
cd ..
python app.py
```

Abra http://127.0.0.1:8080

A porta é 8080 porque, no macOS, a 5000 costuma estar ocupada pelo AirPlay. Se alterar um arquivo da pasta `frontend`, rode `npm run build` de novo. O Flask em modo de desenvolvimento recarrega sozinho quando um arquivo Python muda.

Para desenvolver a tela com atualização automática, em outro terminal:

```bash
cd frontend
npm run dev
```

O Vite encaminha `/api` e `/static` para o Flask em `127.0.0.1:8080`.

### MongoDB e Redis locais

Se não for usar Atlas nem Redis Cloud, a pasta tem um `docker-compose.yml` com MongoDB 7 e Redis 7:

```bash
docker compose up -d
```

Nesse caso as URLs locais do `.env.example` já servem.

### Entrar no painel

Para a demonstração, use:

- E-mail: `admin@caioslivre.com`
- Senha: `caio123`

Esse login é mocado e não chama o Supabase. Só esse e-mail é aceito. Se a senha for outra, o Flask tenta o usuário real no Supabase.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | Endereço do projeto Supabase. |
| `SUPABASE_KEY` | Chave pública (publishable). |
| `MONGODB_URI` | Conexão do MongoDB. No Atlas, o `@` da senha precisa ir como `%40`. |
| `MONGODB_DB` | Nome do banco. O padrão é `polistore`. |
| `REDIS_URL` | Conexão do Redis. |
| `ADMIN_EMAIL` | Único e-mail autorizado no painel. |
| `ADMIN_SENHA` | Senha mocada da demonstração. |
| `WHATSAPP_NUMERO` | Número da loja, só dígitos, com código do país. Exemplo: `5511987654321`. |
| `SECRET_KEY` | Assina o cookie da sessão. Troque antes de publicar. |

O arquivo `.env` não entra no Git.

No Atlas, a lista de Network Access precisa liberar o IP de quem vai rodar a loja. Sem isso a conexão cai no aperto de mão TLS, antes mesmo de testar a senha.

## Pastas

```text
polistore/
  app.py              sobe o Flask e entrega a tela pronta
  rotas_api.py        rotas JSON (/api/...)
  loja.py             carrinho, mensagem do WhatsApp e regras
  config.py           lê o .env
  banco/              Supabase, MongoDB e Redis
  validacao.py        preço, estoque, texto e link de imagem
  imagens.py          upload em static/uploads
  static/uploads/     fotos enviadas pelo painel
  frontend/           React, Vite e Framer Motion
  docker-compose.yml  Mongo e Redis locais, se houver Docker
```

A interface antiga em HTML foi substituída pelo React. O Flask continua sendo o servidor da API e dos arquivos gerados em `frontend/dist`.

## Dados

Documento na coleção `produtos`, banco `polistore`:

```json
{
  "nome": "Caderno universitário",
  "descricao": "96 folhas, capa dura",
  "preco": 24.9,
  "imagem": "/static/uploads/caderno.jpg",
  "categoria": "Papelaria",
  "estoque": 30,
  "criado_em": "2026-11-16T12:00:00"
}
```

A imagem pode ser um arquivo enviado pelo painel (JPG, PNG, WEBP ou GIF, até 2 MB) ou um link `http`/`https`.

No Redis a chave é `vistos:<id do visitante>`. É uma lista com no máximo 8 ids, do mais recente para o mais antigo, e expira em 7 dias. O id do visitante fica no cookie da sessão, não é um login.

O carrinho também fica nesse cookie. Ao montar o total, o sistema busca o preço e o estoque de novo no MongoDB. Produto apagado sai do carrinho sozinho.

## Cuidados

- A senha `caio123` existe só para a demonstração. A senha real do Supabase não entra no repositório.
- O cookie da sessão é `HttpOnly` e `SameSite=Lax`.
- O painel da demonstração abre com `ADMIN_EMAIL` e `ADMIN_SENHA`.
- A mensagem do WhatsApp não grava o pedido em outro banco. O carrinho continua na sessão.
- Foto local excluída junto com o produto. Link externo não é apagado do disco, porque não está no disco.

## Vídeo

A demonstração está em [https://youtu.be/VDAvhVXa3So](https://youtu.be/VDAvhVXa3So). O vídeo percorre:

1. Abertura da Caio's livre e dos três bancos: Supabase no código de login, MongoDB nos produtos e Redis no que foi visto.
2. Entrada no painel com `admin@caioslivre.com` e a senha `caio123`. Na demonstração essa conferência é mocada.
3. Cadastro de um produto no painel. O anúncio vira um documento na coleção `produtos`.
4. Busca no catálogo, com o produto novo aparecendo na hora, sem cache.
5. Página do produto e a faixa **Você viu recentemente**, gravada no Redis.
6. Carrinho: incluir itens, mudar a quantidade, remover um e ler o total.
7. **Finalizar no WhatsApp**, com a mensagem pronta do carrinho e a conversa abrindo no número da loja.
