"use client"

import Link from "next/link"
import React, { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../app/lib/supabaseClient"
import { User } from "@supabase/supabase-js"

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  // Provjera da li je korisnik prijavljen
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()

    // Osluškuj promjene u auth stanju
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Ako je ruta /login ili /register, ne prikazuj Nav
  if (pathname === "/login" || pathname === "/register") {
    return null
  }

  // Funkcija za logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Funkcija za povratak na prethodnu stranicu
  const handleBack = () => {
    router.back()
  }

  // Provjera da li prikazati "Nazad" dugme
  const showBackButton = !["/profiles", "/adminProfiles"].includes(pathname)

  return (
    <nav className="navbar">
      <div className="nav-container">
        {user ? (
          <div style={{display: "flex"}}>
            {showBackButton && (
              <button onClick={handleBack} className="nav-link">
                ⬅
              </button>
            )}
            <button onClick={handleLogout} className="nav-link" id="nav-link-logout">
            ➜] Logout
            </button>
          </div>
        ) : (
          <>
            <Link href="/login" className="nav-link">Prijava</Link>
            <Link href="/register" className="nav-link">Registracija</Link>
          </>
        )}
      </div>
    </nav>
  )
}
