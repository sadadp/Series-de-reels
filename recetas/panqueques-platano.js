// Receta: Panqueques de plátano (3 ingredientes)
// accion: hook | rewind | intro | presenta | drop | stir | pour | flip | serve | outro
//   hook     -> abre con el plato terminado en primer plano (gancho)
//   rewind   -> efecto ⏪ de regreso al inicio (sin texto)
//   presenta -> el ingrediente baja colgado a la repisa con su etiqueta
// ingredientes disponibles: platano, huevo, avena, leche, harina, azucar, mantequilla, miel, canela
window.RECETA = {
  titulo: ["PANQUEQUES", "DE PLÁTANO"],
  letrero: "RECETA DEL CHEF MICHI",
  pizarron: ["PANQUEQUES", "de plátano"],
  usuario: "@chefmichi",
  toppings: ["miel", "mantequilla", "canela"],
  voz: { motor: "chatterbox", ref: "herramientas/voces/michi-euforico.wav", exageracion: 1.2, tono: 1.055, vel: 1.07 },
  pasos: [
    { accion: "hook", dur: 2.6, texto: "¡Mira nomás qué esponjositos!" },
    { accion: "rewind", dur: 0.9, texto: "" },
    { accion: "intro", dur: 2.6, texto: "¡Hoy hacemos panqueques de plátano!" },
    { accion: "presenta", dur: 2.3, ingrediente: "platano", etiqueta: "1 plátano maduro", texto: "¡Un plátano bien maduro!" },
    { accion: "presenta", dur: 2.0, ingrediente: "huevo", cuantos: 2, etiqueta: "2 huevos", texto: "¡Dos huevitos!" },
    { accion: "presenta", dur: 2.2, ingrediente: "avena", etiqueta: "½ taza de avena", texto: "¡Media taza de avena!" },
    { accion: "drop", dur: 2.4, ingrediente: "platano", color: "#f2d36b", cantidad: 0.3, texto: "¡Machaca el plátano!" },
    { accion: "drop", dur: 2.4, ingredientes: ["huevo", "huevo"], color: "#f6c64a", cantidad: 0.25, texto: "¡Ahora los huevos!" },
    { accion: "drop", dur: 2.2, ingrediente: "avena", color: "#e3c28a", cantidad: 0.25, texto: "¡Y la avena!" },
    { accion: "stir", dur: 3.0, texto: "¡Mezcla, mezcla, mezcla, yupi!" },
    { accion: "pour", dur: 3.4, texto: "¡Al sartén con mantequillita!" },
    { accion: "flip", dur: 3.0, texto: "¡Salen burbujitas y volteamos!" },
    { accion: "serve", dur: 3.2, texto: "¡Con miel y canela! ¡Qué rico!" },
    { accion: "outro", dur: 4.2, texto: "¡Comenta qué receta quieres que haga Michi!" },
  ],
};
