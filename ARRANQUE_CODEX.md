# Arranque do desenvolvimento no Codex

Usar este pedido quando o utilizador iniciar a implementação. A preparação destes documentos não inicia desenvolvimento nem publicação.

## 1. Fontes e âmbito

Lê PLANO.md e TESTES_ACEITACAO.md antes de alterar o projeto. O plano é a fonte de comportamento; os testes são os critérios verificáveis. Não voltes a escolher a plataforma: o MVP é uma PWA instalável com React, TypeScript, Vite, CSS Modules, Dexie/IndexedDB e Zod. Os serviços definidos são Cloudflare Static Assets, Workers/D1 e Web Push. Não criar projetos nativos.

A aplicação entra sem conta e conserva os dados no dispositivo, sem teto de utilizadores local. Conta e envio de tabelas só podem surgir no modo de sincronização explicitamente ativado. Funcionamento totalmente offline está fora do âmbito e do roadmap; não implementar essa melhoria, exigir os seus testes ou confundi-la com persistência local e recuperação de falhas da API.

## 2. Primeiro trabalho

Inspeciona o projeto e as instruções aplicáveis. Cria instruções de projeto curtas com os comandos reais de desenvolvimento/verificação e as restrições de privacidade/orçamento. Não adicionar comparações de fornecedores, histórico de conversa ou estruturas genéricas desnecessárias aos documentos.

Faz as provas pequenas da etapa 0 do plano, com dados fictícios e serviços locais: persistência, exportação/importação em dois dispositivos/contextos, ligação autorizada/conflitos, Web Push/calendário e amostras de OCR. Um teste de hardware não disponível fica pendente, sem alegar sucesso por emulação.

## 3. Implementação

Segue as entregas da secção 10 do plano:

1. Identidades, participações, semanas, mínimos e indicadores.
2. Grelha, conferência manual de nomes, histórico, perfil e tabela inicial.
3. Transferência manual completa e conservação.
4. Sincronização automática opcional e redução de pedidos.
5. Lembretes e alternativa de calendário.
6. Instalação/publicação HTTPS e piloto, quando a fase de publicação for iniciada.

Mantém o caminho manual completo mesmo com serviços remotos desligados. Ler um ficheiro escolhido pelo utilizador é uma operação local, sem upload para o backend. Preserva IDs, motivos, recolhas e revisões; valida, pré-visualiza e confirma substituições. Uma importação não ativa ou propaga dados remotamente em silêncio.

Na sincronização, cumpre a política de lotes, diferenças, foco agrupado, verificação limitada enquanto visível e tentativas com espera crescente da secção 5.2. O teste controlado de propagação tem limite de 75 segundos. Não confundir uma cópia importada com sincronização automática.

## 4. Regras que não podem perder-se

- Interface em inglês nesta versão; localização fica para depois. O formulário inicial acompanha uma aliança existente: «Set up your dashboard», ação «Start». Não destacar a hora do reset no início ou na visão geral. Manter apenas a informação temporal funcional das definições de lembretes e dos dados recolhidos.

- Reset fixo: terça 19:00 UTC. Datas/horas e intervalo semanal apresentados segundo fuso e formato locais, como 20/10/26 - 27/10/26 em Portugal.
- O UUID interno é criado pela aplicação e não vem do Marvel Snap. Nome e contacto são editáveis; o contacto Discord/X é uma pista para decisão manual, sem provar identidade.
- Cumpre RF20/RN20–RN22: destaca nomes desconhecidos e nomes não encontrados, distingue recolhas parciais e pede confirmação para associar resultados, mudar nome ou criar jogador. Nunca infiras automaticamente mudança de nome ou saída. Permite adiar e preservar a linha pendente.
- Uma mudança de nome confirmada mantém o mesmo ID e todo o histórico; guarda os nomes anteriores e os nomes observados nas recolhas. Importar um nome antigo não substitui o atual automaticamente. Sem registo é diferente de zero.
- Selecionar dispensa manual pede sempre motivo antes de confirmar. Aplicar qualquer motivo preenchido, sem julgar a sua suficiência. Entrada parcial automática usa motivo do sistema.
- Conservar mínimos históricos e momentos de recolha separados da introdução/importação.
- Não inventar uma integração com Marvel Snap, resultados finais ou precisão de OCR.
- Lembretes funcionam sem conta e sem sincronizar pontos; cada dispositivo autoriza notificações. O calendário é uma alternativa gerida pelo utilizador, não um feed remoto.

## 5. Preparação para crescer sem custos obrigatórios

Implementa RF12/ESC01–ESC06 no MVP: domínio/local separados do transporte, formato e revisões partilhados, chamadas em lotes, medição mínima sem dados pessoais, recuperação de quota e exportação local de calendário.

Deixa o contrato preparado para FUT01–FUT03: ligação direta, armazenamento escolhido pelo utilizador e receção orientada por eventos. Não implementar estes transportes futuros agora nem criar uma plataforma de plugins. Não apresentar outro fornecedor, WebSocket ou WebRTC como forma de eliminar todas as quotas.

Mede chamadas, CPU e leituras/escritas, incluindo o pico anterior ao reset. Reconfirma as quotas oficiais quando implementares. Não ativar faturação paga, criar um serviço/base/agendamento por pessoa ou bloquear o uso local por quota remota. Não usar APIs pagas de OCR/IA nem incorporar a API OpenAI.

## 6. Verificação e entrega

Usa Vitest, Playwright e Wrangler/D1 locais sem contactar produção. Preserva os IDs AC existentes: AC29 está retirado, os P2 só são obrigatórios se a funcionalidade entrar na versão, e os P0/P1 aplicáveis são o critério do MVP.

Publica apenas os ficheiros da PWA num endereço HTTPS estável, nunca dados reais de jogadores, backups ou segredos. O código pode ser versionado em repositório privado; dados e credenciais não.

Por entrega, comunica o que mudou, os cenários realmente verificados, o consumo observado e o que ficou pendente. Não declarar o MVP concluído com critérios obrigatórios por demonstrar. O URL de apoio já foi confirmado: https://ko-fi.com/tequilasunsett. As amostras do jogo e os dispositivos/clientes alvo têm de ser confirmados antes do lançamento.
