import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { LOJA } from "../marca";
import { useLoja } from "../contexto";

export default function Login() {
  const { sessao, atualizarSessao, avisar } = useLoja();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.title = `Entrar · ${LOJA}`;
    if (sessao.admin) navigate("/admin", { replace: true });
  }, [sessao.admin, navigate]);

  async function entrar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const dados = await api("/api/login", { method: "POST", body: { email, senha } });
      await atualizarSessao();
      avisar(dados.mensagem);
      navigate("/admin");
    } catch (erro) {
      avisar(erro.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="login">
      <p className="sobrancelha">Supabase</p>
      <h1>Entrar no painel</h1>
      <p className="nota">Demonstração: admin@caioslivre.com · senha caio123</p>
      <form className="formulario caixa" onSubmit={entrar}>
        <label className="campo" htmlFor="email">
          E-mail
          <input id="email" type="email" autoComplete="username" value={email} onChange={(evento) => setEmail(evento.target.value)} required />
        </label>
        <label className="campo" htmlFor="senha">
          Senha
          <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} required />
        </label>
        <button className="botao botao-largo" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </section>
  );
}
