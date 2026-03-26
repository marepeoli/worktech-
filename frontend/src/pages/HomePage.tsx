import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { principal, logout } = useAuth();

  return (
    <main className="page">
      <section className="card">
        <h1>Home</h1>
        <p>Perfil ativo: {principal?.role}</p>
        <p>Identificador: {principal?.sub}</p>

        <nav className="actions">
          <Link to="/admin">Ir para area ADMIN</Link>
          <button onClick={logout} type="button">
            Sair
          </button>
        </nav>
      </section>
    </main>
  );
}
