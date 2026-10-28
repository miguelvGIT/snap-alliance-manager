# Testes de aceitação — gestor de alianças Marvel Snap

Versão consolidada: 28/10/2026. Estado: critérios de aceitação. A execução e as pendências atuais estão registadas em VALIDACAO.md; não considerar todos os critérios aprovados.

A interface desta versão está em inglês. As descrições dos cenários mantêm-se em português; os textos de controlos e mensagens devem seguir a decisão atual de PLANO.md. Não destacar a hora do reset no ecrã inicial.

Ler em conjunto com PLANO.md, a fonte de comportamento. Os IDs anteriores foram conservados para manter referências; os cenários estão agora agrupados por funcionalidade, não pela ordem das alterações da conversa.

- P0: essencial no MVP.
- P1: importante e incluído no MVP.
- P2: futuro; inclui agora a sincronização automática e os seus conflitos. Não bloqueia o MVP; só se valida quando essa funcionalidade entrar numa entrega P2.
- AC29 foi retirado: abertura/uso totalmente offline está fora do âmbito e não é uma evolução planeada. O ID não será reutilizado.
- A futura sincronização automática P2 usa um ciclo de verificação de um minuto e, no teste controlado, uma tolerância total até 75 segundos. Isto não é uma garantia de disponibilidade em produção.
- Falhas temporárias de rede/API e persistência local continuam a ser testadas; não exigem iniciar a aplicação inteira sem internet.

## Dados de referência
Relógio de teste: 27/10/2026 às 19:01 UTC. Mínimo: 2 700. Configuração regional de referência: pt-PT, fuso Europe/Lisbon. Semanas validadas e terminadas, identificadas pelo mesmo intervalo de datas que deve aparecer na aplicação. Os instantes UTC são a definição interna dos limites:

| Semana apresentada em Portugal | Início UTC | Fim UTC |
| --- | --- | --- |
| 29/09/26 - 06/10/26 | 29/09/2026 19:00 | 06/10/2026 19:00 |
| 06/10/26 - 13/10/26 | 06/10/2026 19:00 | 13/10/2026 19:00 |
| 13/10/26 - 20/10/26 | 13/10/2026 19:00 | 20/10/2026 19:00 |
| 20/10/26 - 27/10/26 | 20/10/2026 19:00 | 27/10/2026 19:00 |

| Jogador | 29/09/26 - 06/10/26 | 06/10/26 - 13/10/26 | 13/10/26 - 20/10/26 | 20/10/26 - 27/10/26 | Condição | Média esperada | Incumprimentos |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Ana | 4 000 | 2 000 | 3 000 | 1 000 | 20/10/26 - 27/10/26 dispensada com motivo «Férias» | 2 500,00 | 1 |
| Bruno | 400 | 2 800 | 0 | 2 700 | Entrada em 01/10; 29/09/26 - 06/10/26 parcial | 1 833,33 | 1 |
| Carla | sem registo | 2 700 | 2 600 | 2 900 | 29/09/26 - 06/10/26 explicitamente incompleta | 2 733,33 | 1 |
| Duarte | 1 000 | 2 000 | 2 700 | 3 000 | Sem dispensas | 2 175,00 | 2 |
| Eva | sem registo | sem registo | sem registo | sem registo | Sem dados avaliáveis | — | 0, com aviso de ausência de dados |

Arredondar apenas a apresentação da média a duas casas; usar o valor original nos cálculos. Estes nomes são dados fictícios.

## 1. Acesso, conservação, interface e publicação

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC01 | P0 | Dada uma instalação nova sem conta, quando o gestor cria a aliança e define mínimo 2 700 e meta 80 000. | Entra diretamente e os dados reaparecem ao reabrir; o reset terça 19:00 UTC é apresentado na hora local e não é editável. | Automático, fluxo completo. |
| AC58 | P0 | Dada uma instalação nova, quando se criam jogadores, semanas, dispensas e ficheiros sem ativar sincronização ou lembretes. | Funciona sem conta nem criação de identidade remota. Não envia nomes, pontos ou motivos; pedidos aos ficheiros da PWA são permitidos. | Fluxo e inspeção de rede. |
| AC69 | P0 | Dadas várias instalações independentes, quando pessoas novas abrem a PWA e criam/consultam/corrigem/exportam os seus dados, incluindo quando os serviços remotos devolvem erro de quota. | Não existe contador máximo de utilizadores, licença por pessoa, lista de espera ou verificação remota de vagas. O acesso aos ficheiros estáticos e ao fluxo local não depende da API de sincronização/notificações. Os dados de cada instalação permanecem independentes e nenhuma falha de quota remota bloqueia as operações locais. | Automático em contextos independentes, falhas remotas simuladas e revisão da configuração de publicação. |
| AC64 | P0 | Dada a PWA já carregada, modo local e API de sincronização sem credenciais ou indisponível, quando se regista/corrige uma semana e se exporta ficheiro. | Persiste em IndexedDB sem depender de sessão/cache remota. A falha da API não bloqueia operações locais. Não se exige abertura de raiz sem internet. | Serviços simulados como indisponíveis. |
| AC38 | P0 | Dado um histórico guardado, quando a PWA instala uma atualização e migra o formato local. | Os dados e operações pendentes mantêm-se. Um erro de migração não apaga silenciosamente o armazenamento. | Automático. |
| AC52 | P0 | Dado o URL real de apoio configurado, quando o gestor toca em «Apoiar o projeto». | Abre o destino correto; não envia pontos, nomes ou justificações no URL nem bloqueia qualquer funcionalidade se o utilizador não apoiar. | Automático. |
| AC53 | P0 | Quando se usam ecrãs de 360 px e desktop, teclado, toque e ampliação. | Campos essenciais e ações são utilizáveis; só a área da tabela pode deslocar-se horizontalmente. Datas, estados e justificações continuam legíveis. | Automático + visual. |
| AC80 | P1 | Dado um jogador com nome anterior e contacto social, quando se pesquisa por cada um deles e se ordena a tabela por pontos/incumprimentos. | A pesquisa encontra o mesmo jogador e o perfil correto; a ordenação muda só a apresentação, sem alterar IDs, contagens, médias ou o âmbito histórico. | Automático na tabela e no perfil. |
| AC54 | P0 | Dada a PWA publicada em HTTPS, quando é instalada e reaberta com ligação em iOS, Android e Windows. | A instalação e o fluxo principal funcionam com persistência local. O deploy não contém dados reais de alianças nem exige pacotes nativos. Abrir/usar totalmente sem internet está fora do âmbito. | Manual por sistema; macOS se disponível. |

## 2. Identidade e participação dos jogadores

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC04 | P0 | Dado um jogador com quatro semanas e contacto Discord, quando o gestor confirma na revisão uma mudança de nome, ou confirma a edição manual do nome no perfil. | Conserva o UUID criado pela aplicação, contactos, participações, resultados, mínimos e dispensas. A tabela mostra o nome atual; o anterior e os nomes observados nas recolhas antigas continuam consultáveis. Os indicadores históricos não mudam só por renomear e não surge outro jogador. Na revisão, os alertas da associação ficam resolvidos e a decisão fica registada. Não é necessário um ID do Marvel Snap. | Automático nos dois fluxos. |
| AC05 | P0 | Dados dois jogadores com o mesmo nome ou nomes semelhantes, quando se importam linhas. | A aplicação não funde as identidades automaticamente; permite escolher o jogador ou criar outro. | Automático. |
| AC06 | P0 | Dado um jogador sem Discord/X, quando é criado e depois recebe ou altera um contacto social. | O contacto é opcional e editável; as alterações não criam outro jogador nem exigem autorização numa rede social. O contacto não é chave única nem autoriza associar automaticamente resultados, mesmo quando coincide com outro registo. | Automático. |
| AC25 | P0 | Dado um jogador que sai e mais tarde regressa. | Arquivar não apaga o passado; a saída impede incumprimentos em semanas sem participação; a reentrada usa o mesmo jogador e abre nova participação. | Automático. |
| AC26 | P0 | Dada rotação de jogadores durante uma semana, quando existem mais de 30 pessoas diferentes ao longo dessa semana. | Os registos históricos não são truncados a 30. Uma lista incompleta não gera zeros para quem saiu. | Automático. |
| AC81 | P0 | Dado um jogador registado como «SnapAntigo» com contacto Discord guardado, quando uma recolha confirmada como completa contém «SnapNovo» desconhecido e não contém «SnapAntigo». | Destaca «SnapNovo» como nome desconhecido e «SnapAntigo» como nome não encontrado na lista recolhida. Permite consultar o contacto Discord e o histórico para revisão, mas não confirma mudança de nome, cria jogador, regista saída ou atribui pontos automaticamente. | Automático na comparação e na grelha. |
| AC82 | P0 | Dado um nome desconhecido e um jogador antigo ausente, quando o gestor confirma que o nome desconhecido pertence a uma pessoa nova. | Cria um novo ID interno apenas após confirmação e associa-lhe os pontos escolhidos. O jogador ausente conserva nome, contacto e histórico; não é substituído, fundido ou arquivado automaticamente. | Automático. |
| AC83 | P0 | Dados 30 jogadores esperados, quando se registam apenas as primeiras dez linhas de uma recolha parcial e depois se acrescentam as restantes. | Os não vistos são indicados como «Não observado nesta recolha parcial», sem afirmar saída ou mudança de nome e sem gerar zeros/incumprimentos. A referência e a completude são visíveis; os avisos são recalculados quando a recolha é completada e revista. O número de linhas não confirma a completude sozinho. | Automático com recolha parcial/completa. |
| AC84 | P0 | Dados vários nomes desconhecidos e vários nomes ausentes, com nomes semelhantes, pontos iguais, ordem diferente ou contactos coincidentes. | Não escolhe pares nem funde jogadores automaticamente. O gestor pode procurar e selecionar qualquer jogador existente por nome atual, nome anterior ou contacto, ver o histórico e confirmar cada decisão. Os alertas têm texto e não dependem só da cor. | Automático + visual. |
| AC85 | P0 | Dada uma linha desconhecida, quando se abre e cancela a associação, ou se adia a decisão e se guarda o rascunho. | Cancelar não altera nomes, contactos, resultados ou histórico. Adiar conserva a linha, pontos e momento de recolha como pendentes, sem criar jogador nem contar esses pontos. Validar exige resolver a linha ou excluí-la explicitamente da avaliação, mantendo o original e o aviso de semana incompleta. | Automático. |
| AC86 | P0 | Dado um jogador cujo nome atual é «SnapNovo» e anterior «SnapAntigo», quando se importa uma semana antiga com «SnapAntigo», ou esse nome reaparece numa recolha nova. | Apresenta a correspondência com nome anterior para confirmação. Associar os resultados antigos conserva o nome observado e não altera o nome atual. Uma eventual mudança do nome atual é confirmada separadamente; não se presume que um nome reutilizado pertence à mesma pessoa. | Automático. |
| AC87 | P0 | Dada uma mudança de nome confirmada e outra linha ainda pendente, quando se exporta/importa o conjunto ou se sincroniza com outro dispositivo autorizado. | Preserva IDs internos, nomes atuais/anteriores, contactos, nomes observados, histórico, decisão/revisão e linha pendente com a sua recolha. Não volta a criar jogadores nem toma decisões automáticas de identidade no destino. | Integração de ficheiro e sincronização em duas sessões. |

## 3. Introdução de pontos, recolhas e semanas

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC07 | P0 | Quando se cola uma lista válida de nomes e pontos numa semana. | Surge uma pré-visualização; o gestor revê as associações e confirma os valores antes da validação semanal. | Automático. |
| AC08 | P0 | Dadas 30 linhas para rever, quando existem nomes desconhecidos, valores ambíguos ou linhas sem pontos. | As linhas são assinaladas; é possível corrigir ou marcar «sem registo». Nenhuma ambiguidade vira zero silenciosamente. | Automático. |
| AC09 | P0 | Dada uma semana já registada, quando se colam novamente as mesmas linhas. | Não surgem duplicados nem soma de pontos; valores divergentes pedem revisão. | Automático. |
| AC11 | P0 | Quando o gestor abre capturas de referência e introduz os pontos. | Pode consultar as imagens e rever a grelha; os ficheiros não são enviados para serviços de OCR ou armazenamento na nuvem. | Automático de rede + manual de utilização. |
| AC10 | P0 | Dada uma captura recolhida às 18:55 UTC de 27/10, quando é introduzida às 19:10 e o utilizador indica manualmente a data/hora de recolha. | Pode ser atribuída à semana «20/10/26 - 27/10/26» em Portugal; mostra recolha 18:55 com indicação manual e introdução 19:10 registada pela aplicação. O histórico indica que os pontos foram observados cinco minutos antes do reset, sem presumir pontos ganhos posteriormente. | Automático. |
| AC67 | P0 | Dada introdução manual ou importação sem informação fiável do momento da recolha, quando se preenche ou corrige a data/hora, ou se declara que é desconhecida. | Permite indicação manual na hora local, guarda o instante UTC e a origem manual, conserva a indicação anterior nas revisões e a hora de introdução separada. Se desconhecida, mostra «não indicada» e não usa a hora do ficheiro, importação ou OCR como se fosse a da recolha. | Automático. |
| AC68 | P0 | Dadas capturas da mesma semana feitas às 18:54 e 18:56, quando são introduzidas às 19:10 e mais tarde sincronizadas ou restauradas de backup. | Mantém os momentos de cada recolha associados aos respetivos resultados e mostra o intervalo conhecido 18:54–18:56. A importação às 19:10 não substitui esses momentos; os metadados conservam-se na sincronização e no backup. | Automático. |
| AC16 | P0 | Quando o relógio passa de 27/10/2026 18:59:59 UTC para 19:00:00 UTC. | A semana nova começa exatamente no segundo instante; os pontos anteriores mantêm-se na semana anterior. Não são copiados nem transformados em zeros na nova semana. | Automático. |
| AC17 | P0 | Dado reset fixo 19:00 UTC e zona Europe/Lisbon, quando se consulta 07/07/2026 e 27/10/2026. | A hora local é respetivamente 20:00 e 19:00; os limites UTC não mudam por causa do horário de verão. | Automático. |
| AC63 | P0 | Dado reset terça 19:00 UTC, quando o fuso apresentado é UTC+2, UTC+5:30 ou Europe/Lisbon em datas de verão/inverno, e se altera a configuração regional. | Mostra respetivamente terça 21:00, quarta 00:30 e a hora sazonal correta em Lisboa. A semana de 20/10/2026 19:00 UTC a 27/10/2026 19:00 UTC tem rótulo «20/10/26 - 27/10/26» em pt-PT/Lisboa e «21/10/26 - 28/10/26» em pt-PT/UTC+5:30. Outra configuração regional usa a sua ordem/separadores de data, mantendo dois algarismos no dia, mês e ano. Não existe controlo para mudar o reset; o ID e os limites UTC não mudam. | Automático com fusos e datas parametrizados. |
| AC18 | P0 | Dada a semana «20/10/26 - 27/10/26» com mínimo 2 700, quando o mínimo por defeito muda para 3 000. | Essa semana e os seus indicadores mantêm o mínimo original; novas semanas recebem o novo mínimo. | Automático. |
| AC19 | P0 | Dada uma semana validada, quando o gestor corrige pontos com motivo, ou seleciona essa semana nas Settings e corrige o mínimo com motivo. | A revisão anterior permanece consultável; média e contagem são recalculadas uma vez, sem duplicação. O mínimo por defeito e as outras semanas não mudam por uma correção histórica. O registo semanal não tem ação para editar mínimos. | Automático. |
| AC15 | P0 | Dada uma semana corrente ou em rascunho, quando existem pontos abaixo do mínimo. | Não aumentam ainda os incumprimentos históricos. Uma semana validada só entra quando o respetivo fim passar. | Automático com relógio controlado. |
| AC27 | P0 | Dada uma semana com alguns resultados desconhecidos, quando o gestor confirma a validação incompleta. | Os resultados conhecidos podem ser avaliados, mas os restantes mantêm «sem registo» e a semana conserva o aviso de incompletude. | Automático. |
| AC02 | P0 | Dado um mínimo de 2 700, quando se registam 2 699, 2 700 e 2 701 numa semana elegível. | Apenas o primeiro resultado é incumprimento. | Automático, regra e interface. |
| AC03 | P0 | Quando se introduzem pontos negativos, frações, texto inválido ou mínimo negativo. | A aplicação explica o problema e não guarda esses valores como resultados válidos. Zero e mínimo zero são aceites. | Automático. |

## 4. Indicadores e dispensas

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC12 | P0 | Dados os cinco jogadores de referência, configuração pt-PT e fuso Europe/Lisbon, quando se abre o início, histórico ou seletor de semana. | Surgem as semanas identificadas pelos intervalos locais completos, incluindo «20/10/26 - 27/10/26». Os cabeçalhos da tabela usam estes intervalos e não códigos sequenciais. No início, surgem também nome atual, contacto, contagem e média; valores e contagens coincidem com a referência. | Automático. |
| AC13 | P0 | Dadas 20 semanas históricas, quando o ecrã inicial mostra apenas as oito últimas. | As 20 continuam consultáveis; média e contagem indicam o âmbito histórico e não mudam apenas por ocultar colunas. | Automático. |
| AC14 | P0 | Dado um resultado de zero e outro sem registo. | Zero conta como incumprimento se elegível; sem registo fica identificado e excluído da contagem e da média. | Automático. |
| AC20 | P1 | Dada Ana com resultado baixo na semana «20/10/26 - 27/10/26», quando se seleciona «Dispensar mínimo desta semana». | Abre sempre o pedido de motivo obrigatório antes de aplicar a dispensa. Confirmar fica disponível com o campo preenchido; ao indicar «Férias» e confirmar, aplica a dispensa sem avaliar o conteúdo, mantém 1 000 pontos visíveis e permite consultar o motivo. Não existe uma tentativa inicial recusada por falta de motivo. | Automático. |
| AC66 | P1 | Dado um resultado sem dispensa, quando se seleciona a opção e depois se cancela; e quando se volta a selecionar a opção e se confirma com um motivo preenchido. | Cancelar mantém pontos e contagem anteriores. Cada nova seleção pede o motivo. Confirmar aplica a dispensa sem julgar o texto; motivo e data ficam guardados. A dispensa automática por entrada parcial mantém o motivo gerado pelo sistema. | Automático. |
| AC21 | P1 | Dada a dispensa de Ana na semana «20/10/26 - 27/10/26», quando é removida com registo da alteração. | A média mantém-se 2 500 e a contagem passa de 1 para 2; o histórico da dispensa continua acessível. | Automático. |
| AC22 | P1 | Dado Bruno com entrada em 01/10, quando se valida a semana «29/09/26 - 06/10/26». | Essa semana fica marcada como entrada parcial, não penaliza e não entra na média; «06/10/26 - 13/10/26» é avaliada normalmente. | Automático. |
| AC23 | P1 | Dado um jogador que entrou exatamente no início da semana, quando fica abaixo do mínimo. | Não recebe a dispensa automática de entrada parcial. | Automático. |
| AC24 | P1 | Dado Duarte com dois incumprimentos e Ana com um. | Duarte tem destaque e texto explicativo; Ana não tem o destaque de múltiplos incumprimentos. É possível distinguir ambos sem depender da cor. | Automático + visual. |

## 5. Ficheiros, backup e recuperação

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC35 | P0 | Dados os dados de referência, quando «Exportar dados» gera um ficheiro e este é importado na PWA de um dispositivo vazio. | Recupera aliança, identidades/nomes/contactos, participações, semanas, mínimos, pontos, motivos, recolhas, revisões e preferências aplicáveis; os indicadores coincidem. O ficheiro tem versão e momento de exportação, sem credenciais ou subscrições de push. | Automático em dois contextos e validação real de seleção/gravação de ficheiros. |
| AC36 | P0 | Dado um ficheiro inválido, de versão não suportada ou importado para um destino com dados existentes. | Os inválidos não alteram dados. Nos restantes, mostra pré-visualização e substituição explícita, com possibilidade de exportar a cópia atual. Cancelar mantém tudo. Não funde alterações de ambos os dispositivos nem usa apenas a data de exportação para presumir que uma cópia inclui tudo. | Automático. |
| AC37 | P0 | Quando guardar falha por falta de espaço, indisponibilidade remota ou quota. | Não aparece um falso sucesso. Os dados já guardados mantêm-se; alterações recuperáveis continuam visíveis como pendentes e é possível exportá-las. | Automático com falhas simuladas. |
| AC70 | P0 | Dadas duas instalações sem conta, com serviços remotos desligados, quando o utilizador exporta um ficheiro no PC e o seleciona na PWA do telemóvel. | A transferência recupera todos os dados estruturados sem contactar APIs de sincronização ou notificações e sem enviar o ficheiro para um servidor. A seleção/importação usa leitura local; só os pedidos normais aos ficheiros da aplicação são permitidos. | Automático com inspeção de rede + teste de ficheiros em iOS/Android/Windows. |
| AC71 | P0 | Dado um ficheiro já importado, quando o mesmo ficheiro é importado novamente; e quando depois se alteram dados apenas num dos dispositivos. | A repetição não duplica registos/revisões nem altera indicadores. A alteração posterior permanece no dispositivo onde ocorreu até nova transferência ou sincronização automática ativada. A interface mostra momentos de transferência e não afirma uma ligação permanente. | Automático em dois contextos. |
| AC72 | P0 | Dado um ficheiro com preferências gerais, quando é importado num dispositivo novo ou num espaço que já tinha sincronização ativa. | Não copia credenciais/subscrições nem ativa sincronização ou notificações automaticamente. No espaço já ligado, a importação não propaga a cópia remotamente sem confirmação do destino/retoma. A permissão de notificações é tratada no novo dispositivo e a operação local conserva a cópia anterior em caso de falha. | Automático com rede observada + verificação de permissões em dispositivo real. |
| AC62 | P0 | Dado modo local, quando se restaura um backup; ou, numa futura entrega P2 com emparelhamento, quando se perde um dispositivo e se tenta recuperar o espaço. | O backup funciona sem conta. A recuperação remota usa outro dispositivo autorizado ou chave própria, conforme a solução escolhida; a ausência de mecanismos de recuperação é explicada sem fingir recuperação por email. Conta, se oferecida, só surge na opção de sincronizar. | Automático + revisão do fluxo. |

## 6. Sincronização automática — P2, fora do MVP

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC59 | P2 | Dado histórico local existente, quando se ativa a sincronização e se liga outro dispositivo. | Existe confirmação explícita da ligação remota; o histórico original mantém IDs, mínimos, motivos e revisões. Nada é enviado antes da ativação. | Automático em duas sessões. |
| AC60 | P2 | Dado o caminho preferido por emparelhamento, quando se usam convites expirados, já usados, inválidos ou não aprovados. | Não dão acesso. Um convite válido só funciona com a autorização prevista e protege tentativas; um código curto não é a credencial permanente do espaço. | Automático; obrigatório se esta for a solução lançada. |
| AC61 | P2 | Dados dois dispositivos emparelhados, quando um é revogado ou se desativa a sincronização localmente. | A revogação impede novos acessos remotos com as credenciais revogadas; desativar sincronização interrompe novos envios do dispositivo. A cópia local continua utilizável. Não se promete apagar dados que um dispositivo já descarregou. | Automático. |
| AC28 | P2 | Dadas duas sessões autorizadas com sincronização ativa e ambas visíveis, quando se altera um resultado no PC. | O telemóvel recebe a alteração no ciclo seguinte, até 75 segundos em condições normais controladas, sem transferir ficheiros. A indicação remota só aparece após confirmação. | Duas sessões + dispositivo real; relógio controlado. |
| AC30 | P2 | Dadas alterações locais pendentes e uma falha temporária da API, quando o serviço volta a estar disponível com a PWA ativa. | Retoma o envio automaticamente, sem perder alterações ou fingir confirmação remota antes de a receber. | Automático. |
| AC31 | P2 | Dadas duas sessões da PWA já carregadas e baseadas na mesma versão, quando ambas corrigem o mesmo resultado com o serviço de sincronização inacessível e depois voltam a ligar. | Ambas as revisões ficam preservadas; o conflito é identificado e o gestor escolhe a resolução. Nenhuma versão desaparece por ser a última escrita. O teste não exige abrir a aplicação de raiz sem internet. | Automático em duas sessões. |
| AC32 | P2 | Quando uma operação de sincronização é repetida após falha de ligação. | O mesmo identificador de operação impede duplicar resultado, revisão ou contagem. | Automático com falha simulada. |
| AC33 | P0 | Dados lembretes privados de A e B, quando um pedido sem credencial ou com credencial de B tenta alterar/remover os de A. A mesma regra aplica-se aos espaços sincronizados quando P2 for entregue. | Só dispositivos autorizados de A conseguem; o serviço recusa os restantes mesmo em pedidos diretos. Conhecer apenas o ID do espaço não dá acesso. | Automático na API; emuladores se aplicável. |
| AC34 | P2 | Quando se desliga um espaço sincronizado ou se muda para outro no mesmo navegador. | Os dados não são misturados nem enviados para o novo espaço sem ação explícita. Dados locais e alterações pendentes não são descartados sem aviso e possibilidade de recuperação. | Automático. |

## 7. Lembretes e calendário

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC39 | P1 | Dado reset fixo 27/10/2026 19:00 UTC, notificações ativadas sem conta e antecedência de 30 minutos. | As definições mostram envio previsto às 18:30 UTC e a hora local correspondente. A preferência reaparece ao reabrir; só é partilhada com outro dispositivo depois de ligação explícita. | Automático. |
| AC40 | P1 | Quando se escolhem 5, 15, 60 ou 120 minutos e um valor personalizado válido; depois zero, negativo, fração ou valor igual/superior a uma semana. | Os válidos são guardados e recalculam o próximo envio; os inválidos são recusados com explicação. | Automático parametrizado. |
| AC41 | P1 | Dado o agendamento confirmado e a aplicação fechada num dispositivo online com autorização. | O serviço tenta enviar no primeiro ciclo devido e a notificação é observada no dispositivo. O teste técnico usa relógio controlado; a entrega real é validada à parte e não tem garantia de segundo exato. | Automático no serviço + manual com app fechada. |
| AC42 | P1 | Dada inexistência de recolha automática e apenas um rascunho manual. | O lembrete mantém-se ativo. Se uma futura recolha automática falhar, essa falha também não suprime o lembrete. | Automático. |
| AC43 | P1 | Quando o utilizador altera a antecedência ou desativa lembretes antes do envio, e depois muda de fuso no dispositivo. | A configuração confirmada atualiza o agendamento. A mudança de fuso só muda a apresentação local; não altera o instante UTC nem duplica o envio. Alterações offline permanecem pendentes até confirmação. | Automático. |
| AC44 | P1 | Dado um evento que é processado duas vezes ou uma tentativa que precisa de repetição. | A chave de deduplicação e a identificação da notificação evitam duplicações visíveis no mesmo dispositivo. Não prometer entrega exatamente uma vez em toda a rede. | Automático + teste de integração. |
| AC45 | P1 | Dado um dispositivo offline até depois do reset, quando volta a ligar. | A mensagem antiga expira ou é descartada; a aplicação não a apresenta como um lembrete válido para recolher a semana que já desapareceu. | Automático + real. |
| AC46 | P1 | Quando a permissão é recusada, revogada ou não suportada. | A interface mostra o estado real e permite tentar novamente quando aplicável ou exportar um lembrete de calendário. Não indica «ativo» sem autorização. | Automático + real. |
| AC47 | P1 | Dada uma PWA no iPhone compatível adicionada ao ecrã principal, quando se ativa uma notificação de teste e depois um lembrete real com a app fechada. | A receção é comprovada no iPhone; uma mera simulação WebKit não é aceite como evidência. A instalação/versão necessária é explicada quando falta. | Manual em iPhone real. |
| AC48 | P1 | Dados dois dispositivos ligados ao mesmo espaço, quando apenas um é ativado para notificações ou se remove uma subscrição. | Só os dispositivos ativados recebem novos lembretes; uma subscrição inválida é retirada sem impedir o envio aos restantes. Conta convencional não é obrigatória. | Automático + real. |
| AC49 | P1 | Quando se toca num lembrete. | Abre a semana relevante e a ação para registar resultados; não começa a capturar o jogo sem interação. A mensagem não revela nomes ou pontos no ecrã bloqueado. | Automático + real. |
| AC50 | P1 | Dado que a hora prevista já passou, mas ainda não ocorreu o reset, quando se ativa o lembrete. | A aplicação oferece «Lembrar agora» e mostra a próxima recorrência; não finge que o envio anterior aconteceu. | Automático com relógio controlado. |
| AC51 | P1 | Dado reset 19:00 UTC e antecedência 30 minutos, quando se atravessa a mudança de horário de verão em Lisboa. | O lembrete continua 30 minutos antes do reset real; apenas a apresentação da hora local muda. | Automático. |
| AC65 | P1 | Dada sincronização desativada e ausência de conta, quando se ativam lembretes Web Push. | Consegue registar e receber o lembrete autorizado; só envia subscrição, identidade técnica e preferências necessárias. Os dados dos jogadores continuam locais e não surge um pedido de conta. | Automático de rede + dispositivo real. |
| AC76 | P1 | Dada antecedência escolhida, quando se exporta um lembrete iCalendar e se importa num calendário alvo compatível. | O ficheiro local descreve reset semanal terça 19:00 UTC e o aviso escolhido, sem dados de jogadores e sem pedido à API de envio. O calendário gere o alerta após ação do utilizador. Explica diferenças de suporte, reimportação após mudanças e risco de duplicados; não usa feed remoto. | Validação do ficheiro + calendário/dispositivo real. |

## 8. Preparação local do MVP e chamadas de sincronização P2

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC73 | P0 | Dado um conjunto de dados com IDs/revisões estáveis, quando se exporta/importa e se verifica o contrato de transporte com dados fictícios. O serviço de sincronização real só é exigido em P2. | O mesmo modelo e validação conservam identidades, indicadores e conflitos em ambos os caminhos. O transporte é substituível sem migrar o histórico nem reescrever os cálculos. | Integração de ficheiro e contrato com transporte simulado; serviço real em P2. |
| AC74 | P2 | Dada sincronização ativa, quando se editam 30 resultados com intervalos inferiores a 5 segundos, se repetem eventos de foco e depois se oculta a aplicação. | Guarda localmente de imediato e envia as edições num lote após a janela de 5 segundos sem alterações, sem um pedido por célula. Agrupa foco em 30 segundos; verificações periódicas leves só enquanto visível, no máximo uma vez por minuto. Desativada, não faz pedidos de pontos. | Relógio controlado e contagem de pedidos por tipo. |
| AC75 | P0 | Dado que a API devolve erro de quota/rede, quando o cliente tenta recuperar. | Conserva pendentes, espaça e limita repetições, sem ciclo infinito ou falha falsa de sucesso. Registo, histórico, ficheiro e exportação de calendário continuam disponíveis; não ativa faturação nem bloqueia utilizadores locais. | Falhas simuladas e registo de tentativas. |

## 9. Evoluções futuras — não obrigatórias no MVP

RF08/RF18, AC28, AC30–AC32, AC34, AC59–AC61 e AC74 também são P2. Nos cenários mistos AC62, AC72 e AC87, o caminho de ficheiro/local é obrigatório no MVP e a parte remota é condicional a P2.

| ID | Prioridade | Dado / Quando | Então — resultado observável | Verificação |
| --- | --- | --- | --- | --- |
| AC55 | P2 | Dadas capturas sobrepostas com várias colunas, quando o OCR é executado localmente. | Usa a coluna de contribuição acordada, não confunde cubos/missões com pontos, assinala dúvidas e não soma linhas repetidas. Há revisão antes de validar. | Corpus anotado + inspeção de rede. |
| AC56 | P2 | Dada uma janela de jogo autorizada num PC compatível, quando o gestor percorre a tabela durante a captura assistida. | Só as linhas realmente vistas são propostas; regista automaticamente os momentos da captura, associados às linhas/recolhas e distintos do processamento/importação. Linhas em falta e valores divergentes exigem revisão. Terminar a captura interrompe o acesso. | Manual por navegador + corpus; relógio controlado para metadados. |
| AC57 | P2 | Dado um vídeo importado num formato suportado. | São extraídas linhas para revisão sem envio do vídeo à nuvem; formato não suportado ou falta de memória resulta numa alternativa por capturas, sem perda de dados guardados. | Manual em dispositivos reais. |
| AC77 | P2 | Dada a futura ligação WebRTC entre dois dispositivos autorizados ativos numa rede compatível, quando se transferem alterações. | Após negociação, os dados passam pelo canal direto, sem pedido à nossa API por alteração. Preserva IDs/conflitos e limita pedidos de sinalização. Uma rede que exija relay pago não causa contratação automática; oferece ficheiro. | Apenas se FUT01 for implementado; duas redes/dispositivos reais. |
| AC78 | P2 | Dado o futuro transporte com armazenamento escolhido pelo utilizador, quando este autoriza e depois revoga acesso. | Usa o espaço privado autorizado, sem duplicação obrigatória das tabelas em D1. Explica conta, quotas e eventuais custos do fornecedor; revogação ou quota não bloqueia o modo local/ficheiros. | Apenas se FUT02 for implementado; conta de teste e rede observada. |
| AC79 | P2 | Dado um futuro canal de eventos ativo, quando há alterações remotas, períodos sem mudanças e uma reconexão. | O aviso permite obter diferenças sem manter verificações periódicas em paralelo; a reconexão recupera o que faltou. Mede conexões, mensagens e serviços auxiliares sem afirmar que o transporte elimina quotas. | Apenas se FUT03 for implementado. |
| AC88 | P2 | Dado que a sincronização automática implica custos de chamadas/serviço, quando alguém tenta ativar, ler, enviar, associar ou recuperar dados remotos sem um direito de acesso Ko-fi válido. | O servidor recusa o acesso; abrir o link de apoio ou alterar o armazenamento do navegador não desbloqueia a função. Pagamento válido, repetição do webhook e fim do período são tratados sem duplicar acesso. Expiração/revogação não apaga dados locais nem bloqueia transferência manual gratuita. | Integração de pagamentos de teste e API; apenas na entrega P2. |

| AC89 | P2 | Quando o utilizador alterna entre modo claro e escuro nas Settings e reabre a aplicação. | A preferência é conservada no dispositivo sem alterar os dados da aliança. Tabelas, formulários, diálogos, foco e estados são legíveis e têm contraste adequado nos dois modos. | Automático + visual; apenas quando RF22 for implementado. |

## 10. Correspondência com o plano

| Área do plano | Cenários principais |
| --- | --- |
| RF01/RF11, RN18 — uso local e ausência de teto | AC01, AC58, AC64, AC69 |
| RF02/RF20, identidade, participações e conferência de nomes; RN20–RN22 | AC04–AC06, AC25–AC26, AC81–AC87 |
| RF03–RF06, pontos/semanas/indicadores | AC02–AC03, AC07–AC19, AC27, AC63, AC67–AC68 |
| RF13–RF15, dispensas e destaque | AC20–AC24, AC66 |
| RF07/RN19, ficheiros e backup | AC35–AC37, AC62, AC70–AC72 |
| RF08/RF18, sincronização P2 | AC28, AC30–AC34, AC59–AC61 |
| RF16/RF17, lembretes e calendário | AC39–AC51, AC65, AC76 |
| RF09/RF10, apoio e distribuição | AC52–AC54 |
| RF12, ESC01–ESC06 — preparação no MVP | AC69–AC76, especialmente AC73–AC76 |
| OCR/captura/vídeo futuros | AC55–AC57 |
| FUT01–FUT03 | AC77–AC79 |
| RF19, pesquisa/ordenação | AC80 |
| RF22, modo claro P2 | AC89 |

## 11. Execução e evidência

1. Vitest verifica regras de domínio, datas, médias, validação, ficheiros e conflitos.
2. Playwright verifica os fluxos, duas sessões/contextos, rede observada, agrupamento de pedidos e falhas.
3. Wrangler/D1 locais verificam autorização, isolamento, agendamento e limites de repetição. Usar dados fictícios, relógio controlável e envio simulado; impedir contacto acidental com produção.
4. Dispositivos reais verificam instalação, seleção/gravação de ficheiros, permissões, Web Push com a aplicação fechada e calendário. WebKit emulado não substitui um iPhone.
5. Um piloto percorre a tabela antes do reset, consulta depois, transfere/restaura um ficheiro e confirma os lembretes. A sincronização automática será verificada na entrega P2.

Cada execução regista versão da aplicação, sistema/navegador/cliente de calendário, cenário, resultado e evidência sem dados pessoais reais. Os testes de quota medem também chamadas/CPU/linhas lidas e escritas; não provam uma capacidade infinita de utilizadores.

## 12. Critério de aprovação

Todos os cenários P0 e P1 aplicáveis têm de passar. A sincronização automática passou para P2 e não bloqueia a aprovação do MVP. Nos cenários mistos, é obrigatório o caminho local/ficheiro; a parte remota só se aplica à entrega P2. O MVP não anuncia sincronização automática nem faz chamadas aos seus endpoints.

AC29 está retirado. AC28, AC30–AC32, AC34, AC55–AC57, AC59–AC61, AC74, AC77–AC79, AC88 e AC89 são P2. AC58 permanece P0: uso local sem conta nem envio de tabelas. Preparar a arquitetura e testar AC73, AC75 e AC76 no MVP não obriga a implementar os transportes futuros. Limitações ou hardware indisponível ficam como pendentes; não marcar como aprovado o que não foi demonstrado.
