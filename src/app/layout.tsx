import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Block-Game',
  applicationName: 'Block Game',
  description: 'Next.js Block Game',
  authors: {
    name: 'Jake Xu',
    url: 'https://github.com/JakeXu/block-game'
  },
  icons: 'favicon.ico'
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
