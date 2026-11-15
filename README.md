# DSH 独立插件集

一组面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的独立插件，覆盖会话展示、工作区引用、消息路由和 QQ 连接。每个插件都保留独立目录、清单和配置，可按实际需要组合使用。

**QQ 桥接派生自 https://github.com/Yuuyuko-uu/dsh-qq-link，原作者 Yuuyuko-uu。** 本项目在其基础上调整了消息路由、待发箱、实时插话、多模态收发和设置界面；QQ 桥接继续使用 [Yuuyuko-uu 插件许可 1.2](packages/dsh-qq-bridge/LICENSE)。

## 插件目录

| 插件 | 功能 |
| --- | --- |
| [QQ 桥接](packages/dsh-qq-bridge/) | 通过 OneBot 连接 QQ，支持消息、图片、语音、引用和群聊操作；大肥鱼可主动管理待发消息。 |
| [消息路由](packages/dsh-super-agent-io/) | 在 DSH 会话与外部渠道之间传递输入、输出和回执。 |
| [插话合并](packages/dsh-steer-merge/) | 将短时间内到达的多次插话合并提交，保留顺序和来源。 |
| [气泡会话](packages/dsh-bubble-conversation/) | 在原生会话上展示消息身份、头像和模型信息。 |
| [工作区引用](packages/dsh-workspace-reference/) | 通过可读名称和稳定 ID 引用工作区、会话及文件。 |
| [会话与资源选择器](packages/dsh-resource-picker/) | 在 DSH 内选择工作区、会话和资源，供其他插件调用。 |
| [会话音频](packages/dsh-conversation-audio/) | 在会话内播放音频附件，并提供语音相关扩展。 |
| [远程连接](packages/dsh-remote/) | 为 DSH 主机、远程工作区和会话提供连接。 |
| [基础扩展](packages/dsh-independent-foundations/) | 提供匹配 DSH 版本的底层会话展示与工作区路径扩展。 |

## 运行和安装

这些插件以 DSH `0.2.2-rc.1` 为开发和验证基准；底层扩展与 DSH 内部接口紧密相关。Node.js 建议使用 24.9 或更新的兼容版本。各包的运行依赖和构建命令见各自的 `package.json` 与 README。

1. 克隆仓库：`git clone https://github.com/jensentsts/dsh-independent-plugins.git`。
2. 使用基础扩展前，在它的目录运行 `node prepare.mjs`，为本机位置生成搜索组件路径。
3. QQ 桥接先在 `packages/dsh-qq-bridge` 执行 `node build.mjs`，生成 `dist`。
4. 在 DSH 创造模式中通过官方插件管理器安装所需本地包；QQ 桥接选择其 `dist` 目录。QQ 桥接需要消息路由插件，会话选择器为可选集成。
5. 重启 DSH 后，在 QQ 桥接设置里配置 OneBot 地址和聊天绑定。

插件仍处于持续开发阶段。仓库中的构建文件针对上述基准版本，功能和兼容性会随 DSH 版本变化；具体依赖、已实现能力和验证信息以各插件目录为准。

## 底座源码与构建

`patches/dsh-0.2.2-rc.1.patch` 包含针对 DSH 基准提交 `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db` 的源码修改与新增文件，`tools/` 保留相关的源码加载和构建脚本。要查看或继续开发底座修改，可将该版本的官方源码检出到 `upstream/dsh-0.2.2-rc.1`，然后在该目录运行：

```sh
git checkout 66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db
git apply ../../patches/dsh-0.2.2-rc.1.patch
```

底座构建需要该 DSH 版本对应的 Node.js、pnpm 和依赖。预构建的基础扩展文件与源码补丁一并保留，便于阅读和继续移植。

## 许可与致谢

原创插件和仓库级文档使用 [MIT License](LICENSE)，各目录中的许可声明继续有效。基础扩展包含 DeepSeek Harness 的 MIT 许可代码；远程连接插件保留原作者 jensentsts 的 MIT 许可。QQ 桥接依照其上游 [Yuuyuko-uu 插件许可 1.2](packages/dsh-qq-bridge/LICENSE) 发布，保留原作者署名和许可证全文。头像素材的制作记录见 [气泡会话素材说明](packages/dsh-bubble-conversation/ARTWORK.md)。
