import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAnimacao } from "../animacao";
import { useLoja } from "../contexto";
import Preco from "./Preco";

export default function CardProduto({ produto, variants }) {
  const { avisar, definirQuantidade } = useLoja();
  const { reduzir } = useAnimacao();
  const [enviando, setEnviando] = useState(false);
  const esgotado = produto.estoque < 1;

  async function adicionar(evento) {
    evento.preventDefault();
    if (enviando || esgotado) return;
    setEnviando(true);
    try {
      const dados = await api(`/api/carrinho/${produto.id}`, { method: "POST", body: { quantidade: 1 } });
      definirQuantidade(dados.quantidade_carrinho);
      avisar(dados.mensagem);
    } catch (erro) {
      avisar(erro.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.article className="card" variants={variants} layout={!reduzir} whileHover={reduzir ? undefined : { y: -8 }}>
      <Link className="card-midia" to={`/produto/${produto.id}`}>
        <Foto produto={produto} />
        <span className="categoria">{produto.categoria}</span>
        <h2>{produto.nome}</h2>
      </Link>
      <div className="card-rodape">
        <Preco valor={produto.preco} />
        <button className="botao" type="button" onClick={adicionar} disabled={enviando || esgotado}>
          {esgotado ? "Esgotado" : enviando ? "Entrando" : "Adicionar"}
        </button>
      </div>
    </motion.article>
  );
}

export function Foto({ produto, grande = false }) {
  const [falhou, setFalhou] = useState(false);
  if (!produto.imagem || falhou) {
    return (
      <div className={grande ? "foto foto-grande monograma" : "foto monograma"} aria-hidden="true">
        {produto.nome.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <div className={grande ? "foto foto-grande" : "foto"}>
      <img src={produto.imagem} alt="" onError={() => setFalhou(true)} />
    </div>
  );
}
