# Contributing / 贡献指南

感谢参与 Parqview。

## 开发流程

1. Fork 仓库并创建功能分支。
2. 安装依赖：`npm install`。
3. 修改前运行 `npm run tauri:dev`。
4. 提交前运行 `npm run lint` 和 `npm test`。
5. Pull Request 请说明目的、主要改动和验证方式。

请勿提交真实或敏感的 Parquet 数据。测试文件应使用生成数据并保持体积较小。

---

Thank you for contributing to Parqview.

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Use `npm run tauri:dev` during development.
4. Run `npm run lint` and `npm test` before submitting.
5. Explain the purpose, main changes, and validation in the pull request.

Do not commit real or sensitive Parquet data. Test fixtures should use generated
data and remain small.
