import pizza from '../assets/images/pizza.jpg'
import hamburguesa from '../assets/images/hamburguesa.jpg'
import sushi from '../assets/images/sushi.jpg'
import pollo from '../assets/images/pollo.jpg'
import ensalada from '../assets/images/ensalada.jpg'
import comboBurgerCola from '../assets/images/combo-burger-cola.jpg'
import comboBurgerPapas from '../assets/images/combo-burger-papas.jpg'
import pizzaPepperoni from '../assets/images/pizza-pepperoni.jpg'
import pizzaBbq from '../assets/images/pizza-bbq.jpg'
import papasParmesano from '../assets/images/papas-parmesano.jpg'
import costillas from '../assets/images/costillas.jpg'
import alitas from '../assets/images/alitas.jpg'
import nuggets from '../assets/images/nuggets.jpg'
import bandejaSushi from '../assets/images/bandeja-sushi.jpg'
import pasta from '../assets/images/pasta.jpg'
import tacos from '../assets/images/tacos.jpg'
import donas from '../assets/images/donas.jpg'
import brownie from '../assets/images/brownie.jpg'
import cheesecake from '../assets/images/cheesecake.jpg'
import parfait from '../assets/images/parfait.jpg'
import limonada from '../assets/images/limonada.jpg'
import jugoNaranja from '../assets/images/jugo-naranja.jpg'
import batido from '../assets/images/batido.jpg'
import cafe from '../assets/images/cafe.jpg'
import gaseosa from '../assets/images/gaseosa.jpg'

// Por ahora solo se ofrece comida; súper, farmacias, tiendas y mascotas quedan para más adelante.
// Las categorías de comida se muestran en este orden; cada una usa la foto de uno de sus productos.
export const CATEGORIAS = [
  { id: 'combos', nombre: 'Combos', imagen: comboBurgerCola },
  { id: 'pizzas', nombre: 'Pizzas', imagen: pizzaBbq },
  { id: 'hamburguesas', nombre: 'Hamburguesas y más', imagen: hamburguesa },
  { id: 'pollo', nombre: 'Pollo', imagen: alitas },
  { id: 'sushi', nombre: 'Sushi', imagen: bandejaSushi },
  { id: 'fuertes', nombre: 'Pasta y tacos', imagen: pasta },
  { id: 'ensaladas', nombre: 'Ensaladas', imagen: ensalada },
  { id: 'postres', nombre: 'Postres', imagen: cheesecake },
  { id: 'bebidas', nombre: 'Bebidas', imagen: limonada },
]

const producto = (idLocal, nombre, categoria, precioDemo, imagen) => ({
  idLocal,
  nombre,
  categoria,
  precioDemo,
  imagen,
  alt: `Fotografía de referencia: ${nombre}`,
})

// Catálogo de muestra (el catálogo real aún no está conectado).
// Los nombres no llevan comas: el pedido los guarda como texto ("Pizza x3, Sushi x2").
export const COMIDAS_DEMO = [
  producto('demo-combo-burger-cola', 'Combo Burger y Cola', 'combos', 11.9, comboBurgerCola),
  producto('demo-combo-burger-papas', 'Combo Burger y Papas', 'combos', 10.5, comboBurgerPapas),
  producto('demo-combo-pizza', 'Combo Pizza Pepperoni', 'combos', 13.9, pizzaPepperoni),

  producto('demo-pizza', 'Pizza', 'pizzas', 12.5, pizza),
  producto('demo-pizza-bbq', 'Pizza BBQ', 'pizzas', 13.5, pizzaBbq),

  producto('demo-hamburguesa', 'Hamburguesa', 'hamburguesas', 8.75, hamburguesa),
  producto('demo-papas', 'Papas Parmesano', 'hamburguesas', 4.5, papasParmesano),
  producto('demo-costillas', 'Costillas BBQ', 'hamburguesas', 16.9, costillas),

  producto('demo-pollo', 'Pollo', 'pollo', 10.25, pollo),
  producto('demo-alitas', 'Alitas BBQ', 'pollo', 9.5, alitas),
  producto('demo-nuggets', 'Nuggets crujientes', 'pollo', 6.5, nuggets),

  producto('demo-sushi', 'Sushi', 'sushi', 15, sushi),
  producto('demo-bandeja-sushi', 'Bandeja de Sushi', 'sushi', 24, bandejaSushi),

  producto('demo-pasta', 'Pasta Penne', 'fuertes', 9.9, pasta),
  producto('demo-tacos', 'Tacos al pastor', 'fuertes', 8.5, tacos),

  producto('demo-ensalada', 'Ensalada', 'ensaladas', 6.5, ensalada),

  producto('demo-donas', 'Donas glaseadas', 'postres', 5.5, donas),
  producto('demo-brownie', 'Brownie de chocolate', 'postres', 4.75, brownie),
  producto('demo-cheesecake', 'Cheesecake de frambuesa', 'postres', 5.9, cheesecake),
  producto('demo-parfait', 'Parfait de chocolate', 'postres', 5.25, parfait),

  producto('demo-limonada', 'Limonada', 'bebidas', 3.25, limonada),
  producto('demo-jugo', 'Jugo de naranja', 'bebidas', 3.5, jugoNaranja),
  producto('demo-batido', 'Batido de frutos rojos', 'bebidas', 4.5, batido),
  producto('demo-cafe', 'Café latte', 'bebidas', 2.9, cafe),
  producto('demo-gaseosa', 'Gaseosa', 'bebidas', 1.75, gaseosa),
]

export const formatoMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
})

/**
 * El pedido guarda sus productos como texto en las notas ("Pizza x3, Sushi x2").
 * Devuelve [{ comida, cantidad }] con la foto de cada producto reconocido.
 */
export function productosDeNotas(notas) {
  if (typeof notas !== 'string') return []

  return notas
    .split(',')
    .map((parte) => parte.trim().match(/^(.+?)\s+x(\d+)$/i))
    .filter(Boolean)
    .map(([, nombre, cantidad]) => ({
      comida: COMIDAS_DEMO.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase()),
      cantidad: Number(cantidad),
    }))
    .filter((producto) => producto.comida)
}
