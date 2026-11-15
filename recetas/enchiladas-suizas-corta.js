// Receta: Enchiladas suizas con bechamel
// acciones extra para platillos: drop/stir con destino "sarten", arma, baña (capa), queso, hornea
window.RECETA = {
  platillo: "enchiladas",
  titulo: ["ENCHILADAS", "SUIZAS"],
  letrero: "RECETA DEL CHEF MICHI",
  pizarron: ["ENCHILADAS", "suizas con bechamel"],
  usuario: "@chefmichi",
  pasos: [
    { accion: "hook", dur: 2.6, texto: "¡Mira nomás qué enchiladas tan cremositas!" },
    { accion: "rewind", dur: 0.9, texto: "" },
    { accion: "intro", dur: 1.8, texto: "¡Hoy, enchiladas suizas!" },
    { accion: "presenta", dur: 1.6, ingrediente: "tortilla", etiqueta: "tortillas y pollo", texto: "Necesitas tortillas y pollo," },
    { accion: "presenta", dur: 1.6, ingrediente: "tomate", cuantos: 2, etiqueta: "tomate verde y chile", texto: "tomate verde con chile," },
    { accion: "presenta", dur: 1.6, ingrediente: "queso", etiqueta: "leche y queso", texto: "leche y mucho queso." },
    { accion: "drop", dur: 2.4, ingredientes: ["tomate", "tomate", "chile"], color: "#7fb84a", cantidad: 0.75, texto: "Licuamos el tomate con el chile," },
    { accion: "drop", destino: "sarten", dur: 2.6, ingredientes: ["mantequilla", "harina", "leche"], color: "#fbf6ea", texto: "y en el sartén, mantequilla, harina y leche: ¡bechamel!" },
    { accion: "arma", dur: 2.4, usa: ["tortilla"], texto: "Rellenamos con pollo y enrollamos." },
    { accion: "baña", capa: "salsa", dur: 1.9, texto: "Bañamos con salsa verde," },
    { accion: "baña", capa: "bechamel", dur: 1.9, texto: "bechamel" },
    { accion: "queso", dur: 1.9, usa: ["queso"], texto: "¡y mucho queso!" },
    { accion: "hornea", dur: 2.2, texto: "Al horno hasta que gratine." },
    { accion: "serve", dur: 2.7, texto: "Con crema y cebolla. ¡Qué rico!" },
    { accion: "outro", dur: 3.0, texto: "¿Verdes o rojas? ¡Comenta!" },
  ],
};
