import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import type { LoginPayload } from "../auth/types";

type LocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>();

  const onSubmit = async (values: LoginPayload) => {
    setErrorMessage("");
    try {
      await login(values);
      const state = location.state as LocationState | null;
      navigate(state?.from ?? "/home", { replace: true });
    } catch {
      setErrorMessage("Credenciais invalidas. Tente novamente.");
    }
  };

  return (
    <main className="page page-login-vamp">
      <section className="phone-shell" aria-label="Tela de login VAMP Performance">
        <header className="login-brand">
          <img className="brand-logo" src="/vamp_logo.png" alt="Logo VAMP Performance" />
          <h1>Ola!</h1>
          <p>Seja bem vindo(a) ao VAMP Performance!</p>
        </header>

        <section className="gold-panel">
          <form onSubmit={handleSubmit(onSubmit)} className="form form-vamp">
            <label>
              E-mail
              <input
                placeholder="exemplo@exemplo.com"
                {...register("login", { required: "Informe seu login" })}
              />
              {errors.login ? <span className="error">{errors.login.message}</span> : null}
            </label>

            <label>
              Senha
              <input
                type="password"
                placeholder="* * * * * * * *"
                {...register("senha", { required: "Informe sua senha" })}
              />
              {errors.senha ? <span className="error">{errors.senha.message}</span> : null}
            </label>

            <button className="forgot-link" type="button">
              Esqueceu a senha?
            </button>

            {errorMessage ? <p className="error">{errorMessage}</p> : null}

            <button className="btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>

            <button className="btn-google" type="button">
              <span className="google-g">G</span>
              Entrar com Google
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
