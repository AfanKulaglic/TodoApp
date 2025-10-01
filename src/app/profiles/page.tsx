"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useRouter } from "next/navigation"

type Profile = {
  id: string
  account_id: string
  username: string
  created_at: string
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [newUsername, setNewUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUserAndProfiles = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error("Niste logovani:", error)
        return
      }

      setUserId(user.id)
      setUserEmail(user.email ?? null)

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_id", user.id)

      if (profilesError) {
        console.error("Greška pri učitavanju profila:", profilesError)
      } else {
        setProfiles(data || [])
      }
    }

    getUserAndProfiles()
  }, [])

  const handleAddProfile = async () => {
    if (!userId) return
    if (profiles.length >= 3) {
      alert("Možete imati maksimalno 3 profila po nalogu.")
      return
    }
    if (!newUsername.trim()) {
      alert("Unesite ime profila.")
      return
    }

    setLoading(true)

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert([{ account_id: userId, username: newUsername }])
      .select()

    if (profileError) {
      setLoading(false)
      if (profileError.code === "23505") {
        alert("Ovo korisničko ime je već zauzeto. Molimo odaberite drugo.")
      } else {
        console.error("Greška pri kreiranju profila:", profileError)
        alert("Došlo je do greške pri kreiranju profila.")
      }
      return
    }

    const { error: roleError } = await supabase
      .from("roles")
      .insert([{ account_id: userId, role: "user" }])

    setLoading(false)

    if (roleError) {
      console.error("Greška pri dodavanju role:", roleError)
      alert("Profil je kreiran, ali nije dodana uloga korisnika.")
    } else {
      setProfiles([...profiles, ...(profileData || [])])
      setNewUsername("")
      setIsModalOpen(false) // zatvori modal kad se doda
    }
  }

  const handleDeleteProfile = async (id: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id)

    if (error) {
      console.error("Greška pri brisanju profila.", error)
      alert("Došlo je do greške pri brisanju. Postoje zadaci na tom profilu")
    } else {
      setProfiles(profiles.filter((p) => p.id !== id))
    }
  }

  const handleOpenProfile = (id: string) => {
    sessionStorage.setItem("selectedProfileId", id)
    router.push("/todos")
  }

  return (
    <div className="profiles-page">
      <div className="profiles-card">
        <h1>Moji Profili</h1>
        {userEmail && <p className="user-email"><strong>{userEmail}</strong></p>}

        <ul className="profiles-list">
          {profiles.map(profile => (
            <li key={profile.id} className="profile-item">
              <span className="profile-name">{profile.username}</span>
              <div className="profile-actions">
                <button className="button button-small" onClick={() => handleOpenProfile(profile.id)}>Otvori</button>
                <button className="button button-small button-danger" onClick={() => handleDeleteProfile(profile.id)}>Izbriši</button>
              </div>
            </li>
          ))}
        </ul>

        {profiles.length < 3 && (
          <div className="add-profile">
            <button className="button" onClick={() => setIsModalOpen(true)}>Dodaj profil <span>➕</span></button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Dodaj Profil</h2>
            <input
              className="input"
              type="text"
              placeholder="Unesite ime profila"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            <div className="modal-actions">
              <button className="button" onClick={handleAddProfile} disabled={loading}>
                {loading ? "Dodavanje..." : "Dodaj"}
              </button>
              <button className="button button-danger" onClick={() => setIsModalOpen(false)}>Zatvori</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
