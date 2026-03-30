# YTBlock App — Guia de Instalação

## Estrutura de arquivos

```
ytblock-app/
├── server.js              ← Servidor Node.js (já configurado)
├── package.json           ← Dependências
├── .env                   ← Credenciais (já configurado)
├── supabase-schema.sql    ← Schema do banco (rode 1 vez no Supabase)
└── public/
    ├── index.html         ← Tela de login
    ├── dashboard.html     ← Dashboard principal
    └── reset.html         ← Redefinir senha
```

---

## PASSO 1 — Rodar o schema no Supabase (só 1 vez)

1. Acesse https://supabase.com → projeto **ytblock**
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase-schema.sql` e clique em **Run**
4. Pronto — a tabela `profiles` será criada automaticamente

---

## PASSO 2 — Subir na Hostinger Business

### 2.1 — Upload dos arquivos
1. Acesse o **hPanel** da Hostinger
2. Vá em **Gerenciador de Arquivos**
3. Crie uma pasta chamada `ytblock-app` dentro de `public_html`
4. Faça upload de **todos os arquivos** desta pasta para lá
   - Inclua o `.env` (arquivo oculto — ative "mostrar arquivos ocultos" no gerenciador)

### 2.2 — Configurar Node.js no hPanel
1. No hPanel vá em **Node.js** (ou "Aplicativos Node.js")
2. Clique em **Criar aplicativo**
3. Configure:
   - **Versão Node.js**: 18 ou superior
   - **Modo**: Production
   - **Pasta da aplicação**: `public_html/ytblock-app`
   - **Arquivo de inicialização**: `server.js`
4. Clique em **Criar**
5. Clique em **Instalar dependências** (npm install)
6. Clique em **Iniciar / Reiniciar**

### 2.3 — Apontar domínio ytblock.space
1. No hPanel vá em **Domínios → ytblock.space**
2. Aponte para o diretório `public_html/ytblock-app`
3. Ative **SSL gratuito** e force HTTPS

---

## PASSO 3 — Testar

1. Acesse https://ytblock.space → deve aparecer a tela de login
2. Para criar um usuário de teste manualmente:
   - Supabase → **Authentication → Users → Add user**
   - Coloque email + senha → confirme
   - Supabase → **Table Editor → profiles** → insira uma linha com:
     - `id` = (o UUID do usuário criado)
     - `email` = seu email
     - `status` = `active`
     - `plan` = `pro`
3. Faça login em ytblock.space com o usuário criado

---

## Fluxo automático do cliente

```
Cliente compra na Kiwify
       ↓
Kiwify envia webhook para https://ytblock.space/api/webhook/kiwify?token=v607uozxb8z
       ↓
Servidor cria usuário no Supabase e envia email para criar senha
       ↓
Cliente acessa ytblock.space, cria senha, faz login
       ↓
Assiste YouTube sem anúncios ✅
```

---

## Capacidade

| Situação | Status |
|---|---|
| Até 10.000 usuários cadastrados | ✅ Supabase grátis |
| Até 50.000 usuários cadastrados | ✅ Supabase Pro ($25/mês) |
| Conexões simultâneas | ✅ Hostinger Business aguenta |

