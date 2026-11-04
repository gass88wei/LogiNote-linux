/**
 * 编译期功能开关。
 *
 * STT_ENABLED —— 语音复盘/语音输入（SenseVoice + sherpa-onnx + PyAudio）
 *
 * Linux 构建默认关闭：上游 stt_server 只有 Windows 打包分支（main.ts 里 spawn
 * resourcesPath/stt_server/stt_server.exe），Linux 上必然 ENOENT。与其让它静默失败、
 * 按钮点了没反应，不如显式关掉并在 UI 上给出说明。
 *
 * 想启用需要三件事：
 *   1. 把这里改成 true
 *   2. 装 Python 依赖：sherpa-onnx pyaudio websockets numpy（pyaudio 需 libasound2-dev）
 *   3. 放模型到 models/sherpa-onnx-sense-voice/{model_q8.onnx,tokens.txt}
 *      （官方下载包内文件名是 model.int8.onnx，需重命名为 model_q8.onnx）
 *   4. main.ts 里 STT_ENABLED 同步改为 true、spawnSttServer 换掉 .exe 分支
 */
export const STT_ENABLED = false;

/** 关闭时的用户可见说明 */
export const STT_DISABLED_HINT = '本构建未启用语音识别（Linux 移植版占位），请使用系统自带语音输入';
