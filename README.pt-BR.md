# Sleep Gemini

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

Um plugin do OpenCode que trata respostas de limite de uso (`429`) da API Gemini respeitando o tempo de espera sugerido pelo Google e acrescentando um pequeno intervalo aleatório. Ele é voltado a usuários do OpenCode que executam agentes com Gemini e ocasionalmente atingem limites temporários de requisições.

## Como funciona

O plugin registra o hook de sessão `retry` do OpenCode e altera a decisão de nova tentativa somente quando todas estas condições são atendidas:

1. O ID do provedor é `google`.
2. O ID do modelo contém `gemini`.
3. O erro do provedor tem status HTTP `429`.

Para um erro correspondente, o plugin interpreta um tempo como `Please retry in 21.075s.`, arredonda para cima em milissegundos e adiciona de **1 a 10 segundos** aleatórios. Esse intervalo ajuda a evitar que agentes concorrentes tentem novamente exatamente ao mesmo tempo.

O plugin permite no máximo **3 tentativas no total por requisição**: a tentativa inicial e até duas novas tentativas. Ao atingir o limite, ele para de repetir aquela requisição.

## O que ele não faz

- Não troca para outro modelo ou provedor.
- Não aumenta, reserva nem altera de outra forma sua cota da API do Google.
- Não coordena requisições entre agentes ou sessões diferentes.
- Se a mensagem de erro não contiver um tempo de espera reconhecível, mantém a decisão de retry do próprio OpenCode.

## Requisitos

- OpenCode com suporte ao hook de sessão `retry` (OpenCode V2).
- Um modelo Gemini roteado pelo provedor com ID `google`.
- Nenhuma dependência npm adicional.

## Instalação

O OpenCode carrega automaticamente plugins de projeto colocados em `.opencode/plugins/`. Para usar este plugin em um projeto, copie o arquivo para esse diretório:

### Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force .\.opencode\plugins | Out-Null
Copy-Item .\gemini-quota-retry.ts .\.opencode\plugins\gemini-quota-retry.ts
```

### macOS / Linux

```sh
mkdir -p .opencode/plugins
cp ./gemini-quota-retry.ts .opencode/plugins/gemini-quota-retry.ts
```

Para habilitá-lo em todos os projetos do seu usuário, coloque o arquivo no diretório global de plugins do OpenCode:

```text
Windows:     %USERPROFILE%\.config\opencode\plugins\gemini-quota-retry.ts
macOS/Linux: ~/.config/opencode/plugins/gemini-quota-retry.ts
```

Reinicie o OpenCode após a instalação. Se já existir um arquivo com o mesmo nome, faça uma cópia de segurança antes de substituí-lo.

## Configuração

As opções iniciais estão declaradas como constantes no começo de `gemini-quota-retry.ts`:

```ts
const MAX_TOTAL_ATTEMPTS = 3
const EXTRA_DELAY_MIN_MS = 1_000
const EXTRA_DELAY_MAX_MS = 10_000
```

Altere esses valores para ajustar o limite de tentativas ou o intervalo aleatório. `MAX_TOTAL_ATTEMPTS` inclui a requisição original.

## Desenvolvimento e verificação

O parser do intervalo é exportado para poder ser verificado separadamente. Com Node.js 24 ou superior:

```sh
node --experimental-strip-types --input-type=module -e "import('./gemini-quota-retry.ts').then(({parseGeminiRetryDelayMs}) => console.log(parseGeminiRetryDelayMs('Please retry in 21.075083893s.')))"
```

Saída esperada:

```text
21076
```

Esse comando verifica apenas a interpretação do tempo; não faz uma requisição ao Google. Durante o uso, as decisões de retry são registradas no log do servidor do OpenCode com o prefixo `[gemini-quota-retry]`.