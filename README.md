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
