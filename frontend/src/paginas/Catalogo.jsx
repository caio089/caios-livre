import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { LOJA } from "../marca";
import { useAnimacao } from "../animacao";
import CardProduto from "../componentes/CardProduto";
import { Foto } from "../componentes/CardProduto";
import Preco from "../componentes/Preco";

export default function Catalogo() {
  const [params] = useSearchParams();
  const termo = params.get("q") || "";
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const animacao = useAnimacao();

  useEffect(() => {
    document.title = termo ? `${termo} · ${LOJA}` : LOJA;
    let ativo = true;
    setDados(null);
    api(`/api/produtos${termo ? `?q=${encodeURIComponent(termo)}` : ""}`)
      .then((resposta) => {
        if (ativo) setDados(resposta);
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message);
      });
    return () => {
      ativo = false;
    };
  }, [termo]);

  if (erro) return <p className="aviso aviso-erro">{erro}</p>;
  if (!dados) return <Carregando />;

  return (
    <>
      <section className="hero">
        <p className="sobrancelha">{termo ? "Busca" : "Catálogo"}</p>
        <h1>{termo ? `Resultados para “${termo}”` : "O que você precisa, sem fila."}</h1>
        <p>
          {termo
            ? `${dados.produtos.length} anúncio${dados.produtos.length === 1 ? "" : "s"}`
            : "Escolha, monte o carrinho e pague na hora."}
        </p>
      </section>

      {dados.aviso && <p className="aviso aviso-erro">{dados.aviso}</p>}
      {dados.aviso_redis && <p className="aviso aviso-erro">{dados.aviso_redis}</p>}

      {dados.recentes.length > 0 && (
        <section className="bloco">
          <div className="titulo-bloco">
            <h2>Você viu recentemente</h2>
            <span className="etiqueta">Redis</span>
          </div>
          <motion.div className="faixa" {...animacao.lista}>
            {dados.recentes.map((produto) => (
              <motion.div key={produto.id} variants={animacao.item.variants}>
                <Link className="mini" to={`/produto/${produto.id}`}>
                  <Foto produto={produto} />
                  <strong>{produto.nome}</strong>
                  <Preco valor={produto.preco} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {dados.produtos.length === 0 ? (
        <section className="vazio">
          <h2>{termo ? "Nada com esse nome." : "Ainda não há produtos."}</h2>
          <p>{termo ? "Tente outra palavra." : "O administrador publica os itens no painel."}</p>
        </section>
      ) : (
        <motion.section className="grade" {...animacao.lista}>
          {dados.produtos.map((produto) => (
            <CardProduto key={produto.id} produto={produto} variants={animacao.item.variants} />
          ))}
        </motion.section>
      )}
    </>
  );
}

function Carregando() {
  return (
    <div className="grade" aria-hidden="true">
      <div className="esqueleto" />
      <div className="esqueleto" />
      <div className="esqueleto" />
    </div>
  );
}
