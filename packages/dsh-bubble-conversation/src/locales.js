/** Plugin-owned dictionaries; product copy follows the global locale service. */
import ja from './locales/ja.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import ru from './locales/ru.js';
import pt from './locales/pt.js';
const en = {
  'nav': 'Conversation members', 'title': 'Conversation members',
  'description': 'Add names, avatars and role labels while preserving the native transcript.',
  'enabled': 'Bubble conversation', 'showTags': 'Show role labels', 'showNames': 'Show member names', 'showAvatars': 'Show avatars',
  'avatarPlacement': 'Avatar placement', 'placement.auto': 'Automatic: use available outer margin', 'placement.header': 'Header',
  'placement.supported': 'Native avatar placement is available. Narrow views keep avatars in the header without reducing body width.',
  'placement.unsupported': 'Native automatic avatar placement is unavailable. Avatars remain in the header.',
  'members': 'Member overrides', 'add': 'Add member', 'remove': 'Remove', 'name': 'Display name', 'matchType': 'Match by', 'matchValue': 'Exact value',
  'match.role': 'Role', 'match.family': 'Model family', 'match.model': 'Provider/model', 'match.tool': 'Tool name', 'match.source': 'Source kind',
  'avatar.choose': 'Choose avatar', 'avatar.reset': 'Use default artwork', 'avatar.alt': '{name} avatar',
  'avatar.notice': 'Eight AI-generated adult whale-girl portraits distinguish the model families. These are independent artwork, not official vendor images. Generic roles retain geometric fallback avatars.',
  'save': 'Save', 'saving': 'Saving…', 'saved': 'Saved', 'save.failed': 'The host did not accept this change.',
  'error.file': 'Choose a PNG, JPEG, WebP or GIF image, at most 256 KiB.', 'error.config': 'The saved member settings are invalid. Reset the invalid values before enabling bubbles.',
  'status.supported': 'Native message chrome v1 is available.',
  'status.unsupported': 'Unsupported: native message chrome v1 is not available. Native messages remain unchanged.',
  'status.disabled': 'Bubble conversation is disabled. Native messages remain unchanged.',
  'status.settings': 'Settings are unavailable or still loading.',
  'questions': 'Question transcript', 'questions.aggregate': 'Native aggregated box', 'questions.individual': 'Individual question boxes',
  'questions.notice': 'Choose one native box for the batch or one per question. Questions and answers stay boxed; approvals, draft answers and skipped answers keep native behavior.',
  'questions.supported': 'Native question presentation v1 is available.',
  'questions.unsupported': 'Unsupported: native question presentation v1 is unavailable. Questions remain in native aggregated boxes.',
  'questions.disabled': 'Bubble conversation is disabled. Its question-layout preference is not applied.',
  'questions.failed': 'The question-layout preference could not be applied. Native question behavior is preserved.',
  'effort.explicit': 'Recorded reasoning effort: {effort}', 'effort.default': 'Adapter default reasoning effort', 'effort.unrecorded': 'Reasoning effort was not recorded', 'effort.mismatch': 'The actual route differs from its request header; effort is unknown',
  'role.user': 'You', 'role.reply': 'Assistant', 'role.thinking': 'Assistant', 'role.read': 'Reader', 'role.edit': 'Editor', 'role.search': 'Researcher',
  'role.command': 'Terminal', 'role.tool': 'Tools', 'role.task': 'Planner', 'role.subagent': 'Teammate', 'role.plugin': 'Plugin', 'role.trigger': 'Notifier',
  'role.question': 'You', 'role.remote': 'Remote member', 'role.unknown': 'Member',
  'tag.user': 'Input', 'tag.reply': 'Reply', 'tag.thinking': 'Thinking', 'tag.read': 'Read', 'tag.edit': 'Edit', 'tag.search': 'Search',
  'tag.command': 'Command', 'tag.tool': 'Tool', 'tag.task': 'Task', 'tag.subagent': 'Subagent', 'tag.plugin': 'Plugin', 'tag.trigger': 'Trigger',
  'tag.question': 'Questions & answers', 'tag.remote': 'External input', 'tag.steer': 'Steer', 'tag.qqInput': 'QQ input', 'tag.unknown': 'Message',
};
const zh = {
  'nav': '会话成员', 'title': '会话成员', 'description': '添加群友名称、头像与角色标签，保留全部原生正文和操作。',
  'enabled': '气泡会话', 'showTags': '显示角色标签', 'showNames': '显示成员名称', 'showAvatars': '显示头像',
  'avatarPlacement': '头像位置', 'placement.auto': '自动：使用正文外侧可用留白', 'placement.header': '头部',
  'placement.supported': '原生自动头像布局已就绪；窄视图回到头部，不压缩正文宽度。',
  'placement.unsupported': '底座尚未提供自动头像布局；头像保留在头部。',
  'members': '成员自定义', 'add': '添加成员', 'remove': '移除', 'name': '显示名称', 'matchType': '匹配类型', 'matchValue': '精确匹配值',
  'match.role': '角色', 'match.family': '模型系列', 'match.model': '提供商/模型', 'match.tool': '工具名称', 'match.source': '来源类型',
  'avatar.choose': '选择头像', 'avatar.reset': '使用默认美术头像', 'avatar.alt': '{name}的头像',
  'avatar.notice': '八个模型系列使用 AI 生成的成年鲸鱼娘原创头像，非厂商官方形象；通用角色保留几何图形作为后备头像。',
  'save': '保存', 'saving': '保存中…', 'saved': '已保存', 'save.failed': '底座未接受此项修改。',
  'error.file': '请选择不超过 256 KiB 的 PNG、JPEG、WebP 或 GIF 图片。', 'error.config': '已保存的成员设置无效，请修正后再启用气泡。',
  'status.supported': '原生消息外观扩展点 v1 已就绪。', 'status.unsupported': '暂不支持：缺少原生消息外观扩展点 v1。原生消息保持不变。',
  'status.disabled': '气泡会话已关闭，原生消息保持不变。', 'status.settings': '设置暂不可用或仍在加载。',
  'questions': '问答呈现', 'questions.aggregate': '原生聚合方框', 'questions.individual': '逐题方框',
  'questions.notice': '可将整批问答放在一个原生方框内，或按题分别展示。问题与回答始终带框，审批、回答草稿和跳过行为保持原生语义。',
  'questions.supported': '原生问答呈现扩展点 v1 已就绪。',
  'questions.unsupported': '暂不支持：缺少原生问答呈现扩展点 v1。问答保持原生聚合方框。',
  'questions.disabled': '气泡会话已关闭，本插件的问答布局偏好不生效。',
  'questions.failed': '无法应用问答布局偏好，原生问答行为保持不变。',
  'effort.explicit': '记录的推理等级：{effort}', 'effort.default': '适配器默认推理等级', 'effort.unrecorded': '未记录推理等级', 'effort.mismatch': '实际模型路由与请求头不同，推理等级未知',
  'role.user': '你', 'role.reply': '助手', 'role.thinking': '助手', 'role.read': '阅读员', 'role.edit': '编辑员', 'role.search': '研究员',
  'role.command': '终端', 'role.tool': '工具', 'role.task': '规划员', 'role.subagent': '群友', 'role.plugin': '插件', 'role.trigger': '通知员',
  'role.question': '你', 'role.remote': '外部群友', 'role.unknown': '成员',
  'tag.user': '输入', 'tag.reply': '回复', 'tag.thinking': '思考', 'tag.read': '读取', 'tag.edit': '编辑', 'tag.search': '搜索',
  'tag.command': '命令', 'tag.tool': '工具', 'tag.task': '任务', 'tag.subagent': '子智能体', 'tag.plugin': '插件', 'tag.trigger': '触发',
  'tag.question': '问题与回答', 'tag.remote': '外部输入', 'tag.steer': '插话', 'tag.qqInput': 'QQ 输入', 'tag.unknown': '消息',
};
export const dictionaries = Object.freeze({ en, zh, ja, es, fr, de, ru, pt });
export const LOCALE_NAMESPACE = 'dsh-bubble-conversation';
