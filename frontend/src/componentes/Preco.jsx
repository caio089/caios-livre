import { partesPreco } from "../api";

export default function Preco({ valor, grande = false }) {
  const { reais, centavos } = partesPreco(valor);
  return (
    <span className={grande ? "preco preco-grande" : "preco"}>
      <small>R$</small>
      {reais}
      <sup>{centavos}</sup>
    </span>
  );
}
