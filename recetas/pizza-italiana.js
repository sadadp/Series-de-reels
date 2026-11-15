// Receta: Pizza italiana casera
// acciones nuevas: extiende (masa), salsa, queso (sobre la pizza), hornea, serve con queso que se estira
window.RECETA = {
  platillo: "pizza",
  titulo: ["PIZZA", "ITALIANA"],
  letrero: "RECETA DEL CHEF MICHI",
  pizarron: ["PIZZA", "italiana casera"],
  usuario: "@chefmichi",
  pasos: [
    { accion: "hook", dur: 2.6, texto: "¿Pizza italiana en casa? ¡Mira nomás!" },
    { accion: "rewind", dur: 0.9, texto: "" },
    { accion: "intro", dur: 2.2, texto: "¡Hoy hacemos pizza italiana!" },
    { accion: "presenta", dur: 2.6, ingrediente: "harina", etiqueta: "harina, levadura y agua", texto: "Necesitas harina, levadura y agua tibia," },
    { accion: "presenta", dur: 2.4, ingrediente: "jitomate", cuantos: 2, etiqueta: "tomate, mozzarella y albahaca", texto: "tomate, mozzarella y albahaca." },
    { accion: "drop", dur: 3.2, ingredientes: ["harina", "agua"], color: "#f3e4c4", cantidad: 0.6, texto: "Primero mezclamos la harina con la levadura y el agua," },
    { accion: "stir", dur: 2.8, color: "#f3e4c4", texto: "amasamos y dejamos reposar una hora." },
    { accion: "extiende", dur: 2.6, texto: "Luego la estiramos bien delgadita." },
    { accion: "salsa", dur: 2.0, texto: "Después, salsa de tomate," },
    { accion: "queso", dur: 2.2, texto: "mozzarella y albahaca." },
    { accion: "hornea", dur: 2.4, texto: "Al horno bien caliente, diez minutos." },
    { accion: "serve", dur: 2.8, texto: "¡Y mira cómo se estira el queso!" },
    { accion: "outro", dur: 3.0, texto: "¿Con piña o sin piña? ¡Comenta!" },
  ],
};
