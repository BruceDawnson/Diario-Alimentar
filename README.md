# Diário de Alimentação - Instruções de Deploy

Este guia descreve como implantar o aplicativo Diário de Alimentação no Firebase Hosting.

## 1. Inicialização do Firebase para Hosting

Se você ainda não o fez, ou precisa ajustar a configuração, execute este comando na raiz do seu projeto:

```bash
firebase init hosting
```

Quando o CLI perguntar:

1.  **"Which project do you want to use?"**: Selecione `dietadiary (DietaDiary)`.
2.  **"What do you want to use as your public directory?"**: Digite `.` (um ponto).
    -   Isso significa que a raiz do seu projeto local é o diretório público onde o Firebase Hosting buscará seus arquivos (incluindo `index.html`, `App.tsx`, etc.).
3.  **"Configure as a single-page app (rewrite all URLs to /index.html)?"**: Digite `Yes`.
    -   Isso é importante para garantir que o roteamento do aplicativo funcione corretamente.
4.  **"Set up automatic builds and deploys with GitHub?"**: Responda `No` para simplificar.

Isso irá gerar ou atualizar seu arquivo `firebase.json` com a configuração correta.

## 2. Implantação do Aplicativo

Com a configuração feita, o comando final para implantar é:

```bash
firebase deploy
```

Ou, para ter certeza de que estamos implantando apenas o serviço de Hosting (e não outras regras do Firebase, por exemplo):

```bash
firebase deploy --only hosting
```

Este comando pegará todos os arquivos no seu diretório raiz e os publicará no Firebase Hosting. Seu Diário de Alimentação estará online no URL: **https://dietadiary.web.app**!

Essa é uma forma incrivelmente ágil de lançar seu projeto.