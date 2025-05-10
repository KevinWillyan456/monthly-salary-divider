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
  const novoGastoInput = document.getElementById(
    'novo-gasto'
  ) as HTMLInputElement
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
  let gastos: { descricao: string; valor: number }[] = JSON.parse(
    localStorage.getItem('gastos') || '[]'
  )

  // Funções utilitárias
  const atualizarSaldo = (): void => {
    saldoTotalEl.textContent = `R$ ${saldo.toFixed(2)}`
    localStorage.setItem('saldo', saldo.toString())
  }

  const atualizarResumo = (): void => {
    const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.valor, 0)
    resumoDetalhesEl.innerHTML = `
      <p class="text-lg font-semibold">Total disponível: <span class="text-green-600">R$ ${saldo.toFixed(2)}</span></p>
      <p class="text-lg font-semibold">Total gasto: <span class="text-red-600">R$ ${totalGastos.toFixed(2)}</span></p>
    `
    alertaSaldoEl.classList.toggle('hidden', saldo >= 0)
  }

  const abrirModal = (conteudo: string): HTMLDivElement => {
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
      'z-50'
    )
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md text-center">
        ${conteudo}
        <button class="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 fechar-modal">Fechar</button>
      </div>
    `
    document.body.appendChild(modal)

    modal.querySelectorAll('.fechar-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.remove()
      })
    })

    return modal
  }

  // Renderização de gastos
  const renderizarGastos = (): void => {
    listaGastosEl.innerHTML = ''
    gastos.forEach((gasto, index) => {
      const gastoEl = document.createElement('div')
      gastoEl.classList.add(
        'flex',
        'justify-between',
        'items-center',
        'bg-gray-100',
        'p-2',
        'rounded',
        'shadow'
      )
      gastoEl.innerHTML = `
        <p class="font-medium">${gasto.descricao} - <span class="text-green-600 font-bold">R$ ${gasto.valor.toFixed(2)}</span></p>
        <div class="flex space-x-2">
          <button class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" onclick="window.editarGasto(${index})"><i data-lucide="pencil"></i> Editar</button>
          <button class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" onclick="window.removerGasto(${index})">Excluir</button>
        </div>
      `
      listaGastosEl.appendChild(gastoEl)
    })
    localStorage.setItem('gastos', JSON.stringify(gastos))
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
      gastos = []
      localStorage.removeItem('saldo')
      localStorage.removeItem('gastos')
      renderizarGastos()
      atualizarSaldo()
      atualizarResumo()
      modal.remove()
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
        saldoInicialInput.value = ''
        atualizarSaldo()
        atualizarResumo()
        modal.remove()
      })
    } else {
      alert('O saldo deve ser maior que 0.')
    }
  }

  const adicionarGasto = (): void => {
    const descricao = novoGastoInput.value.trim()
    const valor = parseFloat(valorGastoInput.value) || 0
    if (descricao && valor > 0) {
      if (saldo >= valor) {
        gastos.push({ descricao, valor })
        saldo -= valor
        novoGastoInput.value = ''
        valorGastoInput.value = ''
        renderizarGastos()
        atualizarSaldo()
        atualizarResumo()
      } else {
        alertaSaldoEl.textContent = 'Saldo insuficiente!'
        alertaSaldoEl.classList.remove('hidden')
      }
    }
  }

  ;(window as any).removerGasto = (index: number): void => {
    const modal = abrirModal(`
      <h3>Confirmar Exclusão</h3>
      <p>Tem certeza que deseja excluir o gasto "<span class="font-bold">${gastos[index].descricao}</span>"?</p>
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
          <label for="descricao-editar" class="block text-left font-medium">Descrição:</label>
          <input type="text" id="descricao-editar" value="${gastos[index].descricao}" class="w-full p-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label for="valor-editar" class="block text-left font-medium">Valor:</label>
          <input type="number" id="valor-editar" value="${gastos[index].valor}" class="w-full p-2 border border-gray-300 rounded" />
        </div>
        <button id="confirmar-edicao" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Salvar</button>
      </div>
    `)

    modal.querySelector('#confirmar-edicao')?.addEventListener('click', () => {
      const novaDescricao = (
        modal.querySelector('#descricao-editar') as HTMLInputElement
      ).value.trim()
      const novoValor = parseFloat(
        (modal.querySelector('#valor-editar') as HTMLInputElement).value
      )

      if (novaDescricao && novoValor > 0) {
        const diferenca = novoValor - gastos[index].valor
        if (saldo >= diferenca) {
          saldo -= diferenca
          gastos[index] = { descricao: novaDescricao, valor: novoValor }
          renderizarGastos()
          atualizarSaldo()
          atualizarResumo()
          modal.remove()
        } else {
          alert('O valor editado não pode deixar o saldo negativo.')
        }
      } else {
        alert('Preencha os campos corretamente.')
      }
    })
  }

  // Inicialização
  anoAtualEl.textContent = new Date().getFullYear().toString()
  resetBtn.addEventListener('click', resetarTudo)
  definirSaldoBtn.addEventListener('click', definirSaldo)
  adicionarGastoBtn.addEventListener('click', adicionarGasto)

  atualizarSaldo()
  renderizarGastos()
  atualizarResumo()
})
