import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, reais } from "../api";
import { useAnimacao } from "../animacao";
import Preco from "./Preco";

const PIX = "00020126580014BR.GOV.BCB.PIX0136caioslivre@loja520400005303986";

export default function Pagamento({ total, onFechar, onAprovado }) {
  const { reduzir } = useAnimacao();
  const [metodo, setMetodo] = useState("cartao");
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recibo, setRecibo] = useState(null);

  function digitos(valor) {
    return valor.replace(/\D/g, "");
  }

  function aoNumero(valor) {
    const limpo = digitos(valor).slice(0, 16);
    setNumero(limpo.replace(/(\d{4})(?=\d)/g, "$1 ").trim());
  }

  function aoValidade(valor) {
    const limpo = digitos(valor).slice(0, 4);
    setValidade(limpo.length > 2 ? `${limpo.slice(0, 2)}/${limpo.slice(2)}` : limpo);
  }

  function cartaoValido() {
    const pan = digitos(numero);
    if (nome.trim().length < 3) return "Informe o nome impresso no cartão.";
    if (pan.length < 13) return "O número do cartão está incompleto.";
    if (pan.endsWith("0000")) return "Pagamento recusado. Tente outro cartão.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validade)) return "Validade inválida. Use MM/AA.";
    if (digitos(cvv).length < 3) return "CVV inválido.";
    return "";
  }

  async function pagar(evento) {
    evento.preventDefault();
    setErro("");
    if (metodo === "cartao") {
      const mensagem = cartaoValido();
      if (mensagem) {
        setErro(mensagem);
        return;
      }
    }

    setEnviando(true);
    try {
      await esperar(reduzir ? 0 : 900);
      const resposta = await api("/api/pagamento", { method: "POST", body: { metodo } });
      setRecibo(resposta);
      onAprovado(resposta);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      className="cortina"
      onClick={onFechar}
      initial={reduzir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        className="pagamento"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pagamento"
        onClick={(evento) => evento.stopPropagation()}
        initial={reduzir ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
      >
        <div className="pagamento-topo">
          <h2 id="titulo-pagamento">Pagamento</h2>
          <button className="botao-texto" type="button" onClick={onFechar}>Fechar</button>
        </div>
        <p className="nota">Simulação. Nenhum valor é cobrado e o cartão não é salvo.</p>

        <AnimatePresence mode="wait">
          {recibo ? (
            <motion.div key="ok" className="recibo" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="selo-ok">ok</span>
              <h3>Pagamento aprovado</h3>
              <p>Protocolo {recibo.protocolo}</p>
              <strong>{reais(recibo.total)}</strong>
              <button className="botao botao-largo" type="button" onClick={onFechar}>Continuar</button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={pagar}>
              <div className="abas" role="tablist">
                <button type="button" className={metodo === "cartao" ? "ativa" : ""} onClick={() => setMetodo("cartao")}>Cartão</button>
                <button type="button" className={metodo === "pix" ? "ativa" : ""} onClick={() => setMetodo("pix")}>Pix</button>
              </div>

              {metodo === "cartao" ? (
                <div className="grade-campos">
                  <label className="campo campo-largo">Nome no cartão<input value={nome} onChange={(evento) => setNome(evento.target.value)} autoComplete="cc-name" required /></label>
                  <label className="campo campo-largo">Número<input value={numero} onChange={(evento) => aoNumero(evento.target.value)} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required /></label>
                  <label className="campo">Validade<input value={validade} onChange={(evento) => aoValidade(evento.target.value)} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" required /></label>
                  <label className="campo">CVV<input value={cvv} onChange={(evento) => setCvv(digitos(evento.target.value).slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" placeholder="123" required /></label>
                </div>
              ) : (
                <div className="pix">
                  <span className="qr" aria-hidden="true" />
                  <p>Código Pix copia e cola</p>
                  <code>{PIX}</code>
                </div>
              )}

              <Preco valor={total} grande />
              {erro && <p className="aviso aviso-erro">{erro}</p>}
              <button className="botao botao-largo" type="submit" disabled={enviando}>
                {enviando ? "Processando…" : metodo === "pix" ? "Confirmar Pix" : "Pagar agora"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  );
}

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
