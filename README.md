# Caio's livre

Loja web feita para a 3ª avaliação de Banco de Dados. A ideia é mostrar um sistema que usa mais de um banco, cada um no trabalho em que ele é mais adequado, com uma interface de verdade: catálogo, carrinho, pagamento simulado e painel de administrador.

Na tela a marca é **Caio's livre**. A pasta do projeto e o banco do MongoDB continuam com o nome técnico `polistore`. Isso não muda o que o visitante vê.

Demonstração gravada (cerca de 5 a 10 minutos): [Caio's livre no YouTube](https://youtu.be/YoB86M_1txo)

## O que o sistema faz

O visitante entra no catálogo, busca um produto, abre a página dele, coloca no carrinho, muda a quantidade e paga. O pagamento é uma simulação: cartão ou Pix. Nenhum valor é cobrado.

O administrador entra com e-mail e senha, publica um produto e ele aparece na hora na vitrine. Também pode excluir um anúncio.

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
| Login do administrador | Supabase Auth, em cima de PostgreSQL | A senha fica no serviço de autenticação. O código só confere o login. |
| Produtos | MongoDB, coleção `produtos` | Cada anúncio é um documento: nome, descrição, preço, imagem, categoria e estoque. |
| Vistos recentemente | Redis | Lista curta por visitante, com expiração. Não substitui o catálogo. |
| Carrinho | Sessão do Flask | Some quando a sessão acaba. O total é calculado lendo o preço atual no MongoDB. |

O catálogo **não** é cacheado no Redis. Por isso um produto cadastrado no painel aparece na busca imediatamente. O Redis só lembra quais produtos aquele visitante abriu ou colocou no carrinho.

## Telas

| Endereço | Quem usa | O que acontece |
|---|---|---|
| `/` | Visitante | Lista os produtos do MongoDB e filtra por nome, categoria ou descrição. |
| `/produto/<id>` | Visitante | Mostra o anúncio e grava o id no Redis. |
| `/carrinho` | Visitante | Soma o total, altera quantidade e abre o pagamento. |
| `/admin/login` | Administrador | Entra com o login de demonstração ou com o Supabase. |
| `/admin` | Administrador | Cria e exclui produtos no MongoDB. |

A faixa **Você viu recentemente** lê a lista do Redis e busca esses produtos no MongoDB, na ordem em que foram vistos.

## Pagamento simulado

O botão **Pagar agora** abre um painel com duas formas:

- **Cartão:** nome, número, validade e CVV. Esses dados ficam só no navegador, para a validação da tela. O servidor recebe apenas `cartao` ou `pix`.
- **Pix:** mostra um código fictício e um botão para confirmar.

Se o formato está certo, o Flask baixa o estoque no MongoDB, esvazia o carrinho e devolve um protocolo no formato `CL-XXXXXX`. Um número de cartão terminado em `0000` é recusado de propósito, sem mexer no estoque.

Se o estoque de um item acabar no meio da compra, as unidades já baixadas são devolvidas e a compra não conclui.

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

Esse login é mocado: não chama o Supabase. Ele existe para o vídeo e para testar o painel.

Se quiser o login real, crie o mesmo e-mail em **Authentication → Users → Add user**, marque **Auto Confirm User** e entre com a senha definida lá. Só o e-mail de `ADMIN_EMAIL` é aceito.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | Endereço do projeto Supabase. |
| `SUPABASE_KEY` | Chave pública (publishable). |
| `MONGODB_URI` | Conexão do MongoDB. No Atlas, o `@` da senha precisa ir como `%40`. |
| `MONGODB_DB` | Nome do banco. O padrão é `polistore`. |
| `REDIS_URL` | Conexão do Redis. |
| `ADMIN_EMAIL` | Único e-mail autorizado no painel. | 
| `ADMIN_SENHA` | Senha mocada da demonstração. O login real continua no Supabase. |
| `SECRET_KEY` | Assina o cookie da sessão. Troque antes de publicar. |

O arquivo `.env` não entra no Git.

No Atlas, a lista de Network Access precisa liberar o IP de quem vai rodar a loja. Sem isso a conexão cai no aperto de mão TLS, antes mesmo de testar a senha.

## Pastas

```text
polistore/
  app.py              sobe o Flask e entrega a tela pronta
  rotas_api.py        rotas JSON (/api/...)
  loja.py             carrinho, pagamento e regras
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

- A senha real do Supabase não entra no repositório. A senha `caio123` existe só para a demonstração.
- O cookie da sessão é `HttpOnly` e `SameSite=Lax`.
- O número do cartão do simulador não é enviado ao servidor nem salvo.
- O painel só abre para o e-mail de `ADMIN_EMAIL`. A senha `ADMIN_SENHA` vale só na demonstração. Qualquer outra senha desse e-mail é conferida no Supabase.
- Foto local excluída junto com o produto. Link externo não é apagado do disco, porque não está no disco.

## Vídeo

A demonstração está publicada em [https://youtu.be/YoB86M_1txo](https://youtu.be/YoB86M_1txo).

O que o vídeo percorre:

1. Entrar em `/admin/login` com `admin@caioslivre.com` e a senha `caio123`.
2. Cadastrar um produto novo no painel. O documento vai para o MongoDB.
3. Abrir o catálogo e mostrar que o produto já está na busca, sem cache.
4. Abrir o produto e mostrar a faixa **Você viu recentemente**, gravada no Redis.
5. Adicionar itens ao carrinho, mudar a quantidade, remover um e mostrar o total.
6. Clicar em **Pagar agora**, simular cartão ou Pix e mostrar o protocolo `CL-...`.

Nada no pagamento é cobrado. O estoque só muda depois que a simulação é aprovada.
