import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

const LojaContexto = createContext(null);

export function ProvedorLoja({ children }) {
  const [sessao, setSessao] = useState({ admin: false, quantidade_carrinho: 0 });
  const [aviso, setAviso] = useState(null);

  const atualizarSessao = useCallback(async () => {
    const dados = await api("/api/sessao");
    setSessao(dados);
    return dados;
  }, []);

  useEffect(() => {
    atualizarSessao().catch(() => {});
  }, [atualizarSessao]);

  function avisar(texto, tipo = "ok") {
    setAviso({ texto, tipo, id: Date.now() });
  }

  function definirQuantidade(quantidade) {
    setSessao((atual) => ({ ...atual, quantidade_carrinho: quantidade }));
  }

  return (
    <LojaContexto.Provider
      value={{ sessao, atualizarSessao, aviso, avisar, fecharAviso: () => setAviso(null), definirQuantidade }}
    >
      {children}
    </LojaContexto.Provider>
  );
}

export function useLoja() {
  return useContext(LojaContexto);
}
