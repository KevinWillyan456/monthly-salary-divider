import { Chart, registerables } from 'chart.js'
import { createIcons, icons } from 'lucide'

createIcons({ icons })

document.addEventListener('DOMContentLoaded', () => {
  // Seleção de elementos
  const saldoTotalEl = document.getElementById(
    'saldo-total'
  ) as HTMLParagraphElement
  const saldoInicialInput = document.getElementById(
    'saldo-inicial'
  ) as HTMLInputElement
  const definirSaldoBtn = document.getElementById(
    'definir-saldo'
  ) as HTMLButtonElement
  const alertaSaldoEl = document.getElementById(
    'alerta-saldo'
  ) as HTMLDivElement
  const listaGastosEl = document.getElementById(
    'lista-gastos'
  ) as HTMLDivElement
  const valorGastoInput = document.getElementById(
    'valor-gasto'
  ) as HTMLInputElement
  const adicionarGastoBtn = document.getElementById(
    'adicionar-gasto'
  ) as HTMLButtonElement
  const resumoDetalhesEl = document.getElementById(
    'resumo-detalhes'
  ) as HTMLDivElement
  const resetBtn = document.getElementById('resetar-tudo') as HTMLButtonElement
  const anoAtualEl = document.getElementById('ano-atual') as HTMLSpanElement

  // Variáveis globais
  let saldo: number = parseFloat(localStorage.getItem('saldo') || '0')
  let gastos: { nome: string; descricao: string; valor: number }[] = JSON.parse(
    localStorage.getItem('gastos') || '[]'
  )
  let saldoInicial: number = parseFloat(
    localStorage.getItem('saldoInicial') || saldo.toString() || '0'
  )
  let chartInstance: any = null

  // Funções utilitárias
  const atualizarSaldo = (): void => {
    saldoTotalEl.textContent = `R$ ${saldo.toFixed(2)}`
    localStorage.setItem('saldo', saldo.toString())
  }

  const atualizarResumo = (): void => {
    const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.valor, 0)
    resumoDetalhesEl.innerHTML = `
      <p class="text-lg font-semibold">Saldo inicial: <span class="text-blue-600">R$ ${saldoInicial.toFixed(2)}</span></p>
      <p class="text-lg font-semibold">Total disponível: <span class="text-green-600">R$ ${saldo.toFixed(2)}</span></p>
      <p class="text-lg font-semibold">Total gasto: <span class="text-red-600">R$ ${totalGastos.toFixed(2)}</span></p>
    `
    alertaSaldoEl.classList.toggle('hidden', saldo >= 0)
  }

  const abrirModal = (conteudo: string): HTMLDivElement => {
    // Fecha qualquer modal já aberto
    document.querySelectorAll('.modal-unico').forEach((el) => el.remove())

    const modal = document.createElement('div')
    modal.classList.add(
      'fixed',
      'top-0',
      'left-0',
      'w-full',
      'h-full',
      'bg-black/50',
      'flex',
      'justify-center',
      'items-center',
      'z-50',
      'modal-unico'
    )
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md text-center">
        ${conteudo}
        <button class="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 fechar-modal">Fechar</button>
      </div>
    `
    document.body.appendChild(modal)

    // Fechar ao clicar nos botões de fechar
    modal.querySelectorAll('.fechar-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.remove()
        document.removeEventListener('keydown', escListener)
      })
    })

    // Fechar ao pressionar ESC
    const escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove()
        document.removeEventListener('keydown', escListener)
      }
    }
    document.addEventListener('keydown', escListener)

    return modal
  }

  // Função utilitária para abrir modal de alerta/erro
  const abrirModalAlerta = (
    mensagem: string,
    focoInput?: HTMLElement
  ): void => {
    const modal = abrirModal(`
      <div>
        <p class="text-lg text-red-600 font-semibold">${mensagem}</p>
        <button class="mt-6 fechar-modal bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800">OK</button>
      </div>
    `)
    // Ao fechar o modal, foca no input se fornecido
    modal.querySelector('.fechar-modal')?.addEventListener('click', () => {
      if (focoInput) focoInput.focus()
    })
    // Também ao fechar com ESC
    const escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focoInput) {
        setTimeout(() => focoInput.focus(), 0)
      }
    }
    document.addEventListener('keydown', escListener, { once: true })
  }

  // Adiciona campo de pesquisa acima da lista de gastos
  let termoPesquisa = ''
  const criarCampoPesquisa = () => {
    let campo = document.getElementById(
      'campo-pesquisa-gasto'
    ) as HTMLInputElement
    if (!campo) {
      campo = document.createElement('input')
      campo.type = 'text'
      campo.id = 'campo-pesquisa-gasto'
      campo.placeholder = 'Pesquisar gastos...'
      campo.className = 'w-full mb-2 rounded border border-gray-300 p-2'
      campo.addEventListener('input', () => {
        termoPesquisa = campo.value.toLowerCase()
        renderizarGastos()
      })
      listaGastosEl.parentElement?.insertBefore(campo, listaGastosEl)
    }
  }

  // Renderização de gastos
  const renderizarGastos = (): void => {
    criarCampoPesquisa()
    listaGastosEl.innerHTML = ''

    // Filtra gastos pelo termo de pesquisa
    const gastosFiltrados = termoPesquisa
      ? gastos.filter(
          (g) =>
            g.nome.toLowerCase().includes(termoPesquisa) ||
            (g.descricao && g.descricao.toLowerCase().includes(termoPesquisa))
        )
      : gastos

    // Exibe contador de gastos
    let contador = document.getElementById('contador-gastos')
    if (!contador) {
      contador = document.createElement('div')
      contador.id = 'contador-gastos'
      contador.className = 'text-sm text-gray-500 mb-2'
      listaGastosEl.parentElement?.insertBefore(contador, listaGastosEl)
    }
    contador.textContent = `Gastos adicionados: ${gastos.length} ${termoPesquisa ? `(exibindo ${gastosFiltrados.length})` : ''}`

    gastosFiltrados.forEach((gasto, index) => {
      // Corrige o índice real para ações (remover/editar/mover)
      const realIndex = termoPesquisa
        ? gastos.findIndex(
            (g) =>
              g.nome === gasto.nome &&
              g.descricao === gasto.descricao &&
              g.valor === gasto.valor
          )
        : index

      const gastoEl = document.createElement('div')
      gastoEl.classList.add(
        'flex',
        'justify-between',
        'items-center',
        'bg-gray-50',
        'p-3',
        'rounded-lg',
        'shadow-sm',
        'border',
        'border-gray-200',
        'transition-all',
        'hover:shadow-md',
        'hover:bg-purple-50',
        'gap-2',
        'animate-fadein'
      )

      // Dropdown para mobile
      const dropdownId = `dropdown-gasto-${realIndex}`
      gastoEl.innerHTML = `
        <div class="flex flex-col min-w-0 flex-1">
          <span class="font-bold text-gray-900 truncate">${gasto.nome}</span>
          ${gasto.descricao ? `<span class="text-gray-500 text-sm truncate">${gasto.descricao}</span>` : ''}
          <span class="text-green-700 font-bold text-lg mt-1">R$ ${gasto.valor.toFixed(2)}</span>
        </div>
        <div class="hidden xs:flex flex-row flex-wrap gap-1 sm:gap-2">
          <button class="bg-gray-200 text-gray-700 px-1.5 py-1 text-xs sm:px-2 sm:py-1 sm:text-base rounded hover:bg-gray-300 border border-gray-300 disabled:opacity-40" onclick="window.moverGastoCima(${realIndex})" ${realIndex === 0 ? 'disabled' : ''} title="Mover para cima"><i data-lucide="arrow-up"></i></button>
          <button class="bg-gray-200 text-gray-700 px-1.5 py-1 text-xs sm:px-2 sm:py-1 sm:text-base rounded hover:bg-gray-300 border border-gray-300 disabled:opacity-40" onclick="window.moverGastoBaixo(${realIndex})" ${realIndex === gastos.length - 1 ? 'disabled' : ''} title="Mover para baixo"><i data-lucide="arrow-down"></i></button>
          <button class="bg-blue-500 text-white px-1.5 py-1 text-xs sm:px-2 sm:py-1 sm:text-base rounded hover:bg-blue-600 border border-blue-600 flex items-center gap-1" onclick="window.editarGasto(${realIndex})"><i data-lucide="pencil"></i> <span class="hidden sm:inline">Editar</span></button>
          <button class="bg-red-500 text-white px-1.5 py-1 text-xs sm:px-2 sm:py-1 sm:text-base rounded hover:bg-red-600 border border-red-600 flex items-center gap-1" onclick="window.removerGasto(${realIndex})"><i data-lucide="trash-2"></i> <span class="hidden sm:inline">Excluir</span></button>
        </div>
        <div class="xs:hidden relative">
          <button class="bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 flex items-center gap-1" onclick="window.toggleDropdown('${dropdownId}')">
            <i data-lucide="more-vertical"></i>
          </button>
          <div id="${dropdownId}" class="hidden absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded shadow-md min-w-[140px]">
            <button class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 disabled:opacity-40" onclick="window.moverGastoCima(${realIndex})" ${realIndex === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i> Mover para cima</button>
            <button class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 disabled:opacity-40" onclick="window.moverGastoBaixo(${realIndex})" ${realIndex === gastos.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down"></i> Mover para baixo</button>
            <button class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 text-blue-700" onclick="window.editarGasto(${realIndex})"><i data-lucide="pencil"></i> Editar</button>
            <button class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50 text-red-700" onclick="window.removerGasto(${realIndex})"><i data-lucide="trash-2"></i> Excluir</button>
          </div>
        </div>
      `
      listaGastosEl.appendChild(gastoEl)
      // Adiciona separador visual entre itens, exceto o último
      if (index < gastosFiltrados.length - 1) {
        const divider = document.createElement('div')
        divider.className = 'h-px bg-gray-200 my-2 w-full'
        listaGastosEl.appendChild(divider)
      }
    })
    localStorage.setItem('gastos', JSON.stringify(gastos))
    createIcons({ icons }) // Atualiza ícones após renderização
    renderizarGraficoGastos()
  }

  // Dropdown handler para mobile
  ;(window as any).toggleDropdown = (id: string) => {
    // Fecha todos os outros dropdowns
    document.querySelectorAll('[id^="dropdown-gasto-"]').forEach((el) => {
      if (el.id !== id) el.classList.add('hidden')
    })
    const el = document.getElementById(id)
    if (el) el.classList.toggle('hidden')
    // Fecha ao clicar fora
    const close = (e: MouseEvent) => {
      if (el && !el.contains(e.target as Node)) {
        el.classList.add('hidden')
        document.removeEventListener('mousedown', close)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', close), 0)
  }

  // Função para ativar/desativar a seção de gastos
  const atualizarSecaoGastos = (): void => {
    const secaoGastos = document.getElementById('gastos') as HTMLDivElement
    // Atualize para pegar os novos campos de input
    const inputs = secaoGastos.querySelectorAll('input, button')
    const mensagemDemoId = 'mensagem-demo-gasto'

    if (saldoInicial <= 0) {
      // Desativa inputs e botão
      inputs.forEach((el) => {
        ;(el as HTMLInputElement | HTMLButtonElement).disabled = true
        el.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed')
      })
      // Adiciona mensagem demonstrativa se não existir
      if (!document.getElementById(mensagemDemoId)) {
        const msg = document.createElement('div')
        msg.id = mensagemDemoId
        msg.className = 'text-center text-gray-500 py-4'
        msg.innerHTML =
          'Defina o saldo inicial para adicionar e gerenciar seus gastos.'
        secaoGastos.insertBefore(msg, secaoGastos.firstChild)
      }
    } else {
      // Ativa inputs e botão
      inputs.forEach((el) => {
        ;(el as HTMLInputElement | HTMLButtonElement).disabled = false
        el.classList.remove(
          'bg-gray-100',
          'text-gray-400',
          'cursor-not-allowed'
        )
      })
      // Remove mensagem demonstrativa se existir
      const msg = document.getElementById(mensagemDemoId)
      if (msg) msg.remove()
    }
  }

  const atualizarBotaoSaldo = (): void => {
    if (saldoInicial > 0) {
      definirSaldoBtn.innerHTML = `<i data-lucide="rotate-ccw"></i> Resetar Tudo`
      definirSaldoBtn.classList.remove('bg-purple-700', 'hover:bg-purple-800')
      definirSaldoBtn.classList.add('bg-red-600', 'hover:bg-red-700')
      definirSaldoBtn.onclick = resetarTudo
      saldoInicialInput.disabled = true
      saldoInicialInput.classList.add(
        'bg-gray-100',
        'text-gray-400',
        'cursor-not-allowed'
      )
      createIcons({ icons })
    } else {
      definirSaldoBtn.innerHTML = `<i data-lucide="check"></i> Definir Saldo`
      definirSaldoBtn.classList.remove('bg-red-600', 'hover:bg-red-700')
      definirSaldoBtn.classList.add('bg-purple-700', 'hover:bg-purple-800')
      definirSaldoBtn.onclick = definirSaldo
      saldoInicialInput.disabled = false
      saldoInicialInput.classList.remove(
        'bg-gray-100',
        'text-gray-400',
        'cursor-not-allowed'
      )
      createIcons({ icons })
    }
    atualizarSecaoGastos()
  }

  // Funções de ações
  const resetarTudo = (): void => {
    const modal = abrirModal(`
      <h3>Resetar Tudo</h3>
      <p>Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.</p>
      <button id="confirmar-reset" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Sim</button>
      <button class="fechar-modal bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Não</button>
    `)

    modal.querySelector('#confirmar-reset')?.addEventListener('click', () => {
      saldo = 0
      saldoInicial = 0
      gastos = []
      localStorage.removeItem('saldo')
      localStorage.removeItem('gastos')
      localStorage.removeItem('saldoInicial')
      renderizarGastos()
      atualizarSaldo()
      atualizarResumo()
      modal.remove()
      atualizarBotaoSaldo()
    })
  }

  const definirSaldo = (): void => {
    const novoSaldo = parseFloat(saldoInicialInput.value) || 0
    if (novoSaldo > 0) {
      const modal = abrirModal(`
        <h3>Confirmar Saldo</h3>
        <p>Você deseja definir o saldo inicial como R$ ${novoSaldo.toFixed(2)}?</p>
        <button id="confirmar-saldo" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Sim</button>
        <button class="fechar-modal bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Não</button>
      `)

      modal.querySelector('#confirmar-saldo')?.addEventListener('click', () => {
        saldo = novoSaldo
        saldoInicial = novoSaldo
        saldoInicialInput.value = ''
        localStorage.setItem('saldoInicial', saldoInicial.toString())
        atualizarSaldo()
        atualizarResumo()
        modal.remove()
        atualizarBotaoSaldo()
      })
    } else {
      alert('O saldo deve ser maior que 0.')
    }
  }

  const adicionarGasto = (): void => {
    const nomeInput = document.getElementById('nome-gasto') as HTMLInputElement
    const descricaoInput = document.getElementById(
      'descricao-gasto'
    ) as HTMLInputElement
    const nome = nomeInput.value.trim()
    const descricao = descricaoInput.value.trim()
    const valor = parseFloat(valorGastoInput.value.replace(',', '.')) || 0

    valorGastoInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300')
    nomeInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300')

    if (!nome) {
      nomeInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
      abrirModalAlerta('O nome do gasto é obrigatório.', nomeInput)
      return
    }
    if (!valorGastoInput.value || isNaN(valor) || valor <= 0) {
      valorGastoInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
      abrirModalAlerta(
        'Digite um valor válido maior que zero para o gasto.',
        valorGastoInput
      )
      return
    }
    // Permitir saldo zero, só impedir negativo
    if (saldo - valor < 0) {
      valorGastoInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
      abrirModalAlerta(
        'Saldo insuficiente para adicionar este gasto.',
        valorGastoInput
      )
      return
    }

    gastos.push({ nome, descricao, valor })
    saldo -= valor
    nomeInput.value = ''
    descricaoInput.value = ''
    valorGastoInput.value = ''
    renderizarGastos()
    atualizarSaldo()
    atualizarResumo()
  }

  // Função para renderizar o gráfico de gastos
  const renderizarGraficoGastos = () => {
    const container = document.getElementById('grafico-gastos-container')
    const placeholder = document.getElementById('grafico-gastos-placeholder')
    const secaoGrafico = document.getElementById('grafico-gastos')
    if (!container || !secaoGrafico) return

    // Limpa o container e placeholder
    container.innerHTML = ''
    if (placeholder) placeholder.classList.add('hidden')

    // Esconde a seção se não houver saldo inicial ou não houver gastos
    if (saldoInicial <= 0 || !gastos.length) {
      secaoGrafico.style.display = 'none'
      if (placeholder && saldoInicial <= 0)
        placeholder.classList.remove('hidden')
      return
    } else {
      secaoGrafico.style.display = ''
    }

    Chart.register(...registerables)

    const canvas = document.createElement('canvas')
    canvas.id = 'grafico-gastos-canvas'
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    container.appendChild(canvas)

    // Destroi instância anterior se existir
    if (chartInstance) {
      chartInstance.destroy()
    }

    // Dados do gráfico
    const labels = gastos.map((g) => g.nome)
    const data = gastos.map((g) => g.valor)
    const backgroundColors = [
      '#a78bfa',
      '#f472b6',
      '#60a5fa',
      '#fbbf24',
      '#34d399',
      '#f87171',
      '#facc15',
      '#38bdf8',
      '#c084fc',
      '#fb7185'
    ]
    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map(
              (_, i) => backgroundColors[i % backgroundColors.length]
            ),
            borderWidth: 1
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Comparativo de Gastos'
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    })
  }

  ;(window as any).removerGasto = (index: number): void => {
    const modal = abrirModal(`
      <h3>Confirmar Exclusão</h3>
      <p>Tem certeza que deseja excluir o gasto "<span class="font-bold">${gastos[index].nome}</span>"?</p>
      <div class="mt-4 flex justify-center space-x-4">
        <button id="confirmar-exclusao" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Sim</button>
        <button class="fechar-modal bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Não</button>
      </div>
    `)

    modal
      .querySelector('#confirmar-exclusao')
      ?.addEventListener('click', () => {
        saldo += gastos[index].valor
        gastos.splice(index, 1)
        renderizarGastos()
        atualizarSaldo()
        atualizarResumo()
        modal.remove()
      })
  }
  ;(window as any).editarGasto = (index: number): void => {
    const modal = abrirModal(`
      <h3>Editar Gasto</h3>
      <div class="mt-4 space-y-4">
        <div>
          <label for="nome-editar" class="block text-left font-medium">Nome:</label>
          <input type="text" id="nome-editar" value="${gastos[index].nome}" class="w-full p-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label for="descricao-editar" class="block text-left font-medium">Descrição (opcional):</label>
          <input type="text" id="descricao-editar" value="${gastos[index].descricao || ''}" class="w-full p-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label for="valor-editar" class="block text-left font-medium">Valor:</label>
          <input type="number" id="valor-editar" value="${gastos[index].valor}" min="0.01" step="0.01" class="w-full p-2 border border-gray-300 rounded" />
        </div>
        <button id="confirmar-edicao" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Salvar</button>
      </div>
    `)

    modal.querySelector('#confirmar-edicao')?.addEventListener('click', () => {
      const nomeInput = modal.querySelector('#nome-editar') as HTMLInputElement
      const descricaoInput = modal.querySelector(
        '#descricao-editar'
      ) as HTMLInputElement
      const valorInput = modal.querySelector(
        '#valor-editar'
      ) as HTMLInputElement

      nomeInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300')
      valorInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300')

      const novoNome = nomeInput.value.trim()
      const novaDescricao = descricaoInput.value.trim()
      const novoValor = parseFloat(valorInput.value.replace(',', '.'))

      if (!novoNome) {
        nomeInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
        abrirModalAlerta('O nome do gasto é obrigatório.', nomeInput)
        return
      }
      if (!novoValor || isNaN(novoValor) || novoValor <= 0) {
        valorInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
        abrirModalAlerta(
          'Digite um valor válido maior que zero para o gasto.',
          valorInput
        )
        return
      }
      // Permitir saldo zero, só impedir negativo
      const diferenca = novoValor - gastos[index].valor
      if (saldo - diferenca < 0) {
        valorInput.classList.add('border-red-500', 'ring-2', 'ring-red-300')
        abrirModalAlerta(
          'O valor editado não pode deixar o saldo negativo.',
          valorInput
        )
        return
      }
      saldo -= diferenca
      gastos[index] = {
        nome: novoNome,
        descricao: novaDescricao,
        valor: novoValor
      }
      renderizarGastos()
      atualizarSaldo()
      atualizarResumo()
      modal.remove()
    })
  }
  ;(window as any).moverGastoCima = (index: number): void => {
    if (index > 0) {
      const temp = gastos[index]
      gastos[index] = gastos[index - 1]
      gastos[index - 1] = temp
      renderizarGastos()
      atualizarResumo()
    }
  }
  ;(window as any).moverGastoBaixo = (index: number): void => {
    if (index < gastos.length - 1) {
      const temp = gastos[index]
      gastos[index] = gastos[index + 1]
      gastos[index + 1] = temp
      renderizarGastos()
      atualizarResumo()
    }
  }

  // Inicialização
  anoAtualEl.textContent = new Date().getFullYear().toString()
  resetBtn.addEventListener('click', resetarTudo)
  definirSaldoBtn.onclick = definirSaldo
  adicionarGastoBtn.addEventListener('click', adicionarGasto)

  // Melhorias no input valor do gasto
  valorGastoInput.type = 'number'
  valorGastoInput.min = '0.01'
  valorGastoInput.step = '0.01'
  valorGastoInput.inputMode = 'decimal'
  valorGastoInput.pattern = '[0-9]+([\\.,][0-9]{1,2})?'
  valorGastoInput.placeholder = 'Valor do gasto (ex: 100,00)'
  valorGastoInput.addEventListener('input', () => {
    valorGastoInput.value = valorGastoInput.value.replace(/[^0-9.,]/g, '')
    valorGastoInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300')
  })

  atualizarSaldo()
  atualizarResumo()
  atualizarBotaoSaldo()
  atualizarSecaoGastos()
  renderizarGastos()
  renderizarGraficoGastos()
})
