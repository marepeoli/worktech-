import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { LoginPayload } from "../auth/types";

type LocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>();

  const onSubmit = async (values: LoginPayload) => {
    setErrorMessage("");
    setInfoMessage("");
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

  const onForgotPassword = async () => {
    setShowResetPasswordForm(true);
    setInfoMessage("");
    setErrorMessage("");
  };

  const onSubmitForgotPassword = async () => {
    const loginValue = getValues("login")?.trim();
    if (!loginValue) {
      setInfoMessage("");
      setErrorMessage("Informe seu login no campo E-mail para redefinir a senha.");
      return;
    }

    if (newPassword.trim().length < 4) {
      setInfoMessage("");
      setErrorMessage("A nova senha deve ter ao menos 4 caracteres.");
      return;
    }

    if (confirmNewPassword !== newPassword) {
      setInfoMessage("");
      setErrorMessage("As senhas nao coincidem.");
      return;
    }

    setErrorMessage("");
    setInfoMessage("");
    setIsResettingPassword(true);
    try {
      const response = await api.post<{ message: string }>("/auth/forgot-password", {
        login: loginValue,
        nova_senha: newPassword,
      });
      setInfoMessage(response.data.message);
      setNewPassword("");
      setConfirmNewPassword("");
      setShowResetPasswordForm(false);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.detail) {
        setErrorMessage(String(error.response.data.detail));
      } else {
        setErrorMessage("Nao foi possivel redefinir a senha agora.");
      }
    } finally {
      setIsResettingPassword(false);
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
              <div className="password-input-wrap">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="* * * * * * * *"
                  {...register("senha", { required: "Informe sua senha" })}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.senha ? <span className="error">{errors.senha.message}</span> : null}
            </label>

            <button className="forgot-link" type="button" onClick={onForgotPassword} disabled={isResettingPassword}>
              {isResettingPassword ? "Redefinindo..." : "Esqueceu a senha?"}
            </button>

            {showResetPasswordForm ? (
              <section className="reset-password-box" aria-label="Redefinir senha">
                <label>
                  Nova senha
                  <div className="password-input-wrap">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Digite a nova senha"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </label>
                <label>
                  Confirmar nova senha
                  <div className="password-input-wrap">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={(event) => setConfirmNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Ocultar confirmacao de senha" : "Mostrar confirmacao de senha"}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </label>
                <div className="reset-password-actions">
                  <button
                    className="btn-reset-submit"
                    type="button"
                    onClick={onSubmitForgotPassword}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? "Salvando..." : "Salvar nova senha"}
                  </button>
                  <button
                    className="btn-reset-cancel"
                    type="button"
                    onClick={() => {
                      setShowResetPasswordForm(false);
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                    disabled={isResettingPassword}
                  >
                    Cancelar
                  </button>
                </div>
              </section>
            ) : null}

            {infoMessage ? <p className="info">{infoMessage}</p> : null}
            {errorMessage ? <p className="error">{errorMessage}</p> : null}

            <button className="btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>

        <p className="login-credit">Desenvolvido por &reg; MPO Tech</p>
      </section>
    </main>
  );
}
