import { Inter, Space_Mono, Bebas_Neue } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-mono' })
const display = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' })

export const metadata = {
  title: 'AFTIM Dashboard — Hechizo Gourmet',
  description: 'Dashboard de ventas e inventario en tiempo real',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${mono.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  )
}
