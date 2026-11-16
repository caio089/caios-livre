import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LOJA } from "../marca";

export default function NaoEncontrado() {
  useEffect(() => {
    document.title = `Página não encontrada · ${LOJA}`;
  }, []);

  return (
    <section className="vazio">
      <h1>Não encontramos essa página</h1>
      <p>O endereço não existe na loja.</p>
      <Link className="botao" to="/">Ir para produtos</Link>
    </section>
  );
}
