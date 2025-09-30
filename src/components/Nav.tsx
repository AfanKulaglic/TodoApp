"use client"

import Link from "next/link"
import React from "react"

export default function Nav() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/login" className="nav-link">Prijava</Link>
        <Link href="/register" className="nav-link">Registracija</Link>
      </div>
    </nav>
  )
}
