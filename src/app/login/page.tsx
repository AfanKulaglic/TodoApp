"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Nema korisnika sa ovim podacima.");
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("role")
      .eq("account_id", data.user.id)
      .single();

    if (roleError) {
      console.log("Greška pri dohvaćanju role:", roleError.message);
    }
    console.log("Uspješna prijava:", data);

    setLoading(false);

    if (roleData?.role === "superadmin") {
      router.push("/adminProfiles");
    } else {
      router.push("/profiles");
    }
  }

  return (    
    <div className="section-center">
      <div className="card">
        <h1>Prijava</h1>
        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Lozinka"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="button">
            Prijavi se
          </button>
        </form>
      </div>
    </div>
  );
}
