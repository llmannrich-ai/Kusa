---
name: perguntas
description: Modo auto de perguntas - antes de desenvolver, o Claude entrevista o usuário sobre o assunto da sessão e do prompt, uma pergunta por vez, só com perguntas cuja resposta muda o que vai ser construído. A cada 5 perguntas oferece continuar, sair e prosseguir com o que já tem, ou deixar um comentário sobre tudo. No fim entrega um resumo das decisões. Use quando pedirem /perguntas, "me entrevista", "pergunta antes de fazer", "modo perguntas" ou quando a tarefa estiver vaga demais para começar.
---

# Modo auto de perguntas

Objetivo: tirar da cabeça do usuário o que falta para desenvolver a tarefa **certa**, sem perder tempo
com o que o código, o `docs/GDD.md` ou o próprio prompt já respondem.

O assunto é a tarefa passada nos argumentos da skill; sem argumento, é o último pedido do usuário e o
que a sessão já discutiu. Se nem isso existir, a primeira pergunta é qual é a tarefa.

## 1. Antes da primeira pergunta

1. Releia o pedido e a conversa: anote o que já está decidido (não pergunte de novo).
2. Leia o que o projeto já diz sobre o assunto: `CLAUDE.md`, `README.md`, a seção relevante do
   `docs/GDD.md` (e do plano em `docs/*_PLANO.md`, se houver) e o código que a tarefa vai tocar.
   Fato que o código responde não vira pergunta.
3. Monte, só para você, a lista de **lacunas**: decisões que você precisaria tomar sozinho para
   implementar e que o usuário pode querer diferente. Ordene pelo impacto no que vai ser construído
   (escopo e regra de jogo antes de detalhe visual; o que trava o resto antes do que é isolado).

## 2. Regra de ouro: toda pergunta é necessária

Só pergunte se **as duas** forem verdade:

- a resposta muda o que você vai fazer (código, regra, dado, tela, teste);
- você não consegue descobrir sozinho no repositório, no banco ou com um default razoável.

Não pergunte: preferência sem efeito prático, confirmação do que o usuário já disse, algo que o
`CLAUDE.md` já decide (idioma, mobile primeiro, servidor autoritativo, migrations, fluxo de branch),
"posso começar?". Quando houver default óbvio, não pergunte: use-o e registre no resumo final.

Quando as lacunas acabarem, o modo termina, mesmo antes da pergunta 5. Não invente pergunta para
completar o bloco.

## 3. Como perguntar

- **Uma pergunta por vez**, com a ferramenta `AskUserQuestion` (uma `question` por chamada). A próxima
  pergunta depende da resposta anterior: reavalie a lista de lacunas a cada resposta.
- Cada pergunta traz de 2 a 4 opções concretas, mutuamente exclusivas, com a consequência de cada uma
  na `description` (o que muda no jogo ou no código). A opção que você recomenda vem primeiro, com
  "(Recomendado)" no fim do rótulo. O usuário sempre pode digitar outra resposta.
- No texto da pergunta, mostre o contador: `[3/5] ...` (dentro do bloco atual de 5).
- Pergunta curta e específica do Kusa: cite a classe, a magia, o monstro, a tela ou o arquivo em jogo.
  Use `preview` quando comparar layouts de tela ou trechos de código ajudar a decidir.
- Resposta "Outro" com texto livre que abre um assunto novo: acrescente as lacunas novas à lista.

## 4. A cada 5 perguntas: ponto de controle

Depois da 5ª, 10ª, 15ª… resposta, antes de qualquer outra pergunta, mostre em texto um resumo curto do
que ficou decidido até aqui (tópicos de uma linha) e quantas lacunas ainda restam. Depois chame
`AskUserQuestion` com:

- pergunta: `Ponto de controle: o que fazemos agora?`
- header: `Controle`
- opções, nesta ordem:
  1. **Continuar perguntando** — "Mais um bloco de até 5 perguntas. Restam N lacunas: <as 2 ou 3
     principais>."
  2. **Sair e prosseguir** — "Encerra o modo e desenvolve com o que já foi decidido; o que faltar
     recebe o default recomendado, listado no resumo."
  3. **Comentário sobre tudo** — "Escreva um comentário geral (ajuste de rumo, prioridade, algo que
     ficou de fora) antes de decidir se continua."

O que fazer com a escolha:

- **Continuar**: zere o contador do bloco e siga para a próxima lacuna.
- **Sair e prosseguir**: vá para o passo 5.
- **Comentário sobre tudo**: peça o comentário em texto (o usuário também pode já tê-lo escrito no
  campo "Outro"). Incorpore-o: ele pode resolver lacunas, criar novas ou mudar decisões já tomadas
  (diga quais mudaram). Em seguida, repita o ponto de controle, sem contar como pergunta.

## 5. Saída do modo

O modo termina quando o usuário escolhe "Sair e prosseguir", quando as lacunas acabam ou quando o
usuário pede para parar. Então entregue, em texto:

```
## Decisões
- <decisão> — <motivo/resposta do usuário>

## Defaults assumidos (sem pergunta)
- <decisão> — <por quê é o default>

## Em aberto
- <lacuna não respondida> — <o que vou fazer enquanto isso>

## Próximos passos
1. <arquivos/sistemas que vou mexer, na ordem>
```

Em seguida, siga com a tarefa original usando essas decisões, seguindo o `CLAUDE.md` (branch nova a
partir do `origin/main`, testes, `npm run check`). Se o pedido original era só discutir ou planejar,
pare no resumo.

## Não faça

- Mais de uma pergunta por chamada, ou passar da 5ª sem o ponto de controle.
- Começar a implementar antes do modo terminar.
- Perguntar algo que você poderia ler no repositório.
- Repetir pergunta já respondida, mesmo com outras palavras.
