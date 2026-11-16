import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErroApi, api, reais } from "../api";
import { LOJA } from "../marca";
import { useLoja } from "../contexto";
import { Foto } from "../componentes/CardProduto";

const VAZIO = { nome: "", categoria: "", preco: "", estoque: "10", descricao: "", imagem: "" };

export default function Painel() {
  const { avisar, definirQuantidade } = useLoja();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [pronto, setPronto] = useState(false);
  const [aviso, setAviso] = useState("");
  const [formulario, setFormulario] = useState(VAZIO);
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    return api("/api/admin/produtos")
      .then((dados) => {
        setProdutos(dados.produtos);
        setAviso(dados.aviso || "");
        setPronto(true);
      })
      .catch((erro) => {
        if (erro instanceof ErroApi && erro.status === 401) {
          navigate("/admin/login", { replace: true });
          return;
        }
        avisar(erro.message, "erro");
      });
  }

  useEffect(() => {
    document.title = `Anunciar · ${LOJA}`;
    carregar();
  }, []);

  function campo(nome) {
    return (evento) => setFormulario((atual) => ({ ...atual, [nome]: evento.target.value }));
  }

  async function publicar(evento) {
    evento.preventDefault();
    setEnviando(true);
    const corpo = new FormData();
    Object.entries(formulario).forEach(([chave, valor]) => corpo.append(chave, valor));
    if (arquivo) corpo.append("arquivo", arquivo);
    try {
      const dados = await api("/api/admin/produtos", { method: "POST", body: corpo });
      avisar(dados.mensagem);
      setFormulario(VAZIO);
      setArquivo(null);
      evento.target.reset();
      await carregar();
    } catch (erro) {
      avisar(erro.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(produto) {
    if (!window.confirm(`Excluir ${produto.nome}?`)) return;
    try {
      const dados = await api(`/api/admin/produtos/${produto.id}`, { method: "DELETE" });
      if (dados.quantidade_carrinho !== undefined) definirQuantidade(dados.quantidade_carrinho);
      avisar(dados.mensagem);
      await carregar();
    } catch (erro) {
      avisar(erro.message, "erro");
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Publicar produto</h1>
      <p className="subtitulo">O anúncio entra no MongoDB e aparece na hora na busca.</p>
      {aviso && <p className="aviso aviso-erro">{aviso}</p>}
      <div className="painel">
        <form className="formulario caixa" onSubmit={publicar}>
          <div className="grade-campos">
            <label className="campo campo-largo" htmlFor="nome">Nome<input id="nome" maxLength={80} value={formulario.nome} onChange={campo("nome")} required /></label>
            <label className="campo" htmlFor="categoria">Categoria<input id="categoria" maxLength={40} placeholder="Papelaria" value={formulario.categoria} onChange={campo("categoria")} required /></label>
            <label className="campo" htmlFor="preco">Preço<input id="preco" inputMode="decimal" placeholder="19,90" value={formulario.preco} onChange={campo("preco")} required /></label>
            <label className="campo" htmlFor="estoque">Estoque<input id="estoque" type="number" min="0" value={formulario.estoque} onChange={campo("estoque")} required /></label>
            <label className="campo campo-largo" htmlFor="descricao">Descrição<textarea id="descricao" maxLength={500} rows={4} value={formulario.descricao} onChange={campo("descricao")} required /></label>
            <label className="campo campo-largo" htmlFor="arquivo">Foto<input id="arquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(evento) => setArquivo(evento.target.files?.[0] || null)} /></label>
            <label className="campo campo-largo" htmlFor="imagem">Ou link da foto<input id="imagem" type="url" placeholder="https://..." value={formulario.imagem} onChange={campo("imagem")} /></label>
          </div>
          <button className="botao botao-largo" type="submit" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
        </form>
        <section className="caixa">
          <h2>Seus anúncios {produtos.length > 0 && <span className="etiqueta">{produtos.length}</span>}</h2>
          {!pronto ? (
            <p className="nota">Carregando anúncios…</p>
          ) : produtos.length === 0 ? (
            <p className="nota">Nenhum anúncio ainda.</p>
          ) : (
            <ul className="admin-lista">
              {produtos.map((produto) => (
                <li key={produto.id}>
                  <Link className="item-foto" to={`/produto/${produto.id}`}><Foto produto={produto} /></Link>
                  <div className="item-info">
                    <Link to={`/produto/${produto.id}`}>{produto.nome}</Link>
                    <span>{produto.categoria} · {produto.estoque} un.</span>
                  </div>
                  <strong>{reais(produto.preco)}</strong>
                  <button className="botao-texto" type="button" onClick={() => excluir(produto)}>Excluir</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
