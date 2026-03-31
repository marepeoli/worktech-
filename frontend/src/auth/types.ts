export type Role = "ADMIN" | "PROFESSOR" | "USER";

export type LoginPayload = {
  login: string;
  senha: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: Role;
};

export type Principal = {
  sub: string;
  role: Role;
  nome?: string;
};
