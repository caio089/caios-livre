import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAnimacao } from "./animacao";
import Layout from "./componentes/Layout";
import { ProvedorLoja } from "./contexto";
import Carrinho from "./paginas/Carrinho";
import Catalogo from "./paginas/Catalogo";
import Login from "./paginas/Login";
import NaoEncontrado from "./paginas/NaoEncontrado";
import Painel from "./paginas/Painel";
import Produto from "./paginas/Produto";

export default function App() {
  return (
    <ProvedorLoja>
      <Layout>
        <Transicao />
      </Layout>
    </ProvedorLoja>
  );
}

function Transicao() {
  const location = useLocation();
  const animacao = useAnimacao();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...animacao.pagina}>
        <Routes location={location}>
          <Route path="/" element={<Catalogo />} />
          <Route path="/produto/:id" element={<Produto />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<Painel />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
