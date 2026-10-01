# Gemini quota retry plugin

Plugin local do OpenCode que trata erros HTTP `429` somente em modelos Gemini do provedor `google`.

Quando a mensagem do Google contém `retry in ...s`, o plugin espera esse período mais um atraso aleatório de 1 a 10 segundos. Limita a execução a 3 tentativas no total (a chamada inicial e até duas repetições). Se a mensagem não trouxer um intervalo reconhecido, mantém a decisão de retry do próprio OpenCode.

## Instalação local

Copie `gemini-quota-retry.ts` para o diretório de plugins globais do OpenCode:

```text
%USERPROFILE%\.config\opencode\plugins\gemini-quota-retry.ts
```

O diretório já é usado pelo plugin local `rtk.ts` desta instalação. Reinicie o OpenCode para carregar o plugin.

## Verificação rápida

Com Node.js 24, o parser pode ser verificado sem dependências:

```powershell
node --experimental-strip-types --input-type=module -e "import('./gemini-quota-retry.ts').then(({parseGeminiRetryDelayMs}) => console.log(parseGeminiRetryDelayMs('Please retry in 21.075083893s.')))"
```
