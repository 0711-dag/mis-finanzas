# 💰 Control Financiero Familiar

App para llevar el control de gastos, ingresos, deudas y pagos de la familia.

## Funcionalidades
- 📋 Control de deudas con plan de pagos automático
- 📅 Calendario de pagos mes a mes
- 🏠 Gastos fijos con edición inline
- 🛒 Gastos variables por categoría
- 💰 Ingresos con filtrado por ciclo financiero
- 📊 Resumen con balance mensual
- 🔒 Autenticación con email/contraseña y Google
- 📅 Ciclo financiero personalizado (27 → 26)
- ☁️ Sincronización en tiempo real con Firebase

## Estructura del proyecto

```
src/
├── App.jsx                     # Root: auth check → Login o Dashboard
├── firebase.js                 # Configuración Firebase
├── validation.js               # Validación y sanitización
├── Login.jsx                   # Pantalla de login/registro
├── main.jsx                    # Entry point
│
├── utils/
│   ├── format.js               # Formateo de moneda, fechas, IDs
│   └── cycle.js                # Lógica del ciclo financiero (27→26)
│
├── hooks/
│   ├── useAutoLogout.js        # Cierre de sesión por inactividad
│   ├── useDebouncedSave.js     # Escritura con debounce a Firebase
│   └── useFinancialData.js     # CRUD completo + sync Firebase
│
├── components/
│   ├── Dashboard.jsx           # Layout principal, header, cards, grid
│   ├── DebtTable.jsx           # Tabla de deudas + plan de pagos
│   ├── FixedExpenses.jsx       # Gastos fijos
│   ├── IncomeTable.jsx         # Ingresos por ciclo
│   ├── VariableExpenses.jsx    # Gastos variables con categorías
│   ├── PaymentCalendar.jsx     # Calendario de pagos + toggle estado
│   ├── ReportModal.jsx         # Informe mensual
│   ├── Section.jsx             # Wrapper reutilizable
│   └── shared/
│       ├── ActionButtons.jsx   # Botones editar/eliminar
│       ├── CellInput.jsx       # Input inline para celdas
│       └── ValidationToast.jsx # Toast de errores
│
└── styles/
    └── global.css              # Estilos centralizados
```

## Cómo usar en local

```bash
npm install
npm run dev
```

La app se abrirá en `http://localhost:5173/`

## Desplegar gratis en Vercel

1. Sube este proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
3. Haz clic en "Import Project" y selecciona tu repositorio
4. Vercel detecta Vite automáticamente, haz clic en "Deploy"
5. ¡Listo! Tendrás una URL pública para usar desde cualquier dispositivo
