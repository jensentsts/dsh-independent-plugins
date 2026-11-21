# DSH 独立插件集

给大肥鱼的插件导航：连接 QQ、会话、工作区和远程主机。每个插件均有独立仓库，可按需要组合。

**[打开插件导航与安装向导](https://jensentsts.github.io/dsh-independent-plugins/)** · **[查看市场索引](https://jensentsts.github.io/dsh-independent-plugins/market.json)**

## 从这里选择插件

| 插件 | 主要用途 | 仓库 |
| --- | --- | --- |
| QQ 桥接 | OneBot 私聊与群聊、消息与媒体、待发箱、群聊工具 | [dsh-qq-bridge](https://github.com/jensentsts/dsh-qq-bridge) |
| 消息路由 | 连接 DSH 会话与外部输入、输出渠道 | [dsh-message-router](https://github.com/jensentsts/dsh-message-router) |
| 插话合并 | 合并短时间内到达的多次插话 | [dsh-steer-merge](https://github.com/jensentsts/dsh-steer-merge) |
| 气泡会话 | 头像、身份、模型信息和气泡式会话 | [dsh-bubble-conversation](https://github.com/jensentsts/dsh-bubble-conversation) |
| 会话与资源选择器 | 选择工作区、会话、文件并预览会话 | [dsh-resource-picker](https://github.com/jensentsts/dsh-resource-picker) |
| 工作区引用 | 引用工作区、会话和文件，区分重名 | [dsh-workspace-reference](https://github.com/jensentsts/dsh-workspace-reference) |
| 远程连接 | 连接远端主机、工作区、会话和工具 | [dsh-remote-plugin](https://github.com/jensentsts/dsh-remote-plugin) |
| 会话音频 | 播放会话音频附件及语音扩展 | [dsh-conversation-audio](https://github.com/jensentsts/dsh-conversation-audio) |
| 基础扩展 | 指定 DSH 版本的会话和工作区基础扩展 | [dsh-independent-foundations](https://github.com/jensentsts/dsh-independent-foundations) |

消息路由插件的历史包名为 `dsh-super-agent-io`；仓库使用更直观的 `dsh-message-router` 名称。

## 直接从 GitHub 安装

打开[插件导航页](https://jensentsts.github.io/dsh-independent-plugins/)，在所需插件卡片上点击「复制安装地址」，然后在 DSH 的「插件 → 安装第三方插件」中粘贴并安装。每个独立仓库的 README 也提供对应地址。该方式使用 GitHub 提供的安装包，适合只安装了 DSH 的电脑。

QQ 桥接需要先安装消息路由；工作区引用的完整路径功能需要与 DSH 版本匹配的基础扩展。基础扩展的兼容版本请以该仓库的说明为准。

## 在 DSH 市场中查找

1. 在 DSH「插件 → 实验性插件」中启用自定义插件市场。
2. 进入「发现」，添加索引源：

   ```text
   https://jensentsts.github.io/dsh-independent-plugins/market.json
   ```

3. 搜索插件名称并安装。QQ 桥接需要消息路由；会话与资源选择器可按需安装。基础扩展使用前请阅读其仓库中的版本和准备步骤。

[插件导航页](https://jensentsts.github.io/dsh-independent-plugins/)也提供搜索、分类和安装路线。插件以 DSH `0.2.2-rc.1` 为主要开发基准；各仓库的版本说明提供具体兼容范围。

## 来源与许可

QQ 桥接是 [Yuuyuko-uu/dsh-qq-link](https://github.com/Yuuyuko-uu/dsh-qq-link) 的 GitHub Fork，原作者 Yuuyuko-uu，衍生版本继续使用其 [插件许可 1.2](https://github.com/jensentsts/dsh-qq-bridge/blob/main/LICENSE)。其余原创插件采用 MIT；基础扩展保留 DeepSeek 的 MIT 版权声明，远程插件保留 jensentsts 的 MIT 版权声明。

本仓库同时保留整理后的源码快照、底座补丁和构建工具；各独立仓库是插件的单独发布入口。`market.json` 的版本来源固定到对应提交，更新目录后可运行 `node scripts/build-market.mjs` 重新生成索引。
