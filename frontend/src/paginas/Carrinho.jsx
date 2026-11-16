import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api, reais } from "../api";
import { LOJA } from "../marca";
import { useAnimacao } from "../animacao";
import { useLoja } from "../contexto";
import { Foto } from "../componentes/CardProduto";
import Pagamento from "../componentes/Pagamento";
import Preco from "../componentes/Preco";

export default function Carrinho() {
  const { definirQuantidade, avisar } = useLoja();
  const animacao = useAnimacao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [pagando, setPagando] = useState(false);

  function carregar() {
    return api("/api/carrinho")
      .then((resposta) => {
        setDados(resposta);
        definirQuantidade(resposta.quantidade_carrinho);
        if (resposta.aviso) avisar(resposta.aviso, "erro");
      })
      .catch((falha) => setErro(falha.message));
  }

  useEffect(() => {
    document.title = `Carrinho · ${LOJA}`;
    carregar();
  }, []);

  async function mudar(item, quantidade) {
    try {
      const resposta = quantidade < 1
        ? await api(`/api/carrinho/${item.id}`, { method: "DELETE" })
        : await api(`/api/carrinho/${item.id}`, { method: "PUT", body: { quantidade } });
      definirQuantidade(resposta.quantidade_carrinho);
      if (quantidade < 1) avisar(resposta.mensagem);
      await carregar();
    } catch (falha) {
      avisar(falha.message, "erro");
    }
  }

  if (erro) return <p className="aviso aviso-erro">{erro}</p>;
  if (!dados) return <p className="nota">Abrindo o carrinho…</p>;

  return (
    <>
      <h1 className="titulo-pagina">Carrinho</h1>
      {dados.itens.length === 0 ? (
        <section className="vazio">
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione produtos para ver o total.</p>
          <Link className="botao" to="/">Ver produtos</Link>
        </section>
      ) : (
        <div className="carrinho-layout">
          <ul className="itens">
            <AnimatePresence>
              {dados.itens.map((item) => (
                <motion.li
                  key={item.id}
                  layout={!animacao.reduzir}
                  initial={animacao.reduzir ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                >
                  <Link className="item-foto" to={`/produto/${item.id}`}>
                    <Foto produto={item} />
                  </Link>
                  <div className="item-info">
                    <Link to={`/produto/${item.id}`}>{item.nome}</Link>
                    <Preco valor={item.preco} />
                  </div>
                  <div className="passo">
                    <button type="button" onClick={() => mudar(item, item.quantidade - 1)} aria-label="Diminuir">−</button>
                    <span>{item.quantidade}</span>
                    <button type="button" onClick={() => mudar(item, item.quantidade + 1)} aria-label="Aumentar">+</button>
                  </div>
                  <strong>{reais(item.subtotal)}</strong>
                  <button className="botao-texto" type="button" onClick={() => mudar(item, 0)}>Excluir</button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <aside className="resumo">
            <h2>Resumo da compra</h2>
            <Preco valor={dados.total} grande />
            <p className="nota">{dados.itens.length} produto{dados.itens.length === 1 ? "" : "s"}</p>
            <button className="botao botao-largo" type="button" onClick={() => setPagando(true)}>
              Pagar agora
            </button>
          </aside>
        </div>
      )}
      <AnimatePresence>
        {pagando && (
          <Pagamento
            total={dados.total}
            onFechar={() => setPagando(false)}
            onAprovado={async (recibo) => {
              definirQuantidade(0);
              avisar(`${recibo.mensagem} ${recibo.protocolo}`);
              await carregar();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
