// Receta: Mole poblano (versión casera, corta)
window.RECETA = {
  platillo: "mole",
  titulo: ["MOLE", "POBLANO"],
  letrero: "RECETA DEL CHEF MICHI",
  pizarron: ["MOLE POBLANO", "receta casera"],
  usuario: "@chefmichi",
  pasos: [
    { accion: "hook", dur: 2.6, texto: "¡Mira nomás qué mole tan brillosito!" },
    { accion: "rewind", dur: 0.9, texto: "" },
    { accion: "intro", dur: 2.4, texto: "¡Hoy hacemos mole poblano!" },
    { accion: "presenta", dur: 1.8, ingrediente: "chileSeco", cuantos: 3, etiqueta: "chiles mulato, ancho y pasilla", texto: "Necesitas chiles mulato, ancho y pasilla," },
    { accion: "presenta", dur: 1.6, ingrediente: "chocolate", etiqueta: "1 tableta de chocolate", texto: "chocolate de mesa," },
    { accion: "presenta", dur: 1.6, ingrediente: "ajonjoli", etiqueta: "ajonjolí y almendras", texto: "ajonjolí con almendras" },
    { accion: "presenta", dur: 1.6, ingrediente: "pieza", cuantos: 2, etiqueta: "pollo cocido", texto: "y pollo cocido." },
    { accion: "drop", destino: "sarten", dur: 2.2, ingredientes: ["chileSeco", "chileSeco", "chileSeco"], color: "#4a1a12", texto: "Primero tostamos los chiles." },
    { accion: "drop", dur: 2.2, ingredientes: ["ajonjoli"], color: "#5a2618", cantidad: 0.75, texto: "Luego los licuamos con el ajonjolí." },
    { accion: "stir", dur: 1.9, color: "#4a2016", texto: "¡Queda una pasta bien oscura!" },
    { accion: "drop", destino: "sarten", dur: 2.0, ingrediente: "chocolate", color: "#3d1c12", texto: "Después, al sartén con el chocolate," },
    { accion: "stir", destino: "sarten", dur: 2.2, color: "#4b2215", texto: "y movemos hasta que espese. ¡Así sale el mole!" },
    { accion: "serve", dur: 3.0, usa: ["pieza"], texto: "Y al final, pollo bañado en mole con ajonjolí. ¡Qué rico!" },
    { accion: "outro", dur: 3.2, texto: "¡Comenta qué receta quieres que haga Michi!" },
  ],
};
