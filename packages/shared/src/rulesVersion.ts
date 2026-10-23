/**
 * Versão das regras que cliente e servidor calculam cada um do seu lado (o gerador de mapas pela seed) e do protocolo
 * entre eles (as mensagens). Não é mais um número subido à mão: é um hash do conteúdo destes arquivos do
 * `packages/shared`, que o servidor lê do disco (`apps/server/src/rulesVersion.ts`) e o cliente lê no build
 * (`apps/client/vite.config.ts`). Mudou um deles, a versão muda sozinha: o servidor recusa cliente de outra versão e o
 * cliente desatualizado se recarrega. Sem conflito entre PRs e sem esquecer de subir.
 * O gerador (`dungeon.ts` e `rng.ts`) só pode importar em tempo de execução arquivos desta lista (o teste `maps`
 * confere): um arquivo fora dela mudaria o mapa sem mudar a versão.
 */
export const RULES_FILES = ["dungeon.ts", "rng.ts", "maps.ts", "messages.ts"] as const;

/** Hash (FNV-1a de 32 bits, em hexadecimal) dos arquivos de `RULES_FILES`, na ordem da lista. */
export function rulesHash(files: readonly { name: string; text: string }[]) {
  let h = 0x811c9dc5;
  for (const { name, text } of files) {
    // Fim de linha do Windows (\r\n) não muda a versão: o mesmo arquivo dá o mesmo hash em qualquer máquina.
    for (const ch of `${name}\n${text.replace(/\r\n/g, "\n")}\n`) {
      h ^= ch.codePointAt(0)!;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, "0");
}
