'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import Image from "next/image";
import welcome_img from "../../../public/assets/welcome_vector.png"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length <= 6) {
      alert('Lozinka mora imati više od 6 karaktera.')
      return
    }

    if (password !== confirmPassword) {
      alert('Lozinke se ne poklapaju. Molimo unesite ih ponovo.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    alert("Verifikujte profil preko email-a")
    router.push('/login')
  }

  return (
    <div className="section-center">
      <div className="card">
        <h1>Registracija</h1>
        <Image src={welcome_img} alt="Welcome" className="welcome_img" />
        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Lozinka"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Ponovi lozinku"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <a href="/login">Prijavi se</a>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Učitavanje...' : 'Kreiraj nalog'}
          </button>
        </form>
        {errorMsg && <p className="error">{errorMsg}</p>}
      </div>
    </div>
  )
}
