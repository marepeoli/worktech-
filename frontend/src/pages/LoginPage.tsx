import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

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
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          setErrorMessage("Credenciais invalidas. Tente novamente.");
          return;
        }
        if (!error.response) {
          setErrorMessage("Erro de conexao com o servidor. Verifique se a API esta online.");
          return;
        }
      }
      setErrorMessage("Nao foi possivel entrar agora. Tente novamente em instantes.");
    }
  };

  return (
    <main className="page page-login-vamp">
      <section className="phone-shell" aria-label="Tela de login VAMP Performance">
        <header className="login-brand">
          <img className="brand-logo" src="/vamp_logo.png" alt="Logo VAMP Performance" />
          <h1>Olá!</h1>
          <p>Seja bem vindo(a) ao Vamp Performance!</p>
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
          </form>
        </section>
      </section>
    </main>
  );
}
