// Receta: Hot cakes de plátano (3 ingredientes)
// accion: intro | drop | stir | pour | flip | serve | outro
// ingredientes disponibles: platano, huevo, avena, leche, harina, azucar, mantequilla, miel, canela
window.RECETA = {
  titulo: ["HOT CAKES", "DE PLÁTANO"],
  pizarron: ["HOT CAKES", "3 INGREDIENTES"],
  usuario: "@chefmichi",
  toppings: ["miel", "mantequilla", "canela"],
  pasos: [
    { accion: "intro", dur: 3.0, texto: "Hot cakes con solo tres ingredientes" },
    { accion: "drop", dur: 3.0, ingrediente: "platano", color: "#f2d36b", cantidad: 0.3, texto: "Machaca un plátano bien maduro" },
    { accion: "drop", dur: 3.0, ingredientes: ["huevo", "huevo"], color: "#f6c64a", cantidad: 0.25, texto: "Agrega dos huevos" },
    { accion: "drop", dur: 3.0, ingrediente: "avena", color: "#e3c28a", cantidad: 0.25, texto: "Y media taza de avena" },
    { accion: "stir", dur: 3.2, texto: "Mezcla hasta que quede suave" },
    { accion: "pour", dur: 3.2, texto: "Sartén a fuego bajo con poquita mantequilla" },
    { accion: "flip", dur: 3.2, texto: "Voltea cuando salgan burbujitas" },
    { accion: "serve", dur: 3.4, texto: "Sirve con miel y canela" },
    { accion: "outro", dur: 3.0, texto: "¡Listo! Sígueme para más recetas" },
  ],
};
