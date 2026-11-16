import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api";
import { useAnimacao } from "../animacao";
import { useLoja } from "../contexto";
import { LOJA } from "../marca";

export default function Layout({ children }) {
  const { sessao, aviso, fecharAviso, atualizarSessao, avisar } = useLoja();
  const { reduzir } = useAnimacao();
  const navigate = useNavigate();

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(fecharAviso, 3200);
    return () => clearTimeout(id);
  }, [aviso, fecharAviso]);

  async function sair() {
    try {
      const dados = await api("/api/sair", { method: "POST", body: {} });
      await atualizarSessao();
      avisar(dados.mensagem);
      navigate("/");
    } catch (erro) {
      avisar(erro.message, "erro");
    }
  }

  return (
    <>
      <div className="mancha mancha-a" />
      <div className="mancha mancha-b" />
      <header className="topo">
        <div className="barra">
          <Link className="marca" to="/">
            <span className="marca-selo">C</span>
            {LOJA}
          </Link>
          <Busca />
          <nav>
            <NavLink to="/" end>Produtos</NavLink>
            <NavLink className="carrinho-link" to="/carrinho">
              Carrinho
              <AnimatePresence mode="popLayout">
                {sessao.quantidade_carrinho > 0 && (
                  <motion.span
                    key={sessao.quantidade_carrinho}
                    className="badge"
                    initial={reduzir ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                  >
                    {sessao.quantidade_carrinho}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
            {sessao.admin ? (
              <>
                <NavLink to="/admin">Painel</NavLink>
                <button className="link-botao" type="button" onClick={sair}>Sair</button>
              </>
            ) : (
              <NavLink to="/admin/login">Entrar</NavLink>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo">{children}</main>

      <footer>
        <div className="rodape">
          <strong>{LOJA}</strong>
          <p>Login no Supabase · produtos no MongoDB · vistos recentemente no Redis.</p>
        </div>
      </footer>

      <AnimatePresence>
        {aviso && (
          <motion.p
            key={aviso.id}
            className={`toast toast-${aviso.tipo}`}
            role="status"
            initial={reduzir ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            {aviso.texto}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

function Busca() {
  const [params] = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") || "");
  const navigate = useNavigate();

  useEffect(() => {
    setTexto(params.get("q") || "");
  }, [params]);

  function enviar(evento) {
    evento.preventDefault();
    const termo = texto.trim();
    navigate(termo ? `/?q=${encodeURIComponent(termo)}` : "/");
  }

  return (
    <form className="busca" onSubmit={enviar}>
      <input
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Buscar produtos e categorias"
        aria-label="Buscar produtos"
      />
      <button type="submit" aria-label="Buscar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
