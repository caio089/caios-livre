import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { LOJA } from "../marca";
import { useAnimacao } from "../animacao";
import { useLoja } from "../contexto";
import { Foto } from "../componentes/CardProduto";
import Preco from "../componentes/Preco";

export default function Produto() {
  const { id } = useParams();
  const { avisar, definirQuantidade } = useLoja();
  const animacao = useAnimacao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro("");
    api(`/api/produtos/${id}`)
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        document.title = `${resposta.produto.nome} · ${LOJA}`;
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message);
      });
    return () => {
      ativo = false;
    };
  }, [id]);

  if (erro) {
    return (
      <section className="vazio">
        <h1>{erro}</h1>
        <Link className="botao" to="/">Ver produtos</Link>
      </section>
    );
  }
  if (!dados) return <p className="nota">Carregando produto…</p>;

  const { produto, recentes } = dados;
  const restante = Math.max(produto.estoque - dados.no_carrinho, 0);

  async function adicionar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const resposta = await api(`/api/carrinho/${produto.id}`, {
        method: "POST",
        body: { quantidade },
      });
      definirQuantidade(resposta.quantidade_carrinho);
      avisar(resposta.mensagem);
      setDados((atual) => ({ ...atual, no_carrinho: atual.no_carrinho + quantidade }));
      setQuantidade(1);
    } catch (falha) {
      avisar(falha.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="migalha">
        <Link to="/">Produtos</Link>
        <span> / </span>
        {produto.categoria}
      </p>
      <section className="produto">
        <motion.div {...(animacao.reduzir ? {} : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } })}>
          <Foto produto={produto} grande />
        </motion.div>
        <div>
          <p className="sobrancelha">{produto.categoria}</p>
          <h1>{produto.nome}</h1>
          <Preco valor={produto.preco} grande />
          <p className="descricao">{produto.descricao}</p>
          <p className={produto.estoque > 0 ? "disponivel" : "aviso aviso-erro"}>
            {produto.estoque > 0 ? `Estoque disponível · ${produto.estoque} un.` : "Esgotado"}
          </p>
          <form className="comprar" onSubmit={adicionar}>
            <label>
              Quantidade
              <input
                type="number"
                min="1"
                max={Math.max(restante, 1)}
                value={quantidade}
                disabled={restante < 1}
                onChange={(evento) => setQuantidade(Number(evento.target.value) || 1)}
              />
            </label>
            <button className="botao botao-largo" type="submit" disabled={enviando || restante < 1}>
              {restante < 1 ? "Sem estoque" : "Adicionar ao carrinho"}
            </button>
          </form>
          <p className="nota">Na finalização, o carrinho vira uma mensagem pronta no WhatsApp.</p>
        </div>
      </section>

      {recentes.length > 0 && (
        <section className="bloco">
          <div className="titulo-bloco">
            <h2>Você viu recentemente</h2>
            <span className="etiqueta">Redis</span>
          </div>
          <div className="faixa">
            {recentes.map((item) => (
              <Link className="mini" key={item.id} to={`/produto/${item.id}`}>
                <Foto produto={item} />
                <strong>{item.nome}</strong>
                <Preco valor={item.preco} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
