// Solo para specs que leen archivos del repo (p. ej. los tokens de styles.css); el runner de pruebas corre en Node.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
