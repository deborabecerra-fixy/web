# CLAUDE.md — Proyecto Web Fixy

## 1. Contexto del proyecto

Este repositorio contiene el ecosistema web de Fixy, una empresa argentina de logística orientada principalmente a e-commerce.

Fixy ofrece soluciones logísticas de punta a punta:

- Same Day: entregas en el mismo día.
- Next Day: entregas en 24 horas.
- Envíos al interior del país.
- Pick Up y retiro en sucursal.
- FixyFull: almacenamiento, gestión de stock y preparación de pedidos.
- FixyPay: cobro contra entrega mediante QR.
- Servicios vinculados con Mercado Libre, como Flex, colectas a CEDI y abastecimiento de Fulfillment.
- Integraciones mediante CSV, API y plugins para plataformas de e-commerce.

Fixy no es una tienda ni comercializa productos. Su función comienza luego de la venta: recibe, almacena, procesa, despacha, entrega, informa estados y, en determinados servicios, gestiona la cobranza.

No afirmar que Fixy utiliza “tecnología propia” salvo que esa información esté expresamente indicada. La tecnología puede ser provista mediante partners o integraciones.

---

## 2. Objetivo de las páginas

Las páginas no deben funcionar solamente como presentación institucional.

Su objetivo principal es:

1. Explicar rápidamente cada servicio.
2. Transmitir capacidad operativa, confianza y control.
3. Ayudar al visitante a identificar qué solución necesita.
4. Reducir dudas antes del contacto comercial.
5. Generar consultas o solicitudes de cotización.
6. Mantener al usuario dentro del ecosistema web de Fixy.

Cada landing debe tener una narrativa clara:

Problema del cliente → solución Fixy → funcionamiento → beneficios → cobertura → integración o diferencial → formulario o CTA.

El diseño debe acompañar esa narrativa y no limitarse a distribuir contenido en cards.

---

## 3. Rol esperado de Claude

Actuar como un perfil combinado de:

- Senior UX/UI Designer.
- Frontend Developer.
- Especialista en CRO y landing pages.
- Diseñador de sistemas visuales.
- Especialista en responsive design.
- Revisor de consistencia entre páginas.

Antes de modificar código:

1. Inspeccionar la estructura real del repositorio.
2. Identificar tecnologías, componentes y estilos existentes.
3. Revisar variables CSS, tipografías, breakpoints y dependencias.
4. Comprender qué elementos son globales y cuáles pertenecen a una página.
5. Evitar cambios globales que puedan romper otras landings.
6. No agregar frameworks o librerías sin necesidad.
7. Preservar formularios, eventos, integraciones, enlaces y funcionalidades existentes.

No asumir que el proyecto utiliza Bootstrap, Tailwind u otro framework. Verificarlo primero.

---

## 4. Identidad visual de Fixy

### Color principal obligatorio

```css
--fixy-blue: #008FC3;