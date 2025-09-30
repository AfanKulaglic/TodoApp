"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUserRole = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Niste logovani:", userError);
        router.push("/login");
        return;
      }

      console.log("UUID korisnika:", user.id);

      const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("role")
        .eq("account_id", user.id);

      if (rolesError) {
        console.error("Greška pri dohvatu role:", rolesError);
        router.push("/login");
        return;
      }

      console.log("Role korisnika:", roles);

      const isAdmin = roles?.some(r => r.role === "superadmin");

      if (isAdmin) {
        router.push("/adminProfiles");
      } else {
        router.push("/profiles");
      }
    };

    checkUserRole();
  }, [router]);

  return (
    <div style={{ padding: "20px" }}>
      <p>Provjera autentifikacije...</p>
    </div>
  );
}
