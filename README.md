# roti-na

Organizador de rotina, tarefas, metas e notas acadêmicas (React + Vite + Tailwind + Firebase).

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Firebase
npm run dev
```

## Variáveis de ambiente

Veja `.env.example`. No deploy (GitHub Pages) elas vêm dos *Secrets* do repositório.

## Deploy

Push na `main` publica automaticamente via GitHub Actions.

## Regras do Firestore

O arquivo `firestore.rules` guarda as regras recomendadas (cada pessoa só acessa `users/{uid}/...`).
Para aplicar: Firebase Console → Firestore Database → aba **Regras** → colar o conteúdo → **Publicar**.

## Backup

Menu lateral (ícone do perfil) → **Meus dados** → exportar/importar um arquivo JSON com atividades, tarefas, metas e cursos.

## Testes

```bash
npm test
```

Roda os testes das funções de data, horário e metas (`tests/utils.test.js`). O deploy só publica se eles passarem.

## Configurações

- Página **Configurações**: liga/desliga páginas e blocos (salvo em `users/{uid}.config` e no aparelho).

## Google Agenda (sincronização)

O botão *Exportar para o Google Agenda* (menu da conta) usa o login do Google (Google Identity Services) com a permissão
`calendar.app.created`: o app só enxerga a agenda "roti-na" que ele mesmo cria.

Configuração (uma vez):

1. Google Cloud (projeto do Firebase) → Google Auth Platform → **Clientes** → Criar cliente → *Aplicativo da Web*,
   com as origens JavaScript autorizadas `https://lucas-fe-lipe.github.io` e `http://localhost:5173`.
2. Copie o **ID do cliente** e salve como secret do repositório com o nome `VITE_GOOGLE_CLIENT_ID`
   (GitHub → Settings → Secrets and variables → Actions). Para rodar local, coloque-o também no `.env`.
3. Em *Acesso a dados*, mantenha apenas o escopo `calendar.app.created` e ative a Google Calendar API.

O mapa "item do app → evento do Google" fica em `users/{uid}/integracoes/googleAgenda`.
