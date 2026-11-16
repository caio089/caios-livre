import { useReducedMotion } from "framer-motion";

const suave = [0.22, 1, 0.36, 1];

export function useAnimacao() {
  const reduzir = useReducedMotion();
  if (reduzir) {
    return { reduzir: true, pagina: {}, lista: {}, item: {} };
  }

  return {
    reduzir: false,
    pagina: {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
      transition: { duration: 0.34, ease: suave },
    },
    lista: {
      initial: "oculto",
      animate: "visivel",
      variants: {
        oculto: {},
        visivel: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      },
    },
    item: {
      variants: {
        oculto: { opacity: 0, y: 22 },
        visivel: { opacity: 1, y: 0, transition: { duration: 0.45, ease: suave } },
      },
    },
  };
}
