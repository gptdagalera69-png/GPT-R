# Central do Mestre ⚔️

Ferramenta web para mestres de D&D (2024/2025), em português, com layout adaptado para notebook, tablet e celular.

## Funcionalidades já implementadas
- Bestiário com **322 criaturas do SRD 5.2.1** e ficha completa disponível na fonte de dados
- Busca por nome, filtro por ND, tipo e ordenação; fichas exibidas em inglês conforme a licença/dataset original
- Cadastro de monstros personalizados (atributos, habilidades e ataques)
- Orçamentos de XP por nível e tamanho do grupo conforme **Dungeon Master's Guide 2024**, sem multiplicadores de quantidade
- Recomendações de combinações de inimigos aproximadas ao orçamento selecionado; avisos táticos são heurísticos, não garantias de equilíbrio
- Encontros salvos, iniciar combate a partir do encontro
- Iniciativa individual, rodada, rolagem, PV, dano, cura, condições e notas individuais
- Cadastrar combatentes jogadores manualmente; fichas completas dos jogadores não estão nesta versão
- Campanhas e notas do mestre
- Backup exportável/importável e salvamento automático local
- Instalação como PWA, cache offline da aplicação após primeiro acesso
- Sincronização **opt-in** com um projeto Supabase com autenticação e RLS

## Implantação
A aplicação é **HTML/CSS/JavaScript sem dependências de execução no navegador** e pode ser hospedada na Vercel conectando o repositório `gptdagalera69-png/GPT-R`. Framework: Other; diretório raiz `/`; sem comando de build.

Para testar localmente, sirva a pasta com um servidor HTTP (não abra `index.html` como arquivo).

```sh
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Configuração do banco de dados Supabase
1. Crie **um projeto separado** no Supabase para a Central do Mestre.
2. No SQL Editor desse projeto, execute `supabase/001_dm_workspace.sql`.
3. Em *Configurações* na Central, informe a URL desse projeto e a chave **publicável** (`sb_publishable_...` ou `anon`).
4. Cadastre-se ou entre com e-mail e senha no aplicativo.
5. Para outro aparelho, use a **mesma conta** e configure a mesma URL/chave. O aplicativo sincroniza e mantém backup local.

**Nunca use a chave service_role no navegador.** A tabela tem RLS e cada mestre acessa apenas seus próprios dados.

### Limitações conhecidas
- A nuvem só fica funcional após criação e configuração do projeto Supabase e execução da migração.
- As 322 criaturas possuem nomes PT-BR em `data/nomes-pt-BR.json`. As descrições em português são geradas por um processo offline (GitHub Actions + Argos Translate) em `data/monsters.pt-BR.json` e não dependem de tradução no navegador. Por se tratar de tradução automática, a revisão editorial é necessária.
- O balanceamento por XP não garante encontros seguros; revise habilidades de monstros, economia de ações e composição dos personagens.
- Condições são marcadas manualmente; contagem automática de duração, mapas/grids, multiplayer e fichas completas dos jogadores são para futuras versões.
- Se dois dispositivos alterarem a mesma sessão ao mesmo tempo, pode prevalecer o salvamento mais recente; evite edições concorrentes.
- A primeira sincronização de um dispositivo com dados locais pode solicitar decisão sobre qual cópia manter.
- Limpar os dados do navegador pode apagar dados locais; use backup e sincronização.

## Direitos e atribuições
O conteúdo de criaturas deriva de **D&D System Reference Document 5.2.1**, © Wizards of the Coast LLC, disponibilizado sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Fonte oficial: https://www.dndbeyond.com/sources/dnd/srd-5.2.1

O dataset estruturado é republicado por **Open5e** e por [adkinn/srd-5.2.1](https://github.com/adkinn/srd-5.2.1) com atribuição CC BY 4.0. O arquivo `data/monsters.json` serve as fichas estruturadas pela rota `/data/monsters.json`; os valores em inglês não são uma tradução oficial do SRD.

Este aplicativo não oferece PDFs comerciais nem afirma conter todas as criaturas dos livros de D&D.

## Estrutura
- `index.html`, `styles.css`, `app.js`, `sync.js`: interface e lógica
- `data/monsters.json`: fichas SRD estruturadas
- `sw.js`, `manifest.webmanifest`, `icon.svg`: PWA
- `supabase/001_dm_workspace.sql`: tabela + RLS

## Idioma: Português brasileiro

O idioma padrão é **pt-BR** e a interface não oferece botão de tradução. Os nomes dos 322 monstros têm equivalentes brasileiros pré-definidos. O acervo mecânico completo em português fica em `data/monsters.pt-BR.json`, que é compilado **uma vez pelo GitHub Actions** (`.github/workflows/preparar-ptbr.yml`) usando tradução offline com Argos Translate e fica armazenado no próprio repositório. O aplicativo procura esse arquivo primeiro; se a geração ainda não tiver sido concluída, usa temporariamente os dados originais do SRD com nomes traduzidos e avisa que as descrições brasileiras estão em preparação.

**Importante:** a tradução automática não é oficial nem substitui a conferência das regras. A auditoria de expressões de dados fica em `data/auditoria-pt-BR.json` após a geração. Para conferir o progresso, abra a aba Actions do GitHub e procure `Preparar bestiário em português`. Se a workflow precisar de permissão, ative Actions e habilite a permissão de gravação de `GITHUB_TOKEN` no repositório para que o arquivo final seja commitado.


## Versão visual 2.0 — Atlas das Crônicas

A Central do Mestre recebeu um redesenho responsivo sem apagar o formato dos dados salvos:

- **Identidade por aba:** Visão geral (ouro), Bestiário (cobre), Criador de encontros (violeta), Combate (rubi), Campanhas (verde) e Configurações (azul).
- **Ficha em estilo livro:** painel ampliado com papel envelhecido, estatísticas legíveis e separação entre retrato e descrição. No celular, o retrato aparece acima da ficha.
- **Imagens opcionais:** silhuetas originais para todos os 14 tipos de criaturas, criadas dentro do projeto; quando o mestre tiver direito de usar uma imagem específica, é possível colar a **URL HTTPS** pelo botão **Adicionar imagem da criatura**. O link fica salvo na sessão local/sincronizada, sem copiar automaticamente imagens comerciais.
- **Combate touch-friendly:** barra de vida com percentuais e cores, PV temporários, dano rápido (`−1/−5/−10/−20`), cura rápida (`+1/+5/+10/+20`), aplicação manual, desfazer último dano/cura e marcação de condições em botões grandes.
- **Regras de PV temporários:** ao sofrer dano, eles são gastos primeiro; curas não ultrapassam os PV máximos. Todas as alterações persistem com o estado do combate.
- **Prioridade mobile:** controles de combate aparecem primeiro no celular, com áreas de toque amplas; a ficha continua acessível na mesma tela.
- As descrições das criaturas permanecem no idioma disponível no arquivo SRD/PT-BR instalado; o layout não traduz textos em tempo de execução.

### Arquivos visuais adicionados
- `theme-v2.css` — nova identidade de cor, layout de fichas e controle de combate
- `assets/creature-symbols.svg` — símbolos originais por tipo de criatura
- `tests/smoke.test.mjs` — testes de regressão da ficha, combate e botões de PV

**Nota:** o campo de imagem é uma referência remota HTTPS fornecida pelo mestre; sem imagem específica, a ficha mostra uma ilustração temática do tipo de criatura, não uma arte individual do monstro. O processo de tradução das descrições do SRD em português é separado do redesenho.
