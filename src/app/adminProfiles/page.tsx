"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type GroupedUser = {
  account_id: string;
  profiles: { id: string; username: string }[];
};

export default function AdminProfilesPage() {
  const [users, setUsers] = useState<GroupedUser[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, account_id");

      if (profileError) {
        console.error("Greška pri dohvaćanju profila:", profileError);
        return;
      }

      if (!profileData) return;

      const grouped: Record<string, GroupedUser> = {};

      for (const profile of profileData) {
        if (!grouped[profile.account_id]) {
          grouped[profile.account_id] = {
            account_id: profile.account_id,
            profiles: [],
          };
        }

        grouped[profile.account_id].profiles.push({
          id: profile.id,
          username: profile.username,
        });
      }

      setUsers(Object.values(grouped));
    };

    fetchProfiles();
  }, []);

  const handleOpenProfile = (profileId: string) => {
    router.push(`/adminTodos?profileId=${profileId}`);
  };

  return (
    <div className="admin-page">
      <h1>Admin - Korisnici i njihovi profili</h1>

      {users.map((user) => (
        <div key={user.account_id} className="admin-user-card">
          <ul>
            {user.profiles.map((p) => (
              <li
                key={p.id}
                onClick={() => handleOpenProfile(p.id)}
                style={{ cursor: "pointer" }}
              >
                <span className="profile-name">{p.username}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
