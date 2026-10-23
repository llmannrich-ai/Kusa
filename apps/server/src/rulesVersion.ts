import { readFileSync } from "node:fs";
import { RULES_FILES, rulesHash } from "@kusa/shared";

const shared = new URL("../../../packages/shared/src/", import.meta.url);

/** Versão das regras deste servidor: hash dos arquivos de `RULES_FILES` (o cliente calcula a mesma no build). */
export const RULES_VERSION = rulesHash(RULES_FILES.map((name) => ({ name, text: readFileSync(new URL(name, shared), "utf8") })));
