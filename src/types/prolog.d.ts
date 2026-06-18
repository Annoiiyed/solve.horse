/** Import a Prolog source file as a raw string (Vite's `?raw` suffix). */
declare module "*.pl?raw" {
  const content: string;
  export default content;
}
