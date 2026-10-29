# Gestor de alianças Marvel Snap — plano de implementação

Versão consolidada: 29/10/2026. Estado: especificação do produto; versão de testes publicada. Consultar VALIDACAO.md para verificações e pendências.

Este ficheiro define o produto, as decisões técnicas e a sequência de trabalho. TESTES_ACEITACAO.md contém os cenários verificáveis. ARRANQUE_CODEX.md é o pedido para iniciar o desenvolvimento e remete para estas especificações, sem as duplicar.

## 1. Objetivo e decisões fechadas

Ajudar gestores de alianças a preservar a contribuição semanal dos jogadores e avaliar mínimos de forma consistente, mesmo quando os jogadores mudam de nome.

| Tema | Decisão |
| --- | --- |
| Idioma da interface | Inglês nesta versão. Localização para outros idiomas fica para o futuro; datas e horas continuam no formato/fuso do dispositivo. |
| Apresentação | Explicar o que a aplicação faz. Sem destaques da hora do reset no início ou na visão geral. O formulário inicial diz «Set up your dashboard» e a ação é «Start»; regista uma aliança existente no jogo. Ocultar a barra superior antes de iniciar/importar o painel; a ligação de apoio fica no rodapé. Mostrar a navegação após configuração, importação válida ou leitura dos dados locais existentes. |
| Plataforma | PWA instalável e utilizável no navegador. iOS, Android e Windows obrigatórios; macOS desejável. |
| Acesso | Entrada direta, sem conta. Não criar uma conta remota anónima para permitir usar a aplicação. |
| Dados | Persistência no próprio dispositivo. Enviar tabelas para um serviço remoto apenas após ativação explícita de sincronização. |
| Utilizadores | Nenhum teto de utilizadores, licença por pessoa, lista de espera ou validação central de vagas para uso local. |
| Transferência | Exportação/importação completa por ficheiro no MVP, sempre disponível e independente da nuvem. |
| Sincronização | MVP por exportação/importação manual gratuita. Automática em P2; se implicar custos de chamadas/serviço, acesso pago via Ko-fi com validação no servidor. |
| Reset | Terça-feira às 19:00 UTC, fixo e não editável. Converter para a hora e a data locais. |
| Semanas | Identificadas pelo intervalo de datas no formato local; em Portugal: 20/10/26 - 27/10/26. |
| Recolha | Imagens com OCR local: selecionar várias ou colar da área de transferência sem guardar ficheiro. Captura assistida no PC compatível, iniciada pelo gestor. Sem importação em massa por texto. |
| Lembretes | Antecedência configurável, Web Push em dispositivos autorizados e alternativa de calendário. |
| Orçamento | Sem serviços pagos obrigatórios e sem ativação automática de faturação. |
| Internet | Funcionamento totalmente offline fora do âmbito e do roadmap. Persistir dados localmente não significa suportar abertura/uso sem internet. |

Os 80 000 pontos de objetivo e 30 lugares são parâmetros do jogo fornecidos pelo utilizador. A meta e o mínimo individual são configuráveis; o reset é a regra fixa acima.

## 2. Âmbito e prioridades

P0 é essencial. P1 é importante e faz parte do MVP. P2 é uma evolução futura ou funcionalidade condicionada à prova de conceito.

### 2.1. P0 — essencial no MVP

| ID | Requisito |
| --- | --- |
| RF01 | Registar uma aliança já existente no jogo e começar sem conta, com dados persistidos no dispositivo. Uma aliança ativa de cada vez, com mudança e arquivos locais em RF24. |
| RF02 | Registar jogadores com ID interno criado pela aplicação, nome atual, nomes anteriores, contacto social opcional e participações com entrada/saída. Na aba Players, separar o plantel ativo de Former players, mostrando data e motivo da saída. Não depender de um identificador do Marvel Snap. |
| RF03 | Definir mínimo individual e meta da aliança, preservando os valores históricos por semana. |
| RF04 | Ler localmente uma ou várias imagens selecionadas ou coladas da área de transferência, sem exigir ficheiros guardados para colagem. Propor nomes e pontos numa grelha de revisão, conservando as imagens como referência com zoom e deslocamento durante essa sessão. Sem entrada em massa por texto; permitir correções individuais antes de guardar. |
| RF05 | Registar a data/hora de recolha automaticamente quando determinável ou manualmente; conservar separadamente a introdução/importação. |
| RF06 | Consultar todo o histórico. No início, mostrar nome no jogo, contacto social, incumprimentos, média e pontos das últimas oito semanas por defeito. |
| RF07 | Exportar e importar todos os dados estruturados, com pré-visualização e confirmação antes de substituir dados existentes. |
| RF09 | Disponibilizar ligação externa «Support the project» para https://ko-fi.com/tequilasunsett, confirmado pelo criador. |
| RF10 | Publicar em HTTPS e permitir instalar a PWA nos dispositivos alvo. |
| RF11 | Não impor limite de utilizadores no uso local nem bloquear operações locais por quota ou falha dos serviços remotos. |
| RF12 | Preparar a arquitetura do MVP para reduzir chamadas e permitir futuros meios de sincronização, conforme a secção 9. |
| RF20 | Comparar os nomes recolhidos com os jogadores registados, destacar nomes desconhecidos e nomes não encontrados na recolha, e permitir confirmar manualmente uma mudança de nome ou um novo jogador. Nunca alterar associações automaticamente. |
| RF24 | Mudar de aliança nas Settings, escolhendo arquivar ou apagar os dados atuais. Mostrar aviso e exigir confirmação explícita. Criar o novo painel vazio, sem misturar jogadores/semanas. Permitir exportar, restaurar e apagar arquivos locais com proteção de substituição/eliminação. |

### 2.2. P1 — importante no MVP

| ID | Requisito |
| --- | --- |
| RF13 | Selecionar dispensa manual abre sempre um pedido de motivo obrigatório antes da confirmação. |
| RF14 | Dispensar automaticamente a primeira semana de quem entra a meio, com motivo gerado pelo sistema. |
| RF15 | Destacar jogadores com pelo menos dois incumprimentos contabilizados, usando texto além de cor. |
| RF16 | Enviar lembrete antes do reset, com antecedência configurável e autorização por dispositivo. |
| RF17 | Permitir exportar um lembrete de calendário como caminho independente do envio remoto. |
| RF19 | Pesquisar por nome atual, nome antigo ou contacto social e ordenar os indicadores. |
| RF23 | Captura assistida no PC compatível: o gestor autoriza uma janela e percorre a tabela; recolher imagens visíveis com hora automática, terminar a partilha ao parar/sair e enviar as propostas para a mesma revisão local. Nos dispositivos incompatíveis, oferecer imagens/colagem. |

### 2.3. P2 — futuro

| ID | Requisito futuro |
| --- | --- |
| RF08 | Sincronização automática opcional. O protótipo existente fica desativado no MVP. |
| RF18 | Preservar e resolver explicitamente conflitos da sincronização automática. As revisões locais continuam obrigatórias no MVP. |
| RF21 | Se a sincronização automática implicar custos de chamadas/serviço, restringir o acesso pago via Ko-fi, com direito de acesso validado no servidor. O uso local e a transferência manual permanecem gratuitos. |
| RF22 | Permitir alternar entre modo escuro e modo claro nas Settings, guardando a preferência localmente. O modo claro é P2; não faz parte da implementação atual. |

- Importação de vídeos guardados. A seleção/colagem de imagens com OCR local e a captura assistida compatível já pertencem ao MVP.
- Meios de sincronização direta ou com armazenamento escolhido pelo utilizador, descritos na secção 9.
- Várias alianças ativas em simultâneo, gestão partilhada e permissões. A mudança entre uma aliança ativa e arquivos locais já pertence a RF24 no MVP.
- CSV, relatórios, gráficos, taxa de cumprimento e incumprimentos consecutivos.
- Adaptação a outros jogos através de perfis próprios, depois de o fluxo Marvel Snap funcionar.

Fora do âmbito: funcionamento totalmente offline; bots a jogar ou a percorrer o jogo sozinhos; expulsões automáticas; credenciais Marvel Snap; integração real com Discord/X; publicação de tabelas; recuperação de semanas nunca recolhidas; aplicações nativas no MVP.

## 3. Regras de negócio

Estas regras concretizam o comportamento. As escolhas de cálculo e apresentação abaixo são os valores iniciais propostos para implementação.

### 3.1. Identidade e resultados

| ID | Regra |
| --- | --- |
| RN01 | A aplicação cria um UUID interno imutável para cada jogador registado. Este ID só organiza os dados da aplicação; não é obtido do Marvel Snap nem permite reconhecer automaticamente uma conta do jogo. Nome e contacto social são atributos, não chaves de identidade. |
| RN02 | Uma mudança de nome confirmada manualmente conserva o ID interno, contacto, participações e todo o histórico. Guardar o nome anterior e manter o nome observado em cada recolha, sem reescrever os registos antigos. Nomes iguais ou semelhantes não são prova de identidade. |
| RN03 | Existe um resultado lógico por aliança/jogador/semana, com revisões preservadas quando necessário. |
| RN04 | Pontos e mínimos são inteiros não negativos. Zero é válido; ausência de registo é diferente. Mínimo zero desativa incumprimentos nessa semana. |
| RN13 | Registar a saída em Players exige data/hora e motivo preenchido, sem julgar a suficiência do texto. Confirmar move o jogador para Former players, preservando ID, contacto, nomes, resultados e indicadores históricos. Mostrar data e motivo da última saída nessa secção e os motivos de cada participação no perfil. Cancelar ou falhar não muda o plantel. Regressar abre nova participação no mesmo jogador, sem apagar motivos anteriores. Não criar incumprimentos depois da saída; dados desconhecidos nessa semana exigem revisão, sem conversão para zero. Backups antigos sem motivo continuam válidos e mostram «No departure reason recorded»; não inventar motivos. |
| RN15 | Reimportar linhas ou ficheiros não soma pontos nem duplica identidades/resultados. Divergências exigem revisão. |
| RN16 | O histórico semanal pode incluir mais de 30 pessoas diferentes por rotação. Não truncar o histórico ao número de lugares simultâneos do jogo. |
| RN17 | Os indicadores medem contribuição registada, não tempo de jogo, presença diária ou intenção. |
| RN20 | Comparar os nomes da recolha com os nomes atuais e anteriores dos jogadores registados, tendo em conta a participação no momento observado. Destacar «Nome desconhecido» e «Nome não encontrado na lista recolhida» separadamente. Uma diferença pode corresponder a mudança de nome, entrada, saída ou erro de leitura; não confirma nenhuma destas hipóteses. |
| RN21 | O gestor escolhe manualmente associar a linha a um jogador existente, confirmar uma mudança do nome atual, criar um novo jogador ou manter a linha pendente. Nome anterior conhecido e contacto Discord/X são pistas para revisão, sem associação ou alteração automática. Confirmar apresenta o jogador e o histórico que serão mantidos; cancelar não altera os dados. Guardar a decisão e a revisão. |
| RN22 | Numa recolha parcial, indicar «Não observado nesta recolha parcial» para nomes não vistos; não afirmar que deixaram a aliança. Em qualquer recolha, uma ausência ou associação pendente não cria zeros, incumprimentos, saídas ou jogadores automaticamente. Uma linha sem jogador confirmado fica pendente e fora dos indicadores, com os dados recolhidos preservados. |

### 3.2. Semanas e apresentação local

| ID | Regra |
| --- | --- |
| RN05 | Cada semana vai de terça às 19:00 UTC até à terça seguinte às 19:00 UTC, com início incluído e fim excluído. No instante exato do reset começa a semana nova. |
| RN05a | Converter ambos os limites para o fuso do dispositivo e formatar as datas segundo a configuração regional, com dia/mês/ano a dois algarismos. Usar «data de início - data de fim» em cabeçalhos, histórico, seletores e detalhe. Não subtrair um dia ao fim nem mostrar códigos sequenciais de semana. O ID interno não depende do rótulo. |
| RN06 | Cada semana guarda mínimo e meta aplicáveis. Alterações de mínimos ficam concentradas nas Settings; o registo semanal mostra apenas o mínimo aplicável. Alterar o mínimo por defeito só afeta semanas novas. Corrigir o mínimo de uma semana guardada exige seleção explícita dessa semana, motivo e revisão, sem alterar o mínimo por defeito. |
| RN07 | Estados: rascunho e validada. Só semanas validadas e terminadas entram nos indicadores históricos. Não contar a semana corrente antecipadamente. |

Exemplos: UTC+2 vê o reset à terça às 21:00; UTC+5:30 vê quarta às 00:30. A semana com limites UTC 20/10/2026 19:00 e 27/10/2026 19:00 é apresentada em Portugal como 20/10/26 - 27/10/26 e em UTC+5:30 como 21/10/26 - 28/10/26. O fuso Europe/Lisbon respeita horário de verão. [Formatação de datas](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

### 3.3. Mínimos, dispensas e médias

| ID | Regra |
| --- | --- |
| RN08 | É incumprimento um resultado conhecido abaixo do mínimo, numa semana elegível e sem dispensa. Igual ao mínimo cumpre. Sem registo não é zero. |
| RN09 | A primeira semana de uma participação fica dispensada se a entrada ocorrer estritamente depois do início e antes do fim da semana. Entrada no início exato não dispensa. Uma reentrada abre nova participação e conserva o passado. |
| RN10 | Selecionar a dispensa manual pede sempre motivo. Confirmar fica disponível com o campo preenchido e aplica a dispensa sem julgar a validade/suficiência do texto. Cancelar mantém o estado anterior. Guardar motivo, datas e revisões. Os pontos continuam visíveis. A entrada parcial automática usa motivo do sistema e não este diálogo manual. |
| RN11 | Média = soma dos pontos / número de semanas com pontos conhecidos, validadas, terminadas e sem entrada parcial. Dispensa manual elimina a penalização, mas mantém os pontos na média. Sem semanas elegíveis, mostrar «—». |
| RN12 | Contagem e média usam todo o histórico elegível da aliança, mesmo quando só oito colunas estão visíveis. Mostrar o número de semanas avaliadas. |

Uma semana pode ser validada explicitamente como incompleta, avaliando apenas os resultados conhecidos. Conservar «sem registo» e o aviso de incompletude nos restantes.

### 3.4. Conservação e acesso

| ID | Regra |
| --- | --- |
| RN14 | Distinguir momento da recolha de momento de introdução/importação. Guardar origem automática/manual/não indicada e os momentos correspondentes a diferentes recolhas. |
| RN18 | Sem teto de utilizadores para uso local. Nenhuma verificação central de vagas, licença ou quota para abrir, registar, consultar, corrigir ou exportar. Falhas remotas não bloqueiam a aplicação já carregada. |
| RN19 | Transferência por ficheiro é local e completa. Preservar IDs/histórico, validar antes de substituir e não fundir alterações nem ativar ligação remota silenciosamente. |

## 4. Registo dos pontos e momento da recolha

O fluxo de recolha usa imagens, não listas de texto: selecionar várias capturas ou colar imagens diretamente, executar OCR local e rever nomes/pontos antes de guardar. No PC compatível, a captura assistida recolhe imagens enquanto o gestor percorre a tabela. Assumir a disposição única Player / Cube / Bounty / Total e detetar as colunas pela posição, sem seletor de formato. A contribuição é Total; não a calcular a partir das outras colunas quando estiver ilegível. Usar Cube + Bounty apenas para assinalar uma leitura incoerente.

Guardar um rascunho conserva as linhas pendentes, mas estas ainda não são resultados atribuídos. A ação «Validate week» inicia a conferência; abrir/cancelar o diálogo, voltar à revisão ou falhar uma validação não valida a semana. Só a confirmação final guardada com sucesso altera o estado. A revisão atual e a validação são guardadas numa única operação local. Não validar uma semana vazia, mesmo como incompleta; zero registado é válido. Linhas pendentes ou totais divergentes têm de ser resolvidos/excluídos. Destacar campos em falta ou inválidos com texto e contorno, focar e deslocar para o primeiro. Nomes, pontos e associações são conferidos; hora de captura e contacto social opcionais não são erros. Se existirem resultados conhecidos, oferecer «Review incomplete week» para confirmar explicitamente a incompletude. Mostrar sucesso com quantidade guardada e ligação à visão geral. Os totais da semana corrente já validada aparecem na visão geral; médias/incumprimentos continuam a depender do fim da semana.

Notas de revisão e correção de pontos são opcionais. Conservar sempre a revisão anterior e um texto automático quando a nota estiver vazia; não pedir um motivo para voltar a uma validação cancelada. O motivo de dispensa manual e o motivo de correção do mínimo histórico continuam obrigatórios.

O atalho «Find week by date» usa uma data/hora local para selecionar a semana, sem alterar o momento da recolha. Mudar de semana com imagens ou revisão por guardar exige confirmação antes de descartar. Ao criar um jogador durante uma recolha histórica, a data de entrada proposta pertence à semana selecionada e exige conferência pelo gestor; não usar silenciosamente a semana atual. Resultados guardados fora das datas de participação continuam visíveis para correção.

Nomes exatamente repetidos, ignorando maiúsculas e espaços redundantes, aparecem uma vez por recolha. Conservar as observações originais, imagens e momentos associados. Pontos iguais não são somados; valores diferentes ficam sem escolha automática e exigem seleção/correção manual. Uma observação legível pode completar outra ilegível. Nomes apenas semelhantes continuam separados; corrigir manualmente a grafia permite agrupar a repetição. Agrupar observações não cria, funde, associa ou renomeia identidades. As duas semanas são processadas independentemente. Imagens recolhidas e referências abrem numa visualização com zoom, tamanho original, ajuste ao ecrã e deslocamento.

PNG, JPEG e WebP são os formatos iniciais. Até 20 imagens de 20 MB por lote para limitar memória local, sem limitar utilizadores ou histórico; lotes adicionais podem integrar a mesma semana. Se uma imagem não tiver linhas reconhecidas, avisar. Imagem ilegível/formato inválido não altera os dados guardados. As imagens ficam em memória durante o ecrã; o histórico/backup conserva origem, nomes dos ficheiros, momentos e propostas, sem os próprios ficheiros.

### 4.1. Conferência dos nomes

A aplicação trabalha com os nomes visíveis nas listas e os contactos introduzidos pelo gestor. O MVP não dispõe de um identificador do Marvel Snap para reconhecer a pessoa. O UUID interno mantém os registos depois de o gestor confirmar quem é o jogador.

1. Comparar a recolha com os jogadores registados e as participações aplicáveis ao momento observado. Mostrar a lista usada como referência e se a recolha está completa ou parcial. O gestor indica a completude; o número de linhas, por si só, não a prova.
2. Destacar cada nome desconhecido na grelha. Mostrar também os jogadores esperados cujo nome não foi encontrado, com o aviso de recolha parcial quando aplicável. Estes alertas devem ter texto e ser consultáveis na revisão, sem depender só da cor.
3. Para um nome desconhecido, permitir procurar um jogador existente pelo nome atual, nomes anteriores ou contacto social. Mostrar esses dados e o histórico antes da confirmação. Não emparelhar nomes desconhecidos e ausentes por ordem, semelhança, pontos ou contacto.
4. Se o gestor confirmar que é uma mudança de nome, associar os novos pontos ao mesmo ID interno, atualizar o nome atual e guardar o anterior. Não criar outro jogador nem copiar ou apagar o histórico. Na revisão, os alertas dessa associação ficam resolvidos e a decisão fica registada. Esta edição também está disponível no perfil, sem exigir uma nova recolha.
5. Se for uma pessoa nova, criar um novo registo apenas após confirmação. O histórico dos jogadores ausentes fica preservado; uma eventual saída é uma ação manual separada.
6. Permitir adiar a decisão e guardar a recolha como rascunho. Antes de validar, resolver as linhas pendentes ou excluí-las explicitamente da avaliação dessa semana, que fica marcada como incompleta. Não descartar a linha original nem atribuir os seus pontos a outra pessoa sem confirmação.

Um nome anterior reaparecido também exige revisão da associação; não muda o nome atual automaticamente. Importar uma semana antiga não deve substituir o nome atual por um nome antigo. A associação de resultados e a alteração do nome atual são decisões distintas.

O contacto Discord/X é opcional e pode ajudar o gestor a reconhecer a pessoa. Não é tratado como prova de identidade, chave única ou ligação automática à rede social. A aplicação não deteta uma mudança enquanto não existir uma recolha ou edição para comparar.

### 4.2. Captura assistida e leitura local

Não foi encontrada documentação pública oficial de uma API para a tabela da aliança. Não fazer o MVP depender dessa integração. Uma captura só contém as linhas vistas e pode estar incompleta. [Descrição oficial das alianças](https://marvelsnap.com/alliances-a-new-era-of-team-play-in-marvel-snap/)

Na captura assistida, o utilizador escolhe a janela, autoriza e percorre a lista. Recolher imagens a intervalos, omitir imagens exatamente repetidas e conservar o instante de cada imagem. O navegador exige interação/autorização; não prometer início silencioso semanal nem disponibilidade móvel universal. OCR local com Tesseract.js usa motor/modelo alojados com a aplicação, sem serviços de OCR ou APIs pagas. Antes do lançamento, medir precisão por campo, linhas omitidas/duplicadas e tempo de revisão em pelo menos 20 capturas reais representativas. Não anunciar precisão não medida. [Captura de ecrã](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [Tesseract.js](https://github.com/naptha/tesseract.js)

### 4.3. Momento da recolha

Para cada recolha:

- Mostrar data/hora editáveis, apresentadas localmente e conservadas em UTC.
- Preencher automaticamente quando a aplicação consegue determinar o instante efetivo da captura. Não usar a hora de execução do OCR como hora da observação.
- Na importação sem origem temporal fiável, pedir indicação manual. Se desconhecida, mostrar «Data/hora de recolha não indicada», sem inventar uma hora a partir da importação ou modificação do ficheiro.
- Guardar separadamente criação/importação e alterações posteriores. Correções manuais preservam o valor anterior.
- Conservar momentos diferentes e a associação das linhas quando existirem várias capturas; mostrar o intervalo conhecido.
- Exibir no histórico: «Pontos recolhidos em 27/10/2026 às 18:55 — 5 minutos antes do reset».

Pontos recolhidos às 18:55 e introduzidos às 19:10 continuam a representar a observação das 18:55; não incluem automaticamente contribuições posteriores. Uma captura anterior ao reset pode ser introduzida depois e atribuída à semana correta.

Os ficheiros multimédia servem de referência/processamento local e não são enviados nem conservados automaticamente no MVP. O utilizador pode guardar os originais por sua iniciativa.

As leituras originais abrem através de um ícone de informação à direita dos pontos. Mostrar rótulos simples e consistentes como «Image 1» e «Image 2», incluindo referências, origem e visualização. Conservar nomes de ficheiros apenas nos metadados, sem os usar como rótulo principal.

### 4.4. Mudança e arquivo de alianças

Uma aliança ativa de cada vez neste navegador. «Change alliance» nas Settings pede o nome do novo painel, oferece arquivar (por defeito) ou apagar a aliança atual, mostra as consequências e exige uma caixa de confirmação antes da ação final. Cancelar mantém tudo. Uma simples edição do nome da aliança nas definições conserva os seus registos.

Arquivar conserva o conjunto estruturado completo com os mesmos IDs, contactos, semanas, mínimos, dispensas e revisões. O novo painel começa com IDs próprios e sem jogadores/semanas. Cada arquivo pode ser exportado, restaurado ou apagado; restaurar exige escolher arquivar/apagar a aliança atual e confirmar. Apagar um arquivo tem aviso e confirmação próprios. Os ficheiros de backup anteriormente exportados e outros dispositivos não são apagados.

A alteração é atómica: quota, confirmação desatualizada ou alterações de outra aba mantêm os dados originais. Avisar que todas as abas mudam de aliança e que as revisões por guardar devem ser guardadas primeiro; desmontar os formulários/recolhas antigos e recusar gravações de um contexto anterior. Não copiar credenciais nem filas de sincronização entre alianças. Manter os lembretes do dispositivo. Apagar remove também uma cópia de recuperação local que pertença à aliança eliminada; arquivar conserva a recuperação existente. Limpar os dados do navegador elimina os arquivos, pelo que a interface recomenda exportar cópias.

## 5. Transferência e sincronização

### 5.1. Transferência manual — obrigatória no MVP

1. «Export current alliance» gera um JSON versionado com todos os dados estruturados da aliança ativa: aliança, jogadores/IDs/nomes/contactos, participações, semanas/mínimos/metas, pontos, motivos de dispensa, recolhas, linhas pendentes, decisões de associação/mudança de nome, revisões e preferências gerais. Cada arquivo é exportado separadamente no mesmo formato, através de «Export archive».
2. Incluir versão do formato, identificador do conjunto, data/hora da exportação e última alteração conhecida. Não incluir credenciais, sessões, chaves de recuperação ou subscrições de push.
3. O utilizador transfere o ficheiro pelo meio que escolher e seleciona-o no outro dispositivo. A PWA lê e valida localmente, sem upload para o servidor. [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
4. Mostrar pré-visualização com aliança, quantidades e datas. Num destino vazio, recuperar tudo.
5. Com dados existentes, explicar a substituição, oferecer exportação da cópia atual e exigir confirmação. Cancelar, falhar ou selecionar formato inválido não altera dados. A importação é atómica.
6. Não fundir alterações independentes automaticamente. A data de exportação não prova que uma cópia contém todas as alterações da outra. Reimportar não duplica registos.
7. Não ativar sincronização ou notificações por importar. Se já houver ligação remota, suspender envios e confirmar destino/retoma antes de propagar a cópia importada. Autorizações de notificações são próprias de cada dispositivo.
8. Mostrar última exportação/importação e alterações posteriores. Uma cópia importada não é uma ligação permanente.

Este fluxo não utiliza D1 para as tabelas nem a API de sincronização. Alterações posteriores exigem nova transferência ou sincronização automática.

### 5.2. Sincronização automática — P2

Não faz parte da entrega do MVP nem condiciona a sua aprovação. O protótipo fica oculto na interface e os endpoints ficam bloqueados na versão distribuída; apenas uma configuração explícita de desenvolvimento local permite experimentá-lo. A transferência por ficheiro é o caminho entre dispositivos no MVP.

Numa versão P2, permitir ativá-la separadamente. Preferir «Ligar outro dispositivo» por convite temporário QR/código, com confirmação no dispositivo existente. Autenticar dispositivos sem obrigar ao registo de pessoa. Validar expiração, utilização única, limitação de tentativas, isolamento, revogação e recuperação.

O serviço conserva alterações para os dispositivos não terem de estar ativos ao mesmo tempo. Só copiar os dados após ativação explícita. Não copiar sessões entre dispositivos nem usar um código curto como segredo permanente. Avaliar proteção dos dados e gestão de chaves na prova de conceito, sem prometer cifragem de ponta a ponta ainda não demonstrada.

Política inicial para limitar pedidos:

- Primeira ligação: sincronização inicial completa.
- Abrir/retomar: um ciclo para procurar alterações e enviar pendentes; juntar eventos repetidos de foco num intervalo de 30 segundos.
- Editar: guardar imediatamente no dispositivo e enviar as alterações agrupadas depois de 5 segundos sem novas edições. Não fazer um pedido por célula/jogador.
- Enquanto visível: verificação periódica leve até uma vez por minuto, apenas com sincronização ativa; transferir diferenças no mesmo ciclo. Evitar trabalho duplicado em várias abas.
- Em segundo plano/fechada: não manter verificação contínua. Retomar automaticamente quando a aplicação voltar a estar ativa.
- Falha/quota: conservar pendentes, espaçar tentativas com espera crescente e um número limitado de repetições; manter botão «Sincronizar agora» e transferência manual.
- Guardar identificador estável de operação/revisão para repetição idempotente e preservar conflitos; nunca aplicar simplesmente a última escrita apagando a anterior.

A sincronização não tem garantia de execução contínua com a PWA fechada. Num teste controlado com ambas as sessões visíveis, a propagação deve ocorrer no ciclo seguinte, até 75 segundos. O orçamento concreto deve ser medido, incluindo todos os dispositivos da pessoa.

Uma conta convencional só pode ser exigida para este modo se for necessária à solução validada. Recuperação sem conta usa outro dispositivo autorizado ou chave própria; sem ambos, não prometer recuperação por email.

### 5.3. Acesso pago via Ko-fi — P2 condicionado a custos

Se existirem custos de chamadas/serviço da sincronização automática, disponibilizá-la apenas através de acesso pago no Ko-fi do projeto. Preço, modalidade e duração ficam por definir antes dessa entrega; não criar uma oferta ou cobrar agora. Uma contribuição de apoio genérica não prova, por si só, a compra desse acesso.

Verificar o pagamento e o direito de acesso no servidor, incluindo validade e revogação; não desbloquear apenas por abrir o link Ko-fi ou guardar um sinalizador no dispositivo. Proteger leitura, escrita, associação e recuperação do espaço remoto. Expiração do acesso não apaga o histórico local nem impede exportar/importar.

O Ko-fi disponibiliza webhooks de pagamentos, mas não comunica atualmente o fim de uma subscrição. A implementação futura terá de definir validade por período pago e tratamento de cancelamentos/reembolsos antes de anunciar acesso recorrente. [Documentação oficial dos webhooks Ko-fi](https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook). Segredos e dados de pagamento ficam fora do frontend, backups e logs.

O MVP não integra pagamentos nem exige uma conta Ko-fi. O botão de apoio mantém-se independente das funcionalidades gratuitas.

## 6. Lembretes

### 6.1. Web Push no MVP

- Ativar/desativar por dispositivo, sem conta e sem ativar sincronização dos pontos.
- Antecedência padrão proposta: 30 minutos; atalhos 5, 15, 30, 60 e 120; valor personalizado inteiro de 1 a 10 079 minutos.
- Calcular sobre a terça às 19:00 UTC. Mostrar hora local, estado de permissão, próximo envio e botão de teste.
- Pedir autorização mediante ação do utilizador. Guardar remotamente só subscrição, identidade técnica, preferências e estado dos envios; não tabelas de pontos.
- Usar um agendador comum, seleção de envios devidos, lotes limitados e deduplicação por instalação/espaço/aliança/semana/dispositivo.
- Não suprimir por existir rascunho manual. Uma futura recolha automática só suprime se tiver sucesso completo na janela acordada.
- Alterar antecedência/ativação atualiza o agendamento após confirmação remota. Alterações e desativações de um lembrete já registado ficam guardadas como pendentes no dispositivo se o serviço falhar, sobrevivem à reabertura e usam tentativas limitadas com retoma quando a app volta a estar ativa. Atualizar o estado de permissão/subscrição ao regressar à app; não indicar receção ativa com permissão revogada. Uma mudança de fuso só altera a apresentação do mesmo instante UTC.
- Ativar depois da hora prevista e antes do reset oferece «Lembrar agora» e mostra a próxima recorrência.
- Mensagem sem nomes/pontos no ecrã bloqueado; tocar abre o registo da semana relevante sem iniciar captura.
- Repetições não devem criar duplicações visíveis; mensagens antigas expiram até ao reset. Invalidar subscrições revogadas sem afetar as restantes.

Entrega depende de permissões, ligação e sistema operativo. No iPhone, validar a PWA instalada no ecrã principal e a versão compatível; emulação não prova receção real. Não prometer apresentação ao segundo exato. [Web Push iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

### 6.2. Calendário — alternativa sem envios semanais do nosso servidor

Oferecer «Exportar lembrete para calendário» mesmo quando Web Push é suportado. Gerar localmente um ficheiro iCalendar com evento recorrente do reset em UTC e a antecedência escolhida, sem dados de jogadores. A importação e a autorização são ações do utilizador. [iCalendar](https://www.rfc-editor.org/rfc/rfc5545)

Depois de importado num calendário compatível, o alerta é gerido por esse calendário, sem chamadas semanais à nossa API. O cliente pode ignorar/configurar alarmes de outra forma: testar os calendários alvo e pedir que o utilizador confirme o alerta. Alterar definições na PWA não atualiza um ficheiro já importado; explicar substituição/remoção para evitar duplicados. O lembrete fixo do calendário não é cancelado automaticamente por uma recolha bem-sucedida na aplicação.

Não criar uma subscrição remota de calendário para esta alternativa: isso voltaria a gerar pedidos periódicos ao serviço.

## 7. Arquitetura, dados e publicação

### 7.1. Stack definida

| Área | Tecnologia |
| --- | --- |
| Interface | React, TypeScript, Vite, CSS Modules e HTML semântico. |
| PWA | Manifesto, vite-plugin-pwa e service worker para instalação/receção de push. Não desenvolver cache para uso totalmente offline como objetivo. |
| Dados locais | Dexie sobre IndexedDB, com migrações versionadas. |
| Validação e ficheiros | Zod, JSON versionado e File API. |
| Serviços remotos | Cloudflare Workers e D1 para lembretes; Web Push/VAPID. Sincronização automática apenas numa versão P2. |
| Publicação | Cloudflare Static Assets num endereço HTTPS estável. |
| Verificação | Vitest, Playwright e ambiente local Wrangler/D1, com relógio/envio simuláveis. |

A base local conserva o histórico independentemente de conta/serviço. D1 não é necessário para guardar pontos de quem usa apenas o modo local e ficheiros. Alojamento publica o programa, não os dados dos jogadores. [Dexie](https://dexie.org/docs/Tutorial/React), [instalação PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

Servir assets diretamente, sem executar o Worker em todas as aberturas e sem consultar vagas/contador de utilizadores. Escolher uma origem de produção estável: mudar domínio/origem exige planear a transferência dos dados locais. Desenvolvimento pode correr em localhost; entrega pública inclui HTTPS.

### 7.2. Modelo mínimo

| Entidade | Conteúdo |
| --- | --- |
| Espaço local e aliança | IDs, nome/tag, jogo, mínimo por defeito, meta e preferências. |
| Jogador e nomes | UUID criado pela aplicação, nome atual, nomes anteriores e contactos opcionais; sem ID de conta Marvel Snap. |
| Participação | Jogador/aliança, entrada, saída e motivo da saída por participação; permite reentrada. O motivo é opcional no formato para ler backups anteriores, mas obrigatório ao registar novas saídas. |
| Semana | ID estável, limites UTC, mínimo/meta, estado, incompletude e revisão. |
| Recolha | Origem, momento/intervalo observado, indicação automática/manual/desconhecida, momento de introdução, referência de comparação e indicação de lista completa/parcial. |
| Linha recolhida e associação | Nome e pontos observados, recolha, estado pendente/confirmado/excluído da avaliação e jogador interno quando confirmado. Conservar decisões, nomes anteriores e revisões. |
| Resultado | Jogador/semana, pontos ou ausência, nome observado e recolha associada. |
| Dispensa | Jogador/semana, tipo, motivo, datas e revisões. |
| Revisão/operação | Entidade, versão de origem, valores, identificador estável e estado de envio. |
| Transferência | Versão do formato, conjunto, exportação/importação e última alteração conhecida. |
| Ligação remota opcional | Espaço privado, dispositivos, convites, autorização e recuperação. |
| Lembretes remotos | Preferências, subscrições e tentativas/estado, separados das tabelas de pontos. |

### 7.3. Privacidade e conservação

- Não enviar tabelas sem ativação explícita. Lembretes não ativam sincronização.
- Restringir o serviço remoto a dispositivos/espaços autorizados; testar pedidos diretos, não apenas a interface.
- Não pôr segredos de envio no frontend, dados reais no repositório ou nomes/pontos/motivos nos logs.
- Não recorrer a APIs pagas de IA/OCR nem incorporar a API OpenAI no produto.
- Guardar dados localmente de forma durável; informar sobre falha de espaço e disponibilizar exportação. Limpeza do navegador pode eliminar dados. [Armazenamento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Sincronização replica erros/eliminações e não substitui backup.
- Sem requisito de abertura totalmente offline. Falhas temporárias da API não devem apagar dados nem impedir operações locais numa aplicação já carregada.

## 8. Ecrãs

| Ecrã | Conteúdo e ações |
| --- | --- |
| Início | Meta, jogadores que precisam de atenção, estado dos dados locais, tabela pedida, «Record scores» e apoio ao projeto. Sem cartão de destaque da hora do reset. |
| Registo semanal | Escolher intervalo local, selecionar/colar imagens ou capturar a janela compatível, ler localmente e rever a grelha com imagens de referência. Indicar momentos/completude; destacar nomes desconhecidos e não encontrados. Permitir associação manual, mudança de nome, criação confirmada ou adiamento. Validar apenas depois da revisão. Dispensa abre o pedido de motivo. |
| Histórico | Semanas por intervalo local; pontos, mínimos, motivos, recolhas, incompletude e revisões. |
| Jogador | Nome atual/anteriores, contacto, participações, resultados e dispensas. Editar o nome manualmente com confirmação, mantendo o histórico. |
| Definições | Mínimo/meta, reset só para consulta, lembretes/calendário, exportar/importar, última transferência. Ligação automática de dispositivos apenas em P2. |

No telemóvel, deslocação horizontal dentro da tabela e detalhe por jogador. Manter ações utilizáveis a 360 px, por toque e teclado. Distinguir zero, sem registo, parcial, dispensado, rascunho e conflito sem depender só de cor.

## 9. Redução de chamadas e evolução sem custos obrigatórios

Esta secção é parte do MVP como preparação arquitetural e contrato de comportamento. Os futuros transportes não têm de ser implementados agora.

### 9.1. Obrigações já no MVP

| ID | Obrigação |
| --- | --- |
| ESC01 | Separar domínio/base local, formato de transferência e transporte de sincronização. Criar um contrato pequeno para versões/operações, envio/receção e conflitos, sem construir uma plataforma genérica de plugins. |
| ESC02 | Partilhar IDs, revisões e validação entre ficheiros e serviço remoto. Adicionar outro transporte não exige migrar os dados do utilizador nem reescrever cálculos/interface. |
| ESC03 | No MVP, limitar e espaçar tentativas dos lembretes, sem pedidos de sincronização de pontos. A política de lotes/diferenças/foco da secção 5.2 aplica-se à futura sincronização P2. |
| ESC04 | Medir chamadas, CPU, linhas lidas/escritas e pico de lembretes sem recolher dados pessoais. Quota remota esgotada mantém local/ficheiro disponíveis e não causa uma tempestade de repetições. |
| ESC05 | Gerar o lembrete de calendário local da secção 6.2. Não depender de envio remoto semanal para esta alternativa. |
| ESC06 | Não impor limite de utilizadores no produto nem mudar para plano pago automaticamente. Não apresentar estimativas de capacidade como garantias. |

Os pedidos a assets são gratuitos e ilimitados quando servidos diretamente. Serviços remotos têm quotas partilhadas. Referência consultada em 27/10/2026: Workers Free, 100 000 pedidos/dia e 10 ms de CPU por execução; D1, 5 milhões de linhas lidas/dia, 100 000 escritas/dia, 500 MB por base e 5 GB totais. Reconfirmar ao implementar. Não criar uma base ou um agendamento por utilizador. [Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Workers](https://developers.cloudflare.com/workers/platform/limits/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [limites D1](https://developers.cloudflare.com/d1/platform/limits/)

Não é possível garantir sincronização assíncrona e push gratuitos a qualquer escala num serviço central. A estratégia é diminuir consumo e permitir caminhos que não dependam dele, mantendo os requisitos locais.

### 9.2. Evoluções previstas

| ID | Evolução | Condições e limites |
| --- | --- | --- |
| FUT01 | Sincronização direta por WebRTC DataChannel entre dispositivos autorizados. | Ambos ativos/em comunicação. A descoberta pode usar sinalização leve; transferir os dados diretamente evita pedidos ao nosso backend por cada alteração. Algumas redes exigem TURN/relay, que pode ter custo. Se não existir caminho direto sem serviço pago, oferecer ficheiro e não prometer conexão universal gratuita. |
| FUT02 | Armazenamento privado escolhido pelo utilizador, por exemplo uma pasta de dados da aplicação na sua conta de nuvem. | Pode retirar o histórico de D1 e suportar dispositivos não simultâneos. Exige autorização/conta do fornecedor e tem quotas próprias, inclusive por projeto; não elimina limites nem garante custo zero permanente. Só implementar após confirmar condições e consentimento. |
| FUT03 | Receção orientada por eventos, em vez de verificação periódica. | Avaliar WebSocket/outro canal enquanto a app está ativa. Pode reduzir verificações vazias, mas conexões, coordenação e serviços auxiliares continuam a ter limites. Não depende de manter a PWA fechada a executar. |

WebRTC precisa de negociação e pode usar STUN/TURN; não confundir ligação direta com garantia de ausência de infraestrutura. [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols), [DataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)

A API Drive é um exemplo possível para FUT02, não um fornecedor já integrado. Os dados específicos da aplicação podem ficar numa pasta própria; existem quotas e regras de cobrança que precisam de nova validação quando se implementar. [Pasta de dados](https://developers.google.com/workspace/drive/api/guides/appdata), [quotas Drive](https://developers.google.com/workspace/drive/api/guides/limits)

Os trabalhos FUT01–FUT03 são futuros e não autorizam introduzir custos ou fornecedores obrigatórios no MVP. Exportação/importação e calendário já oferecem os caminhos sem chamadas às nossas APIs correspondentes.

## 10. Entregas e validação

| Etapa | Entrega | Evidência necessária |
| --- | --- | --- |
| 0 | Provas dos riscos na PWA escolhida: persistência, imagens/OCR local, captura assistida, ficheiros e Web Push/calendário. Ligação/conflitos remotos são P2. | Observações reais e consumo medido. Teste de hardware indisponível permanece pendente. Não trocar a plataforma ou inventar acesso ao jogo. |
| 1 | Identidade, semanas, mínimos e cálculos. | Limites do reset, datas locais, médias, dispensas e ausência de dados corretos. |
| 2 | Seleção/colagem de imagens, OCR local e captura assistida compatível, conferência de nomes, tabela inicial e histórico. | Uma semana pode ser recolhida/revista/consultada e corrigida; mudanças de nome manuais conservam o histórico e ausências não criam saídas ou zeros. |
| 3 | Transferência manual e conservação. | Novo dispositivo recupera tudo sem conta/API de pontos; importação inválida/repetida/cancelada é segura. |
| 4 | Preparação ESC01–ESC04 e recuperação de falhas dos lembretes. | Formato/IDs preservados e consumo medido. A sincronização automática e os seus conflitos são P2 e não bloqueiam o MVP. |
| 5 | Lembretes e calendário ESC05. | Receção com a app fechada em dispositivos autorizados e ficheiro de calendário validado nos clientes alvo. |
| 6 | Publicação HTTPS e piloto de uma semana real. | Casos P0/P1 aprovados, um reset observado, backup restaurado e verificação de privacidade/acessibilidade. |

O MVP está concluído quando cumpre os requisitos P0/P1 e testes aplicáveis, com recolha por imagens e transferência manual completa. OCR local e captura assistida compatível fazem parte destes critérios; precisão com capturas reais e compatibilidade têm de ser verificadas. A sincronização automática, importação de vídeo e FUT01–FUT03 são P2. A implementação e os testes estão descritos em VALIDACAO.md. A versão de testes foi publicada em https://snap-alliance-manager.snap-alliance-manager.workers.dev. Credenciais de produção para Web Push ainda aguardam autorização; exportação de calendário disponível.

O URL de apoio já foi confirmado: https://ko-fi.com/tequilasunsett. Quatro capturas reais de duas semanas foram verificadas localmente com a coluna Total. Continuam pendentes o corpus mais alargado e a validação nos dispositivos/calendários alvo.

## 11. Trabalho com o Codex

- Usar este plano como fonte de comportamento e TESTES_ACEITACAO.md como critérios; não acrescentar histórico de conversa ou comparações aos documentos.
- Manter instruções curtas em AGENTS.md com privacidade, orçamento, estrutura e comandos reais de verificação.
- Versionar o código no repositório público https://github.com/miguelvGIT/snap-alliance-manager, conforme autorizado pelo utilizador em 29/10/2026. Nunca guardar dados reais, backups ou segredos; os dados das alianças continuam locais e privados.
- Usar Playwright para fluxos e Wrangler/D1 para serviços locais; impedir testes de contactar produção. Testes de instalação/push/calendário exigem dispositivos/clientes reais.
- Consultar a documentação atual das ferramentas durante a implementação. Skills próprias só quando houver um fluxo repetitivo que as justifique.
