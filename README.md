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

## Configurações e Novidades

- Página **Configurações**: liga/desliga páginas e blocos (salvo em `users/{uid}.config` e no aparelho).
- Página **Novidades**: edite `src/data/novidades.js` (novo item no topo + `VERSAO_ATUAL`) para mostrar o selo "novo".
