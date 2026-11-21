const list = document.querySelector('#plugin-list')
const search = document.querySelector('#search')
const count = document.querySelector('#count')
const empty = document.querySelector('#empty')
let catalog = [], filter = 'all'
const labels = { integration: '连接', message: '消息', interface: '会话界面', workspace: '工作区', foundation: '基础' }
const installUrl = plugin => `https://github.com/jensentsts/${plugin.repo}/archive/refs/heads/main.tar.gz`

async function copyAddress(button, address) {
  try {
    await navigator.clipboard.writeText(address)
    const original = button.textContent
    button.textContent = '已复制'
    setTimeout(() => { button.textContent = original }, 2200)
  } catch {
    window.prompt('复制这个安装地址，再粘贴到 DSH：', address)
  }
}

function render() {
  const term = search.value.trim().toLowerCase()
  const found = catalog.filter(p => (filter === 'all' || p.category === filter) && (!term || [p.title.zh, p.title.en, p.name, p.description.zh, ...p.keywords].join(' ').toLowerCase().includes(term)))
  list.replaceChildren()
  for (const p of found) {
    const card = document.createElement('article'); card.className = 'plugin-card'
    const icon = document.createElement('img'); icon.src = `icons/${p.repo}.svg`; icon.alt = ''
    const body = document.createElement('div')
    const top = document.createElement('div'); top.className = 'plugin-title'
    const title = document.createElement('h3'); title.textContent = p.title.zh
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = labels[p.category]
    top.append(title, tag)
    const desc = document.createElement('p'); desc.textContent = p.description.zh
    const meta = document.createElement('div'); meta.className = 'plugin-meta'
    meta.textContent = `${p.name} · v${p.version} · ${p.repo === 'dsh-qq-bridge' ? '上游许可 1.2' : 'MIT'}`
    body.append(top, desc, meta)
    if (p.repo === 'dsh-independent-foundations') {
      const note = document.createElement('p'); note.className = 'compatibility-note'
      note.textContent = `适用 DSH ${p.dsh}；其他版本请查看仓库说明。`
      body.append(note)
    }
    const actions = document.createElement('div'); actions.className = 'plugin-actions'
    const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'plugin-copy'
    copy.textContent = '复制安装地址'; copy.setAttribute('aria-label', `复制${p.title.zh}安装地址`)
    copy.addEventListener('click', () => copyAddress(copy, installUrl(p)))
    const link = document.createElement('a'); link.className = 'plugin-link'; link.href = `https://github.com/jensentsts/${p.repo}`; link.textContent = '查看仓库 ↗'
    actions.append(copy, link); card.append(icon, body, actions); list.append(card)
  }
  count.textContent = `显示 ${found.length} 个插件`
  empty.hidden = found.length !== 0
}
search.addEventListener('input', render)
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button))
  render()
}))
document.querySelector('#copy').addEventListener('click', event => copyAddress(event.target, document.querySelector('#index-url').textContent))
fetch('./catalog.json').then(r => { if (!r.ok) throw Error('catalog'); return r.json() }).then(data => { catalog = data; render() }).catch(() => {
  count.textContent = '目录暂时无法加载'; empty.hidden = false; empty.textContent = '目录暂时无法加载，请从 GitHub 仓库查看插件。'
})
