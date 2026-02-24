declare namespace NodeJS {
  interface ProcessEnv {
    VITE_FRONTEND_URL: string;
    VITE_API_URL: string;
    DB_PATH: string;
  }
}
