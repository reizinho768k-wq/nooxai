# NOOX AI

Chat web responsivo conectado ao OpenRouter. O frontend fica em `public/` e o servidor Express protege a chave da API.

## Requisitos
- Node.js 18+
- Uma chave em https://openrouter.ai/keys

## Rodar localmente
1. Extraia o ZIP e abra a pasta `NOOX-AI`.
2. Copie `.env.example` para `.env`.
3. Coloque sua chave em `OPENROUTER_API_KEY`.
4. No terminal, execute:
   ```bash
   npm install
   npm start
   ```
5. Abra http://localhost:3000

## Publicar
### GitHub
Crie um repositório chamado `noox-ai` e envie todos os arquivos, mantendo `public/`.
**Não envie o arquivo `.env` nem sua chave para o GitHub.** O `.gitignore` já ignora `.env`.

### Render
1. Entre em https://render.com e conecte sua conta GitHub.
2. Crie **New > Web Service** e escolha o repositório.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Em Environment, adicione:
   - `OPENROUTER_API_KEY` = sua chave secreta
   - `OPENROUTER_MODEL` = `openrouter/auto` (ou um modelo escolhido no catálogo)
6. Faça o deploy. Abra a URL gerada pelo Render.

## Recursos desta versão
- Chat com respostas em streaming visual (resposta exibida ao concluir a chamada).
- Conversas salvas no navegador.
- Análise de imagens por modelos com suporte a visão.
- Anexos TXT, MD, CSV, JSON, PDF e DOCX (texto extraído no navegador).
- Entrada por microfone com Web Speech API, quando o navegador oferecer suporte.
- Layout adaptado para celular e computador.

## Observações importantes
- `openrouter/auto` escolhe um modelo disponível; nem todo modelo aceita imagens. Para analisar imagens, selecione no catálogo do OpenRouter um modelo com entrada de imagem e configure o nome dele em `OPENROUTER_MODEL`.
- Preços, limites, disponibilidade e modalidades dependem do modelo/provedor. Modelos gratuitos podem ter limites e ficar indisponíveis.
- O reconhecimento de voz usa o recurso do navegador e depende de suporte/permissão. Não é uma transcrição universal de qualquer arquivo de áudio.
- Histórico fica no `localStorage` do navegador; não sincroniza entre dispositivos.
- Para manter a chave segura, chamadas à API passam pelo servidor. Nunca coloque a chave no `script.js`.
- Esta é uma aplicação própria, não um modelo treinado do zero. A inteligência vem do modelo selecionado no OpenRouter.
