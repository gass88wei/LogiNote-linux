# Linux 构建说明（LogiNote Pro）

本仓库是 [GlimmerElve/LogiNote-Chinese-version-](https://github.com/GlimmerElve/LogiNote-Chinese-version-) 的 Linux 移植分支。
上游只发布 Windows 安装包，本仓库通过 GitHub Actions 在云端构建 AppImage 与 deb，
本地不需要安装任何 Node / Electron / Python 依赖。

## 直接使用（推荐）

从 [Releases](https://github.com/gass88wei/LogiNote-linux/releases) 下载：

| 文件 | 说明 |
|---|---|
| `LogiNote-<version>-x86_64.AppImage` | 免安装，`chmod +x` 后直接运行 |
| `LogiNote-<version>-amd64.deb` | Debian 系安装，可被 apt 管理 |
| `SHA256SUMS.txt` | 校验用 |

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing

# AppImage
chmod +x LogiNote-*.AppImage && ./LogiNote-*.AppImage

# deb
sudo apt install ./LogiNote-*.deb
```

若 AppImage 提示缺少 FUSE：
```bash
./LogiNote-*.AppImage --appimage-extract-and-run
```

## 数据位置

| 路径 | 内容 |
|---|---|
| `~/.config/LogiNote/vault/` | 笔记正文，Markdown 明文，可直接被其他工具读取 |
| `~/.config/LogiNote/vault/metadata.json` | 结构化元数据（标题、双链、标签等） |
| `~/.config/LogiNote/user-state/` | 复习记忆、掌握度、能力画像（与可分享的笔记内容分离） |
| `~/.config/LogiNote/documents/` | 上传的 PDF / Markdown / TXT 原件 |
| `~/.config/LogiNote/rag-index/` | 向量索引缓存（可删，会重建） |
| `~/.logi-note/storage-config.json` | 自定义数据根目录的锚点（可选） |

想换数据目录，不必改代码：
```bash
mkdir -p ~/.logi-note
echo '{"dataRoot":"/home/QQQ/Documents/LogiNote"}' > ~/.logi-note/storage-config.json
```
必须在启动前写好，改完重启生效。

## AI 配置

设置 → LLM 服务商，默认是 DeepSeek（`https://api.deepseek.com`，模型 `deepseek-chat`）。
也支持任意 OpenAI 兼容接口、Anthropic Claude、Google Gemini、本地 Ollama。

请求由 Electron 主进程发出（`src/electron/apiHandlers.ts`），不受浏览器 CORS 限制。

## 语音模块（占位符）

**本构建不启用语音识别**，理由：上游 `stt_server` 只有 Windows 打包分支
（`main.ts` 里 `spawn(resourcesPath/stt_server/stt_server.exe)`），Linux 上必然 ENOENT。

表现为：语音按钮显示「语音未启用」且不可点击。请使用系统自带语音输入。

要启用，需要：

1. `src/services/featureFlags.ts` 与 `src/electron/main.ts` 里的 `STT_ENABLED` 都改 `true`
2. `src/electron/main.ts` 的 `spawnSttServer` 里，打包态分支换成非 `.exe` 路径
3. 装 Python 依赖：
   ```bash
   sudo apt install python3-dev libasound2-dev portaudio19-dev
   python3 -m pip install -r python/requirements.txt
   ```
4. 下 SenseVoice 模型到 `models/sherpa-onnx-sense-voice/`：
   ```bash
   curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2
   tar xjf sherpa-onnx-sense-voice-*.tar.bz2
   mkdir -p models/sherpa-onnx-sense-voice
   # 注意：包内文件名是 model.int8.onnx，代码找的是 model_q8.onnx
   mv sherpa-onnx-sense-voice-*/*.onnx models/sherpa-onnx-sense-voice/model_q8.onnx
   mv sherpa-onnx-sense-voice-*/tokens.txt models/sherpa-onnx-sense-voice/tokens.txt
   ```
5. `electron-builder.yml` 的 `extraResources` 补齐 `python/` 与语音模型目录

## 本地构建（可选）

仅在你需要改代码验证时用；日常请依赖 CI。

```bash
git clone https://github.com/gass88wei/LogiNote-linux.git
cd LogiNote-linux
git checkout linux-port

npm ci
# 补嵌入模型（占用约 143MB，不进 git）
M=models/Xenova/paraphrase-multilingual-MiniLM-L12-v2
B=https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main
mkdir -p "$M/onnx"
for f in config.json tokenizer.json tokenizer_config.json unigram.json; do
  curl -fL -o "$M/$f" "$B/$f"
done
curl -fL -o "$M/onnx/model_quantized.onnx" "$B/onnx/model_quantized.onnx"

npm run build && npm run build:electron
npx electron-builder --linux AppImage deb --publish never
```

产物在 `release/`。

## 分支与回滚

```
main             上游镜像，只做 git pull --ff-only upstream main，永不写自己的提交
linux-port       本仓库全部改动
v1.1.0-base      tag：纯上游锚点，未做任何修改
v1.1.0-linux.1   tag：触发 CI 出包
```

```bash
# 回到纯上游状态
git reset --hard v1.1.0-base

# 只回退某一项改动
git revert <commit>

# 同步上游更新
git checkout main && git pull --ff-only upstream main && git push origin main
git checkout linux-port && git rebase main
```

改动清单（按 commit 顺序）：

| commit | 内容 |
|---|---|
| `fix(build)` | Linux target、删不存在的 `stt_dist` extraResources、`asarUnpack` onnxruntime、包名版本号统一 |
| `feat(stt)` | 语音占位开关 `STT_ENABLED=false`（6 个文件） |
| `build(ci)` | GitHub Actions 打包工作流 |
| `docs` | 本文件 |

## 已知限制

| 项 | 说明 |
|---|---|
| 无自定义图标 | 仓库不含 `build/` 图标资源，使用 Electron 默认图标 |
| 「检查更新」不可用 | 本仓库不产出 `latest-linux.yml`，点击会报错，属预期 |
| 语音未启用 | 见上文占位符说明 |
| PDF 抽取 | 打包态 `python/` 未随包分发（上游 Windows 包同样如此），走 `unpdf`/pdf.js 回退。中文 PDF 偶有缺字 |
| 仅 x64 | 工作流未构建 arm64 |
