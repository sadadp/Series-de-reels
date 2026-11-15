// Receta: Enchiladas suizas con bechamel
// acciones extra para platillos: drop/stir con destino "sarten", arma, baña (capa), queso, hornea
window.RECETA = {
  platillo: "enchiladas",
  titulo: ["ENCHILADAS", "SUIZAS"],
  letrero: "RECETA DEL CHEF MICHI",
  pizarron: ["ENCHILADAS", "suizas con bechamel"],
  usuario: "@chefmichi",
  pasos: [
    { accion: "hook", dur: 3.0, texto: "¡Mira nomás qué enchiladas tan cremositas!" },
    { accion: "rewind", dur: 1.0, texto: "" },
    { accion: "intro", dur: 2.2, texto: "¡Hoy, enchiladas suizas!" },
    { accion: "presenta", dur: 2.0, ingrediente: "tortilla", etiqueta: "tortillas y pollo", texto: "Necesitas tortillas y pollo," },
    { accion: "presenta", dur: 2.0, ingrediente: "tomate", cuantos: 2, etiqueta: "tomate verde y chile", texto: "tomate verde con chile," },
    { accion: "presenta", dur: 2.0, ingrediente: "queso", etiqueta: "leche y queso", texto: "leche y mucho queso." },
    { accion: "drop", dur: 3.0, ingredientes: ["tomate", "tomate", "chile"], color: "#7fb84a", cantidad: 0.75, texto: "Licuamos el tomate con el chile," },
    { accion: "drop", destino: "sarten", dur: 3.4, ingredientes: ["mantequilla", "harina", "leche"], color: "#fbf6ea", texto: "y en el sartén, mantequilla, harina y leche: ¡bechamel!" },
    { accion: "arma", dur: 3.0, usa: ["tortilla"], texto: "Rellenamos con pollo y enrollamos." },
    { accion: "baña", capa: "salsa", dur: 2.3, texto: "Bañamos con salsa verde," },
    { accion: "baña", capa: "bechamel", dur: 2.0, texto: "luego bechamel" },
    { accion: "queso", dur: 2.2, usa: ["queso"], texto: "¡y mucho queso!" },
    { accion: "hornea", dur: 2.8, texto: "Al horno hasta que gratine." },
    { accion: "serve", dur: 3.2, texto: "Con crema y cebolla. ¡Qué rico!" },
    { accion: "outro", dur: 3.6, texto: "¿Verdes o rojas? ¡Comenta!" },
  ],
};
