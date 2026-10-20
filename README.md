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
A aplicação é **HTML/CSS/JavaScript sem dependências** e pode ser hospedada na Vercel conectando o repositório `gptdagalera69-png/GPT-R`. Framework: Other; diretório raiz `/`; sem comando de build.

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
- Os dados de criaturas do SRD estão em inglês na fonte; alguns rótulos e termos de interface estão em português.
- O balanceamento por XP não garante encontros seguros; revise habilidades de monstros, economia de ações e composição dos personagens.
- Condições são marcadas manualmente; contagem automática de duração, mapas/grids, multiplayer e fichas completas dos jogadores são para futuras versões.
- Se dois dispositivos alterarem a mesma sessão ao mesmo tempo, pode prevalecer o salvamento mais recente; evite edições concorrentes.
- A primeira sincronização de um dispositivo com dados locais pode solicitar decisão sobre qual cópia manter.
- Limpar os dados do navegador pode apagar dados locais; use backup e sincronização.

## Direitos e atribuições
O conteúdo de criaturas deriva de **D&D System Reference Document 5.2.1**, © Wizards of the Coast LLC, disponibilizado sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Fonte oficial: https://www.dndbeyond.com/sources/dnd/srd-5.2.1

O dataset estruturado é republicado por **Open5e** e por [adkinn/srd-5.2.1](https://github.com/adkinn/srd-5.2.1) com atribuição CC BY 4.0. O arquivo `public/data/monsters.json` foi colocado em `data/monsters.json` nesta aplicação para acesso estático; os valores em inglês não são uma tradução oficial do SRD.

Este aplicativo não oferece PDFs comerciais nem afirma conter todas as criaturas dos livros de D&D.

## Estrutura
- `index.html`, `styles.css`, `app.js`, `sync.js`: interface e lógica
- `public/data/monsters.json`: fichas SRD estruturadas
- `sw.js`, `manifest.webmanifest`, `icon.svg`: PWA
- `supabase/001_dm_workspace.sql`: tabela + RLS
